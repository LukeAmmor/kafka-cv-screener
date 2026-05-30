import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5001';

const decisionStyles = {
  shortlist: { var: 'green', label: '✅ Shortlisted' },
  review:    { var: 'amber', label: '⚠️ Under Review' },
  reject:    { var: 'red',   label: '❌ Not Selected' }
};

export default function CandidateDetailPage() {
  const { jdId, candidateId } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadCandidate(); }, [candidateId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCandidate() {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/candidates/${candidateId}`);
      setCandidate(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.status === 404 ? 'Candidate not found.' : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={styles.loadingMsg}>Loading...</div>;
  if (error) return (
    <div style={styles.page}>
      <Link to={`/jds/${jdId}`} style={styles.backLink} className="back-button">
        <span style={styles.backLinkArrow}>←</span>
        <span>Back to job posting</span>
      </Link>
      <div style={styles.errorBox}>⚠️ {error}</div>
    </div>
  );
  if (!candidate) return null;

  const decision = candidate.finalDecision || 'review';
  const variant = decisionStyles[decision]?.var || 'amber';
  const label = decisionStyles[decision]?.label || decisionStyles.review.label;

  const questionsArr = candidate.questions
    ? candidate.questions
        .split(/\n\n/)
        .map(q => q.replace(/^\d+\.\s*/, '').trim())
        .filter(q => q.length > 0)
    : [];

  return (
    <div style={styles.page}>
      <Link to={`/jds/${jdId}`} style={styles.backLink} className="back-button">
        <span style={styles.backLinkArrow}>←</span>
        <span>Back to job posting</span>
      </Link>

      <div
        style={{
          ...styles.resultCard,
          borderTop: `4px solid var(--accent-${variant}-border)`
        }}
        className="fade-up"
      >
        <div style={styles.resultTop}>
          <div style={{ flex: 1 }}>
            <p style={styles.eyebrow}>
              Applied to{' '}
              <Link to={`/jds/${jdId}`} style={styles.jdLink}>
                {candidate.jobDescription?.title}
              </Link>
            </p>
            <h1 style={styles.candidateName}>{candidate.name || 'Unknown'}</h1>
            <p style={styles.candidateEmail}>{candidate.email || '—'}</p>
          </div>
          <div style={styles.resultTopRight}>
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
            {candidate.cvFilename && (
              <button
                onClick={() => window.open(`${API}/api/candidates/${candidate.id}/cv`, '_self')}
                style={styles.downloadBtn}
                className="btn-secondary-hoverable"
              >
                <span style={styles.downloadIcon}>⬇</span>
                <span>Download CV</span>
              </button>
            )}
          </div>
        </div>

        <div style={styles.metaRow}>
          {[
            ['Experience', `${candidate.yearsExperience || 0} yrs`],
            ['Education', candidate.education || '—'],
            ['Applied', new Date(candidate.createdAt).toLocaleDateString()]
          ].map(([metaLabel, val]) => (
            <div key={metaLabel} style={styles.metaItem}>
              <span style={styles.metaLabel}>{metaLabel}</span>
              <span style={styles.metaValue} className="tabular">{val}</span>
            </div>
          ))}
        </div>

        {candidate.skills && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Skills</p>
            <div style={styles.skillsWrap}>
              {candidate.skills.split(',').map((s, i) => (
                <span key={i} style={styles.skillTag}>{s.trim()}</span>
              ))}
            </div>
          </div>
        )}

        {questionsArr.length > 0 ? (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Interview Questions</p>
            <ol style={styles.questionsList}>
              {questionsArr.map((q, i) => (
                <li key={i} style={styles.questionItem}>
                  <span style={styles.questionNumber} className="tabular">{i + 1}</span>
                  <span style={styles.questionText}>{q}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : decision === 'reject' ? (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Interview Questions</p>
            <p style={styles.questionsEmpty}>
              N/A — candidate was not shortlisted.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: '900px', margin: '0 auto', padding: '20px 0 60px' },

  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    fontSize: '13px', color: 'var(--text-secondary)',
    textDecoration: 'none', marginBottom: '24px', fontWeight: '500',
    letterSpacing: '0.01em',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-full)',
    padding: '8px 16px 8px 12px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.15s ease'
  },
  backLinkArrow: {
    display: 'inline-block',
    transition: 'transform 0.15s ease'
  },

  loadingMsg: {
    textAlign: 'center', color: 'var(--text-tertiary)',
    padding: '60px 0', fontSize: '14px'
  },
  errorBox: {
    background: 'var(--accent-red-bg)', border: '1px solid var(--accent-red-border)',
    color: 'var(--accent-red-fg)', borderRadius: 'var(--radius-md)',
    padding: '16px 20px', fontSize: '14px'
  },

  resultCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-lg)',
    padding: '36px',
    boxShadow: 'var(--shadow-md), var(--edge-highlight)'
  },
  resultTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: '20px', marginBottom: '28px'
  },
  resultTopRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '10px',
    flexShrink: 0
  },
  eyebrow: {
    fontSize: '11px', color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    fontWeight: '600', marginBottom: '10px'
  },
  jdLink: {
    color: 'var(--red-brand)', textDecoration: 'none', fontWeight: '700'
  },
  candidateName: {
    fontSize: '36px', fontWeight: '500',
    color: 'var(--text-primary)', marginBottom: '6px',
    fontFamily: "'Instrument Serif', Georgia, serif",
    letterSpacing: '-0.015em', lineHeight: '1.05'
  },
  candidateEmail: {
    fontSize: '14px', color: 'var(--text-secondary)'
  },
  scoreBadge: {
    padding: '10px 18px', borderRadius: 'var(--radius-full)',
    fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0
  },
  downloadBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-full)',
    padding: '7px 14px 7px 12px',
    fontSize: '12px', fontWeight: '600',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit'
  },
  downloadIcon: {
    fontSize: '13px',
    lineHeight: 1
  },

  metaRow: {
    display: 'flex', gap: '40px', padding: '20px 0',
    borderTop: '1px solid var(--border-hairline)',
    borderBottom: '1px solid var(--border-hairline)',
    marginBottom: '28px', flexWrap: 'wrap'
  },
  metaItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
  metaLabel: {
    fontSize: '11px', color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600'
  },
  metaValue: {
    fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)'
  },

  section: { marginBottom: '28px' },
  sectionLabel: {
    fontSize: '11px', color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    fontWeight: '600', marginBottom: '14px'
  },
  skillsWrap: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  skillTag: {
    background: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-hairline)',
    padding: '5px 12px', borderRadius: 'var(--radius-full)',
    fontSize: '13px', fontWeight: '500'
  },

  questionsList: {
    listStyle: 'none', padding: 0, margin: 0,
    display: 'flex', flexDirection: 'column', gap: '4px'
  },
  questionItem: {
    display: 'flex', gap: '14px',
    fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.65',
    padding: '14px 4px',
    borderBottom: '1px solid var(--border-hairline)'
  },
  questionNumber: {
    flexShrink: 0,
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontStyle: 'italic',
    fontSize: '22px',
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
  }
};