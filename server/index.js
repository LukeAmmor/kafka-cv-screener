require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const { Kafka } = require('kafkajs');
const { prisma } = require('./db');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ─── UPLOAD DIRECTORY ───────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'cv_uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log(`📁 Created uploads directory: ${UPLOADS_DIR}`);
}

// ─── KAFKA SETUP ────────────────────────────────────────
const kafka = new Kafka({
    clientId: 'resumind-web',
    brokers: [process.env.KAFKA_BROKER || '192.168.11.107:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'resumind-web-results' });

const pendingResults = new Map();
const RESULT_TIMEOUT_MS = 30000;

(async () => {
    await producer.connect();
    console.log('✅ Producer connected to Kafka');

    await consumer.connect();
    await consumer.subscribe({ topic: 'scored-candidates', fromBeginning: false });
    console.log('✅ Consumer subscribed to scored-candidates');

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                const result = JSON.parse(message.value.toString());
                const id = result.submission_id;
                if (id && pendingResults.has(id)) {
                    console.log(`📥 Got result for submission ${id}`);
                    const resolve = pendingResults.get(id);
                    pendingResults.delete(id);
                    resolve(result);
                }
            } catch (err) {
                console.error('Error parsing scored-candidates message:', err.message);
            }
        }
    });
})();

function waitForResult(submissionId) {
    return new Promise((resolve, reject) => {
        pendingResults.set(submissionId, resolve);
        setTimeout(() => {
            if (pendingResults.has(submissionId)) {
                pendingResults.delete(submissionId);
                reject(new Error('Timed out waiting for ML result (30s)'));
            }
        }, RESULT_TIMEOUT_MS);
    });
}

async function ocrPdfWithMistral(pdfBuffer) {
    const base64Data = pdfBuffer.toString('base64');
    const response = await axios.post(
        'https://api.mistral.ai/v1/ocr',
        {
            model: 'mistral-ocr-latest',
            document: {
                type: 'document_url',
                document_url: `data:application/pdf;base64,${base64Data}`
            }
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data.pages.map(p => p.markdown).join('\n\n');
}

async function extractFieldsWithMistral(pdfText) {
    const response = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
            model: 'mistral-small-latest',
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'user',
                    content: `Extract the following fields from this CV text and return ONLY a valid JSON object:
{
  "name": "candidate full name as string",
  "email": "candidate email as string",
  "skills": "comma separated list of skills as string",
  "education": "highest degree and institution as string",
  "years_of_experience": 0
}

If a field cannot be found, use an empty string "" for strings or 0 for years_of_experience. Never return an empty object.

CV TEXT:
${pdfText}`
                }
            ]
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    const raw = response.data.choices[0].message.content;
    console.log('Mistral raw response:', raw);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
}

// ─── JD-AWARE UPLOAD ROUTE ──────────────────────────────
console.log('🟢 REGISTERING /upload/:jdId route');
app.post('/upload/:jdId', upload.single('resume'), async (req, res) => {
    console.log('🟢 HANDLER FIRED for /upload/' + req.params.jdId);
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const jdId = parseInt(req.params.jdId, 10);
        if (isNaN(jdId)) {
            return res.status(400).json({ success: false, error: 'Invalid JD id' });
        }

        const jd = await prisma.jobDescription.findUnique({ where: { id: jdId } });
        if (!jd) {
            return res.status(404).json({ success: false, error: 'Job description not found' });
        }
        console.log(`📋 Upload for JD #${jdId}: "${jd.title}"`);

        console.log('📄 Step 1: Extracting text from PDF...');
        const parser = new PDFParse({ data: req.file.buffer });
        const pdfData = await parser.getText();
        let pdfText = pdfData.text;

        if (pdfText.trim().length < 100) {
            console.log('⚠️  PDF appears image-based, falling back to Mistral OCR...');
            pdfText = await ocrPdfWithMistral(req.file.buffer);
        }

        console.log('🤖 Step 2: Extracting fields with Mistral...');
        const candidate = await extractFieldsWithMistral(pdfText);

        const submissionId = crypto.randomUUID();
        console.log(`📤 Step 3: Publishing to Kafka with JD context (submission_id: ${submissionId})...`);

        const resultPromise = waitForResult(submissionId);

        await producer.send({
            topic: 'cv-submissions',
            messages: [{
                value: JSON.stringify({
                    ...candidate,
                    submission_id: submissionId,
                    submitted_at: new Date().toISOString(),
                    source: 'web-portal',
                    jd_id: jd.id,
                    jd_title: jd.title,
                    jd_text: jd.jdText,
                    required_skills: jd.requiredSkills || ''
                })
            }]
        });
        console.log('✅ Published to Kafka with JD context');

        console.log('⏳ Step 4: Waiting for ML result from Kafka...');
        const result = await resultPromise;
console.log(`✅ Result received: ${result.decision} (${result.confidence})`);

if (result.decision === 'error') {
    return res.status(500).json({
        success: false,
        error: result.error || 'Processing failed in consumer'
    });
}

// Save the PDF to disk, named by the new candidate's DB id
if (result.candidate_id) {
    try {
        const safeName = (result.name || 'candidate')
            .replace(/[^a-z0-9]/gi, '_')
            .slice(0, 40);
        const filename = `${result.candidate_id}_${safeName}.pdf`;
        const filepath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(filepath, req.file.buffer);

        // Update the candidate row with the filename
        await prisma.candidate.update({
            where: { id: result.candidate_id },
            data: { cvFilename: filename }
        });
        console.log(`💾 Saved PDF: ${filename}`);
    } catch (saveErr) {
        // Non-fatal: candidate is already created, the PDF just won't be downloadable
        console.error('⚠️  Failed to save PDF to disk:', saveErr.message);
    }
}

        res.json({
            success: true,
            candidate_id: result.candidate_id,
            jd_id: jd.id,
            candidate: {
                name: result.name,
                email: result.email,
                skills: result.skills,
                education: result.education,
                years_of_experience: result.years_of_experience
            },
            decision: result.decision,
            confidence: result.confidence,
            questions: result.questions || []
        });

    } catch (error) {
        console.error('JD-aware pipeline error:', error.message);
        if (error.response) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── JD MANAGEMENT ──────────────────────────────────────

app.post('/api/jds', async (req, res) => {
    try {
        const { title, jdText, requiredSkills } = req.body;
        if (!title || !jdText) {
            return res.status(400).json({ error: 'title and jdText are required' });
        }
        const jd = await prisma.jobDescription.create({
            data: { title, jdText, requiredSkills: requiredSkills || null }
        });
        res.json(jd);
    } catch (err) {
        console.error('POST /api/jds error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/jds/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { title, jdText, requiredSkills } = req.body;
        if (!title || !jdText) {
            return res.status(400).json({ error: 'title and jdText are required' });
        }
        const jd = await prisma.jobDescription.update({
            where: { id },
            data: { title, jdText, requiredSkills: requiredSkills || null }
        });
        res.json(jd);
    } catch (err) {
        console.error('PUT /api/jds/:id error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'JD not found' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/jds', async (req, res) => {
    try {
        const jds = await prisma.jobDescription.findMany({
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { candidates: true } } }
        });
        res.json(jds);
    } catch (err) {
        console.error('GET /api/jds error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/jds/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const jd = await prisma.jobDescription.findUnique({
            where: { id },
            include: { candidates: { orderBy: { createdAt: 'desc' } } }
        });
        if (!jd) return res.status(404).json({ error: 'JD not found' });
        res.json(jd);
    } catch (err) {
        console.error('GET /api/jds/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/jds/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await prisma.jobDescription.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/jds/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get one candidate with its parent JD
app.get('/api/candidates/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const candidate = await prisma.candidate.findUnique({
            where: { id },
            include: { jobDescription: true }
        });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        res.json(candidate);
    } catch (err) {
        console.error('GET /api/candidates/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete one candidate
app.delete('/api/candidates/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid candidate id' });

        // Get the filename before deleting the row
        const candidate = await prisma.candidate.findUnique({ where: { id } });
        await prisma.candidate.delete({ where: { id } });

        // Clean up the PDF file if it exists
        if (candidate?.cvFilename) {
            const filepath = path.join(UPLOADS_DIR, candidate.cvFilename);
            if (fs.existsSync(filepath)) {
                try { fs.unlinkSync(filepath); } catch (_) { /* ignore */ }
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/candidates/:id error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Candidate not found' });
        res.status(500).json({ error: err.message });
    }
});

// Download a candidate's CV PDF
app.get('/api/candidates/:id/cv', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid candidate id' });

        const candidate = await prisma.candidate.findUnique({ where: { id } });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        if (!candidate.cvFilename) {
            return res.status(404).json({ error: 'No CV file on record for this candidate' });
        }

        const filepath = path.join(UPLOADS_DIR, candidate.cvFilename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'CV file missing from disk' });
        }

        // Suggest a friendly download name
        const downloadName = `${(candidate.name || 'candidate').replace(/[^a-z0-9_\- ]/gi, '')}.pdf`;
        res.download(filepath, downloadName);
    } catch (err) {
        console.error('GET /api/candidates/:id/cv error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GRACEFUL SHUTDOWN ──────────────────────────────────
process.on('SIGINT', async () => {
    console.log('Disconnecting Kafka...');
    await producer.disconnect();
    await consumer.disconnect();
    await prisma.$disconnect();
    process.exit(0);
});

// ─── START SERVER ───────────────────────────────────────
const PORT = 5001;
app.listen(PORT, () => {
    console.log(`✅ CV Screener backend running on http://localhost:${PORT}`);
});