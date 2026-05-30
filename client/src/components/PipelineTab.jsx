import React from 'react';

const steps = [
  {
    icon: '📋',
    title: '1. Create a Job Description',
    text: 'A recruiter opens Resumind and creates a new job description with a title and the full description. Each posting gets its own pipeline — candidates uploaded under one job description are screened only against that one, not all of them at once. Multiple postings can be active in parallel.'
  },
  {
    icon: '📄',
    title: '2. Upload a Candidate\'s Resume',
    text: 'On the job description page, the recruiter uploads a candidate\'s PDF resume. The system reads the text directly out of the PDF. If the PDF is a scan or an image (no readable text), it automatically falls back to an OCR service to read it visually.'
  },
  {
    icon: '🤖',
    title: '3. Extract the Candidate\'s Info',
    text: 'The resume text is sent to Mistral AI, which reads it and pulls out the candidate\'s name, email, skills, education, and years of experience. This turns an unstructured PDF into clean, structured data the system can work with.'
  },
  {
    icon: '📤',
    title: '4. Send to the Processing Queue',
    text: 'The candidate\'s data, along with the full job description, is pushed onto a Kafka queue. Kafka is the messaging backbone that lets the website hand off heavy work to a separate machine. The website doesn\'t wait around — it just hands off the task and listens for the answer.'
  },
  {
    icon: '⚙️',
    title: '5. Score the Resume on Its Own',
    text: 'A Python program on a separate machine picks up the message. It first runs the candidate through a Spark machine learning model trained on 600,000 resumes. This gives a general "is this a solid candidate?" score based on their skills, experience, and education.'
  },
  {
    icon: '🧠',
    title: '6. Match the Resume to the Job Description',
    text: 'Then the system compares the candidate\'s profile to the actual job description using an AI text-similarity model. This is the key step: it asks not "is this a good resume?" but "is this person a good fit for THIS specific job?" A great resume for the wrong role will score low here.'
  },
  {
    icon: '⚖️',
    title: '7. Combine the Two Scores',
    text: 'The system blends the two scores together, leaning heavily on the job-match score because that\'s what matters most to the recruiter. Based on the final score, the candidate is sorted into one of three buckets: shortlisted, under review, or not selected.'
  },
  {
    icon: '💬',
    title: '8. Generate Interview Questions',
    text: 'For candidates who made it to shortlist or review, Mistral AI generates five tailored interview questions that reference the actual job description. Candidates marked "not selected" skip this step to save on AI calls.'
  },
  {
    icon: '🐘',
    title: '9. Save Everything to the Database',
    text: 'The complete result — the candidate\'s info, both scores, the final decision, and the interview questions — is saved to a PostgreSQL database hosted on Supabase. Each candidate is linked to the job description they applied for. Deleting a job description automatically removes all its candidates.'
  },
  {
    icon: '🔁',
    title: '10. Send the Result Back to the Website',
    text: 'The Python program publishes the final result back onto a second Kafka queue. The website, which has been waiting for this exact message, matches it to the right upload and shows the recruiter the decision, the questions, and the candidate\'s details in real time.'
  }
];

const stack = [
  { name: 'React',                  role: 'The recruiter\'s web interface' },
  { name: 'Node.js + Express',      role: 'The website\'s backend' },
  { name: 'PostgreSQL (Supabase)',  role: 'Where all job descriptions and candidates are stored' },
  { name: 'Apache Kafka',           role: 'The messaging queue between the website and the worker' },
  { name: 'Apache Spark',           role: 'Runs the resume scoring model at scale' },
  { name: 'Random Forest',          role: 'The machine learning model that scores resumes' },
  { name: 'Sentence Transformers',  role: 'The AI model that matches resumes to job descriptions' },
  { name: 'Mistral AI',             role: 'Reads PDFs, extracts info, writes interview questions' },
  { name: 'Python',                 role: 'The worker that does all the scoring' }
];

const highlights = [
  {
    title: 'Smart matching, not just scoring',
    text: 'A nursing resume won\'t get shortlisted for a React developer role, no matter how impressive it is on paper.'
  },
  {
    title: 'Multiple job descriptions at once',
    text: 'Each posting runs its own screening flow. They share the same engine but stay completely separate.'
  },
  {
    title: 'No waiting around',
    text: 'The website hands off the heavy work to Kafka and the worker machine. The recruiter sees results as soon as they\'re ready.'
  },
  {
    title: 'Handles broken inputs',
    text: 'Scanned PDFs get read by OCR. Failed AI calls don\'t crash the pipeline. Errors get reported cleanly.'
  }
];

export default function PipelineTab() {
  return (
    <div style={styles.page}>
      <div style={styles.hero} className="fade-up">
        <h1 className="page-title">
          How <em>Resumind</em> Works
        </h1>
        <p style={styles.heroSub}>
          Resumind takes a candidate's PDF resume, scores it against a specific
          job description using two AI models, generates tailored interview
          questions, and shows the recruiter a decision — all in a few seconds.
          Here's the full flow, end to end.
        </p>
      </div>

      <div style={styles.archBox}>
        <div style={styles.archHeader}>System Architecture</div>
        <pre style={styles.archDiagram}>
{`  ┌──────────────────┐
  │  React Website   │  Recruiter uploads a PDF
  └────────┬─────────┘
           │
           ▼
  ┌────────────────────────┐       ┌──────────────────┐
  │  Node.js Backend       │◀─────▶│  PostgreSQL DB   │
  │  · Reads the PDF       │       │  · Job postings  │
  │  · Extracts info (AI)  │       │  · Candidates    │
  └────────┬───────────────┘       └──────────────────┘
           │                                  ▲
           ▼ (sends to queue)                 │
  ┌────────────────────────┐                  │
  │  KAFKA — incoming      │                  │
  └────────┬───────────────┘                  │
           │                                  │
           ▼                                  │
  ┌──────────────────────────────┐            │
  │  Python Worker (separate VM) │────────────┘
  │  · Scores the resume         │
  │  · Matches it to the job     │
  │  · Generates questions       │
  └────────┬─────────────────────┘
           │ (sends back result)
           ▼
  ┌────────────────────────┐
  │  KAFKA — outgoing      │──▶ Website shows the result
  └────────────────────────┘`}
        </pre>
      </div>

      <div style={styles.highlightsGrid} className="stagger-children">
        {highlights.map((h, i) => (
          <div key={i} style={styles.highlightCard}>
            <h4 style={styles.highlightTitle}>{h.title}</h4>
            <p style={styles.highlightText}>{h.text}</p>
          </div>
        ))}
      </div>

      <h2 style={styles.sectionHeading}>
        The Pipeline, <em>Step by Step</em>
      </h2>
      <div style={styles.stepsBox} className="stagger-children">
        {steps.map((s, i) => (
          <div key={i} style={styles.step}>
            <div style={styles.stepIcon}>{s.icon}</div>
            <div style={styles.stepBody}>
              <h3 style={styles.stepTitle}>{s.title}</h3>
              <p style={styles.stepText}>{s.text}</p>
            </div>
            {i < steps.length - 1 && <div style={styles.connector} />}
          </div>
        ))}
      </div>

      <div style={styles.stackSection}>
        <h2 style={styles.sectionHeading}>
          What's <em>Under the Hood</em>
        </h2>
        <div style={styles.stackGrid} className="stagger-children">
          {stack.map(s => (
            <div key={s.name} style={styles.stackItem}>
              <div style={styles.stackName}>{s.name}</div>
              <div style={styles.stackRole}>{s.role}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.footerNote}>
        Built as a Big Data course project at Université Mundiapolis.
      </div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: '840px',
    margin: '0 auto',
    padding: '20px 0 60px'
  },

  hero: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  heroSub: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    lineHeight: '1.7',
    maxWidth: '640px',
    margin: '14px auto 0'
  },

  archBox: {
    background: 'var(--navy-base)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px',
    marginBottom: '40px',
    overflow: 'auto',
    border: '1px solid var(--border-hairline)',
    boxShadow: 'var(--shadow-lg)',
    position: 'relative',
    isolation: 'isolate'
  },
  archHeader: {
    color: 'var(--red-brand)',
    fontWeight: '700',
    fontSize: '11px',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    marginBottom: '16px'
  },
  archDiagram: {
    color: 'var(--text-on-dark)',
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    margin: 0,
    whiteSpace: 'pre',
    opacity: 0.92
  },

  highlightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '14px',
    marginBottom: '48px'
  },
  highlightCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-hairline)',
    borderLeft: '3px solid var(--red-brand)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 20px',
    boxShadow: 'var(--shadow-sm), var(--edge-highlight)'
  },
  highlightTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '8px',
    fontFamily: "'Instrument Serif', Georgia, serif",
    letterSpacing: '-0.005em'
  },
  highlightText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.55',
    margin: 0
  },

  sectionHeading: {
    fontSize: '32px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: '24px',
    textAlign: 'center',
    fontFamily: "'Instrument Serif', Georgia, serif",
    letterSpacing: '-0.01em',
    lineHeight: '1.1'
  },

  stepsBox: {
    marginBottom: '52px'
  },
  step: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-md)',
    padding: '22px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '18px',
    marginBottom: '16px',
    position: 'relative',
    boxShadow: 'var(--shadow-sm), var(--edge-highlight)'
  },
  stepIcon: {
    fontSize: '26px',
    flexShrink: 0,
    width: '52px',
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--red-soft)',
    borderRadius: 'var(--radius-md)'
  },
  stepBody: {
    flex: 1
  },
  stepTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '6px',
    fontFamily: "'Instrument Serif', Georgia, serif",
    letterSpacing: '-0.005em'
  },
  stepText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.65',
    margin: 0
  },
  connector: {
    position: 'absolute',
    left: '46px',
    bottom: '-16px',
    width: '2px',
    height: '16px',
    background: 'var(--accent-red-border)',
    opacity: 0.5
  },

  stackSection: {
    marginTop: '40px',
    marginBottom: '32px'
  },
  stackGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '12px'
  },
  stackItem: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 18px',
    boxShadow: 'var(--shadow-sm), var(--edge-highlight)'
  },
  stackName: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '4px'
  },
  stackRole: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4'
  },

  footerNote: {
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid var(--border-hairline)'
  }
};