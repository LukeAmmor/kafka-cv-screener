import React, { useState, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:5001';

const scoreConfig = {
  shortlist: { var: 'green', label: '✅ Shortlisted' },
  review:    { var: 'amber', label: '⚠️ Under Review' },
  reject:    { var: 'red',   label: '❌ Not Selected' }
};

const pipelineSteps = [
  '📄 Reading your PDF...',
  '🤖 Extracting fields with Mistral AI...',
  '⚙️ Scoring with Spark ML model...',
  '🧠 Matching against the job description...',
  '💬 Generating interview questions...',
  '📊 Saving to your candidates list...'
];

export default function UploadCvModal({ jdId, jdTitle, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    setResult(null);
    setError(null);
    setLoading(true);
    setStepIdx(0);

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setStepIdx(Math.min(i, pipelineSteps.length - 1));
    }, 1500);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await axios.post(`${API}/upload/${jdId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      clearInterval(interval);
      setResult(res.data);
    } catch (err) {
      clearInterval(interval);
      const msg = err.response?.data?.error || err.message || 'Upload failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function handleClose() {
    if (result?.success) {
      onSuccess?.();
    }
    onClose();
  }

  function handleScreenAnother() {
    setResult(null);
    setError(null);
    setStepIdx(0);
    onSuccess?.();
  }

  const score = result?.decision;
  const variant = scoreConfig[score]?.var || 'amber';
  const label = scoreConfig[score]?.label || scoreConfig.review.label;

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} className="scale-in" onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Screening for</p>
            <h2 style={styles.title}>{jdTitle}</h2>
          </div>
          <button style={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <div style={styles.body}>

          {!loading && !result && !error && (
            <div
              style={{
                ...styles.uploadBox,
                ...(dragging ? styles.uploadBoxDragging : {})
              }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <div style={styles.uploadIcon}>📄</div>
              <p style={styles.uploadHint}>Drag &amp; drop a PDF here, or</p>
              <button
                style={styles.bigButton}
                className="btn-hoverable"
                onClick={() => fileRef.current.click()}
              >
                Select PDF Resume
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <p style={styles.uploadNote}>PDF files only · Max 10MB</p>
            </div>
          )}

          {loading && (
            <div style={styles.loadingBox}>
              <div style={styles.spinner} />
              <p style={styles.loadingStep}>{pipelineSteps[stepIdx]}</p>
              <div style={styles.progressBar}>
                <div style={{
                  ...styles.progressFill,
                  width: `${((stepIdx + 1) / pipelineSteps.length) * 100}%`
                }} />
              </div>
              <p style={styles.progressLabel} className="tabular">
                Step {stepIdx + 1} of {pipelineSteps.length}
              </p>
            </div>
          )}

          {error && !loading && (
            <div style={styles.errorBox}>
              <p style={styles.errorTitle}>⚠️ Something went wrong</p>
              <p style={styles.errorMsg}>{error}</p>
              <button
                style={styles.retryBtn}
                className="btn-hoverable"
                onClick={() => { setError(null); }}
              >
                Try again
              </button>
            </div>
          )}

          {result && (
            <div
              style={{
                ...styles.resultCard,
                borderTop: `4px solid var(--accent-${variant}-border)`
              }}
              className="fade-up"
            >
              <div style={styles.resultTop}>
                <div>
                  <h3 style={styles.candidateName}>{result.candidate?.name || 'Unknown'}</h3>
                  <p style={styles.candidateEmail}>{result.candidate?.email || '—'}</p>
                </div>
                <span
                  style={{
                    ...styles.scoreBadge,
                    background: `var(--accent-${variant}-bg)`,
                    color: `var(--accent-${variant}-fg)`,
                    border: `1px solid var(--accent-${variant}-border)`
                  }}
                >
                  {label}
                </span>
              </div>

              <div style={styles.metaRow}>
                {[
                  ['Experience', `${result.candidate?.years_of_experience || 0} yrs`],
                  ['Education', result.candidate?.education || '—']
                ].map(([metaLabel, val]) => (
                  <div key={metaLabel} style={styles.metaItem}>
                    <span style={styles.metaLabel}>{metaLabel}</span>
                    <span style={styles.metaValue} className="tabular">{val}</span>
                  </div>
                ))}
              </div>

              {result.candidate?.skills && (
                <div style={styles.section}>
                  <p style={styles.sectionLabel}>Skills</p>
                  <div style={styles.skillsWrap}>
                    {result.candidate.skills.split(',').map((s, i) => (
                      <span key={i} style={styles.skillTag}>{s.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.questions && result.questions.length > 0 ? (
                <div style={styles.section}>
                  <p style={styles.sectionLabel}>Interview Questions</p>
                  <ol style={styles.questionsList}>
                    {result.questions.map((q, i) => (
                      <li key={i} style={styles.questionItem}>
                        <span style={styles.questionNumber} className="tabular">{i + 1}</span>
                        <span style={styles.questionText}>{q}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : result.decision === 'reject' ? (
                <div style={styles.section}>
                  <p style={styles.sectionLabel}>Interview Questions</p>
                  <p style={styles.questionsEmpty}>
                    N/A — candidate was not shortlisted.
                  </p>
                </div>
              ) : null}

              <div style={styles.resultActions}>
                <button
                  style={styles.secondaryBtn}
                  className="btn-secondary-hoverable"
                  onClick={handleScreenAnother}
                >
                  Screen another
                </button>
                <button
                  style={styles.primaryBtn}
                  className="btn-hoverable"
                  onClick={handleClose}
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(7, 10, 20, 0.65)',
  backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '60px 20px 40px', overflowY: 'auto'
},
  modal: {
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-lg)',
    maxWidth: '660px', width: '100%',
    boxShadow: 'var(--shadow-xl), var(--edge-highlight)',
    border: '1px solid var(--border-hairline)',
    display: 'flex', flexDirection: 'column'
  },

  header: {
    padding: '24px 28px', borderBottom: '1px solid var(--border-hairline)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px'
  },
  eyebrow: {
    fontSize: '11px', color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    fontWeight: '600', marginBottom: '6px'
  },
  title: {
    fontSize: '24px', fontWeight: '500', color: 'var(--text-primary)',
    fontFamily: "'Instrument Serif', Georgia, serif",
    letterSpacing: '-0.01em', lineHeight: '1.1'
  },
  closeBtn: {
    background: 'transparent', border: 'none',
    color: 'var(--text-tertiary)', fontSize: '28px',
    cursor: 'pointer', padding: '0 6px', lineHeight: 1, fontWeight: '300',
    transition: 'color 0.15s ease'
  },

  body: { padding: '28px' },

  uploadBox: {
    background: 'var(--bg-card)',
    border: '2px dashed var(--border-soft)',
    borderRadius: 'var(--radius-lg)',
    padding: '48px 28px', textAlign: 'center',
    transition: 'border-color 0.2s ease, background 0.2s ease, transform 0.2s ease'
  },
  uploadBoxDragging: {
    borderColor: 'var(--red-brand)',
    background: 'var(--red-soft)',
    transform: 'scale(1.01)'
  },
  uploadIcon: { fontSize: '48px', marginBottom: '14px', opacity: 0.9 },
  uploadHint: {
    fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '20px'
  },
  bigButton: {
    background: 'var(--red-brand)', color: '#ffffff', border: 'none',
    borderRadius: 'var(--radius-md)', padding: '14px 36px',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
    letterSpacing: '0.01em',
    boxShadow: 'var(--shadow-brand-md)',
    display: 'block', margin: '0 auto', fontFamily: 'inherit'
  },
  uploadNote: {
    fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '16px'
  },

  loadingBox: { textAlign: 'center', padding: '32px 20px' },
  spinner: {
    width: '44px', height: '44px',
    border: '3px solid var(--border-hairline)',
    borderTop: '3px solid var(--red-brand)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 22px'
  },
  loadingStep: {
    fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500',
    marginBottom: '22px',
    transition: 'opacity 0.3s ease'
  },
  progressBar: {
    background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)',
    height: '6px', overflow: 'hidden',
    margin: '0 auto', maxWidth: '320px',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
  },
  progressFill: {
    background: 'var(--red-brand)', height: '100%',
    borderRadius: 'var(--radius-full)',
    transition: 'width 0.6s cubic-bezier(0.32, 0.72, 0.32, 1)',
    boxShadow: '0 0 12px rgba(225, 37, 27, 0.4)'
  },
  progressLabel: {
    fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '12px',
    fontWeight: '500'
  },

  errorBox: {
    background: 'var(--accent-red-bg)',
    border: '1px solid var(--accent-red-border)',
    borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'center'
  },
  errorTitle: {
    fontSize: '16px', fontWeight: '700',
    color: 'var(--accent-red-fg)', marginBottom: '8px'
  },
  errorMsg: {
    fontSize: '14px', color: 'var(--accent-red-fg)',
    marginBottom: '18px', lineHeight: '1.5', opacity: 0.85
  },
  retryBtn: {
    background: 'var(--red-brand)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius-sm)', padding: '10px 22px',
    fontSize: '14px', cursor: 'pointer', fontWeight: '600',
    boxShadow: 'var(--shadow-brand-md)', fontFamily: 'inherit'
  },

  resultCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-md)',
    padding: '28px',
    boxShadow: 'var(--shadow-sm), var(--edge-highlight)'
  },
  resultTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '22px', gap: '16px'
  },
  candidateName: {
    fontSize: '26px', fontWeight: '500',
    color: 'var(--text-primary)',
    fontFamily: "'Instrument Serif', Georgia, serif",
    letterSpacing: '-0.01em', lineHeight: '1.1'
  },
  candidateEmail: {
    fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px'
  },
  scoreBadge: {
    padding: '8px 16px', borderRadius: 'var(--radius-full)',
    fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap'
  },

  metaRow: {
    display: 'flex', gap: '32px', padding: '16px 0',
    borderTop: '1px solid var(--border-hairline)',
    borderBottom: '1px solid var(--border-hairline)',
    marginBottom: '22px', flexWrap: 'wrap'
  },
  metaItem: { display: 'flex', flexDirection: 'column', gap: '5px' },
  metaLabel: {
    fontSize: '10px', color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600'
  },
  metaValue: {
    fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)'
  },

  section: { marginBottom: '22px' },
  sectionLabel: {
    fontSize: '11px', color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    fontWeight: '600', marginBottom: '12px'
  },
  skillsWrap: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  skillTag: {
    background: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-hairline)',
    padding: '4px 11px', borderRadius: 'var(--radius-full)',
    fontSize: '12px', fontWeight: '500'
  },

  questionsList: {
    listStyle: 'none', padding: 0, margin: 0,
    display: 'flex', flexDirection: 'column', gap: '2px'
  },
  questionItem: {
    display: 'flex', gap: '14px',
    fontSize: '14px', lineHeight: '1.6',
    padding: '12px 4px',
    borderBottom: '1px solid var(--border-hairline)'
  },
  questionNumber: {
    flexShrink: 0,
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontStyle: 'italic',
    fontSize: '20px',
    color: 'var(--red-brand)',
    lineHeight: '1',
    marginTop: '2px',
    minWidth: '20px'
  },
  questionText: {
    flex: 1, color: 'var(--text-secondary)'
  },
  questionsEmpty: {
    fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic'
  },

  resultActions: {
    display: 'flex', gap: '12px', justifyContent: 'flex-end',
    marginTop: '28px', paddingTop: '22px',
    borderTop: '1px solid var(--border-hairline)'
  },
  primaryBtn: {
    background: 'var(--red-brand)', color: '#ffffff', border: 'none',
    borderRadius: 'var(--radius-sm)', padding: '10px 22px',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    boxShadow: 'var(--shadow-brand-md)', fontFamily: 'inherit'
  },
  secondaryBtn: {
    background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)', padding: '10px 20px',
    fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer',
    fontWeight: '500', fontFamily: 'inherit'
  }
};