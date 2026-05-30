import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import UploadCvModal from './UploadCvModal';

const API = 'http://localhost:5001';

const decisionStyles = {
  shortlist: { var: 'green', label: '✅ Shortlisted' },
  review:    { var: 'amber', label: '⚠️ Review' },
  reject:    { var: 'red',   label: '❌ Not Selected' }
};

const filterOptions = [
  { key: 'all',       label: 'All' },
  { key: 'shortlist', label: 'Shortlisted' },
  { key: 'review',    label: 'Review' },
  { key: 'reject',    label: 'Rejected' }
];

export default function JdDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jd, setJd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFullJd, setShowFullJd] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadJd(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadJd() {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/jds/${id}`);
      setJd(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.status === 404 ? 'Job posting not found.' : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }

  function startEditing() {
    setEditTitle(jd.title);
    setEditText(jd.jdText);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditTitle('');
    setEditText('');
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editText.trim()) return;
    setSaving(true);
    try {
      const res = await axios.put(`${API}/api/jds/${id}`, {
        title: editTitle.trim(),
        jdText: editText.trim()
      });
      setJd({ ...jd, ...res.data });
      setEditing(false);
    } catch (err) {
      alert('Failed to save changes: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  }

  function requestDeleteCandidate(candidate, e) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteCandidate({ id: candidate.id, name: candidate.name || 'this candidate' });
  }

  async function confirmDeleteCandidate() {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/api/candidates/${deleteCandidate.id}`);
      setDeleteCandidate(null);
      await loadJd();
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeleting(false);
    }
  }

  function getBadgeStyle(decisionKey) {
    const variant = decisionStyles[decisionKey]?.var || 'amber';
    return {
      ...styles.badge,
      background: `var(--accent-${variant}-bg)`,
      color: `var(--accent-${variant}-fg)`,
      border: `1px solid var(--accent-${variant}-border)`
    };
  }

  if (loading) return <div style={styles.loadingMsg}>Loading...</div>;
  if (error) return (
    <div style={styles.page}>
      <Link to="/jds" style={styles.backLink} className="back-button">
        <span style={styles.backLinkArrow}>←</span>
        <span>Back to all postings</span>
      </Link>
      <div style={styles.errorBox}>⚠️ {error}</div>
    </div>
  );
  if (!jd) return null;

  const candidates = jd.candidates || [];
  const jdPreview = jd.jdText.length > 240 && !showFullJd
    ? jd.jdText.slice(0, 240) + '...'
    : jd.jdText;

  const counts = {
    all: candidates.length,
    shortlist: candidates.filter(c => c.finalDecision === 'shortlist').length,
    review:    candidates.filter(c => c.finalDecision === 'review').length,
    reject:    candidates.filter(c => c.finalDecision === 'reject').length
  };

  const filteredByDecision = filter === 'all'
    ? candidates
    : candidates.filter(c => c.finalDecision === filter);

  const q = search.trim().toLowerCase();
  const visibleCandidates = q
    ? filteredByDecision.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.skills || '').toLowerCase().includes(q)
      )
    : filteredByDecision;

  return (
    <div style={styles.page}>
      <Link to="/jds" style={styles.backLink} className="back-button">
        <span style={styles.backLinkArrow}>←</span>
        <span>Back to all postings</span>
      </Link>

      {!editing && (
        <div style={styles.jdCard} className="fade-up">
          <div style={styles.jdHeaderRow}>
            <div style={{ flex: 1 }}>
              <h1 style={styles.jdTitle}>{jd.title}</h1>
              <p style={styles.jdMeta}>Created {new Date(jd.createdAt).toLocaleDateString()}</p>
            </div>
            <button
              style={styles.editBtn}
              className="btn-green-hoverable"
              onClick={startEditing}
            >
              ✏️ Edit
            </button>
          </div>
          <div style={styles.jdTextBlock}>
            {jdPreview}
            {jd.jdText.length > 240 && (
              <button
                style={styles.toggleBtn}
                onClick={() => setShowFullJd(!showFullJd)}
              >
                {showFullJd ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>
      )}

      {editing && (
        <div style={styles.jdCard} className="scale-in">
          <h2 style={styles.editHeading}>Edit Job Posting</h2>
          <label style={styles.label}>Title</label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={styles.input}
            disabled={saving}
          />
          <label style={styles.label}>Job Description</label>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            style={styles.textarea}
            rows={10}
            disabled={saving}
          />
          <div style={styles.editActions}>
            <button
              style={styles.secondaryBtn}
              className="btn-secondary-hoverable"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              style={styles.primaryBtn}
              className="btn-hoverable"
              onClick={saveEdit}
              disabled={saving || !editTitle.trim() || !editText.trim()}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      <div style={styles.actionBar}>
        <h2 style={styles.candidatesTitle}>
          <span style={styles.candidatesLabel}>Candidates</span>
          <span style={styles.countBadge} className="tabular">{candidates.length}</span>
        </h2>
        <button
          style={styles.uploadBtn}
          className="btn-hoverable"
          onClick={() => setUploadOpen(true)}
        >
          + Upload CV
        </button>
      </div>

      {candidates.length > 0 && (
        <div style={styles.toolbar}>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or skills..."
              style={styles.searchInput}
            />
            {search && (
              <button
                style={styles.searchClear}
                onClick={() => setSearch('')}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div style={styles.filterRow}>
            {filterOptions.map(opt => {
              const count = counts[opt.key];
              const active = filter === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  style={{
                    ...styles.filterPill,
                    ...(active ? styles.filterPillActive : {})
                  }}
                >
                  {opt.label}
                  <span
                    className="tabular"
                    style={{
                      ...styles.filterPillCount,
                      ...(active ? styles.filterPillCountActive : {})
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {candidates.length === 0 ? (
        <div style={styles.emptyState} className="scale-in">
          <div style={styles.emptyIcon}>📄</div>
          <p style={styles.emptyTitle}>No candidates yet</p>
          <p style={styles.emptySub}>Upload a CV to start screening against this job description.</p>
        </div>
      ) : visibleCandidates.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔍</div>
          <p style={styles.emptyTitle}>No matches</p>
          <p style={styles.emptySub}>
            {q
              ? `No candidates match "${search}"${filter !== 'all' ? ` in "${filterOptions.find(f => f.key === filter)?.label}"` : ''}.`
              : `No candidates in "${filterOptions.find(f => f.key === filter)?.label}".`}
            {' '}Try a different {q && filter !== 'all' ? 'search or filter' : q ? 'search term' : 'filter'}.
          </p>
        </div>
      ) : (
        <div style={styles.tableCard} className="fade-up">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Skills</th>
                <th style={styles.th}>Decision</th>
                <th style={{ ...styles.th, width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {visibleCandidates.map((c) => {
                return (
                  <tr
                    key={c.id}
                    style={styles.tr}
                    className="row-hoverable"
                    onClick={() => navigate(`/jds/${jd.id}/candidates/${c.id}`)}
                  >
                    <td style={{ ...styles.td, fontWeight: '600' }}>{c.name}</td>
                    <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>{c.email || '—'}</td>
                    <td style={{ ...styles.td, color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {c.skills?.length > 50 ? c.skills.slice(0, 50) + '...' : c.skills}
                    </td>
                    <td style={styles.td}>
                      <span style={getBadgeStyle(c.finalDecision)}>
                        {decisionStyles[c.finalDecision]?.label || decisionStyles.review.label}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button
                        style={styles.rowDeleteBtn}
                        className="row-delete-btn"
                        onClick={(e) => requestDeleteCandidate(c, e)}
                        title="Delete candidate"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {uploadOpen && (
        <UploadCvModal
          jdId={jd.id}
          jdTitle={jd.title}
          onClose={() => setUploadOpen(false)}
          onSuccess={loadJd}
        />
      )}

      {deleteCandidate && (
        <div style={styles.modalOverlay} onClick={() => !deleting && setDeleteCandidate(null)}>
          <div style={styles.modalCard} className="scale-in" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>⚠️</div>
            <h3 style={styles.modalTitle}>Delete this candidate?</h3>
            <p style={styles.modalText}>
              You're about to delete <strong>{deleteCandidate.name}</strong> from this job posting.
              Their screening result and interview questions will be lost. This can't be undone.
            </p>
            <div style={styles.modalActions}>
              <button
                style={styles.secondaryBtn}
                className="btn-secondary-hoverable"
                onClick={() => setDeleteCandidate(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                style={styles.dangerBtn}
                className="btn-hoverable"
                onClick={confirmDeleteCandidate}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: '1100px', margin: '0 auto', padding: '20px 0 60px' },

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

  jdCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-lg)',
    padding: '32px',
    boxShadow: 'var(--shadow-md), var(--edge-highlight)',
    marginBottom: '28px'
  },
  jdHeaderRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: '16px', marginBottom: '18px'
  },
  jdTitle: {
    fontSize: '32px', fontWeight: '500',
    color: 'var(--text-primary)', marginBottom: '8px',
    fontFamily: "'Instrument Serif', Georgia, serif",
    letterSpacing: '-0.01em', lineHeight: '1.1'
  },
  jdMeta: {
    fontSize: '11px', color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600'
  },
  jdTextBlock: {
    fontSize: '15px', color: 'var(--text-secondary)',
    lineHeight: '1.7', whiteSpace: 'pre-wrap'
  },
  toggleBtn: {
    background: 'transparent', border: 'none', color: 'var(--red-brand)',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600',
    padding: '0', marginLeft: '6px', fontFamily: 'inherit'
  },
  editBtn: {
    background: 'var(--accent-green-bg)', color: 'var(--accent-green-fg)',
    border: '1px solid var(--accent-green-border)',
    borderRadius: 'var(--radius-sm)', padding: '8px 14px',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit'
  },

  editHeading: {
    fontSize: '24px', fontWeight: '500', color: 'var(--text-primary)',
    marginBottom: '20px', fontFamily: "'Instrument Serif', Georgia, serif",
    letterSpacing: '-0.01em'
  },
  label: {
    display: 'block', fontSize: '11px', color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600',
    marginBottom: '8px', marginTop: '18px'
  },
  input: {
    width: '100%', padding: '12px 14px',
    border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)',
    fontSize: '15px', fontFamily: 'inherit', color: 'var(--text-primary)',
    outline: 'none', background: 'var(--bg-input)'
  },
  textarea: {
    width: '100%', padding: '12px 14px',
    border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)',
    fontSize: '14px', fontFamily: 'inherit', color: 'var(--text-primary)',
    resize: 'vertical', outline: 'none', background: 'var(--bg-input)',
    lineHeight: '1.6'
  },
  editActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
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
  },
  dangerBtn: {
    background: 'var(--red-brand)', color: '#ffffff', border: 'none',
    borderRadius: 'var(--radius-sm)', padding: '10px 20px',
    fontSize: '14px', cursor: 'pointer', fontWeight: '600',
    boxShadow: 'var(--shadow-brand-md)', fontFamily: 'inherit'
  },

  actionBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '18px'
  },
  candidatesTitle: {
    fontSize: '22px', fontWeight: '500', color: 'var(--text-primary)',
    display: 'flex', alignItems: 'center', gap: '12px',
    fontFamily: "'Instrument Serif', Georgia, serif", letterSpacing: '-0.01em'
  },
  candidatesLabel: { },
  countBadge: {
    background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
    fontSize: '12px', fontWeight: '600', padding: '3px 10px',
    borderRadius: 'var(--radius-full)',
    fontFamily: "'Geist', sans-serif"
  },
  uploadBtn: {
    background: 'var(--red-brand)', color: '#ffffff', border: 'none',
    borderRadius: 'var(--radius-md)', padding: '12px 22px',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    boxShadow: 'var(--shadow-brand-md)', fontFamily: 'inherit',
    letterSpacing: '0.01em'
  },

  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '16px', marginBottom: '18px', flexWrap: 'wrap'
  },
  searchWrap: {
    position: 'relative', flex: '1 1 650px', maxWidth: '650px', minWidth: '240px'
  },
  searchIcon: {
    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
    fontSize: '14px', pointerEvents: 'none', opacity: 0.6
  },
  searchInput: {
    width: '100%', padding: '10px 40px 10px 38px',
    border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)',
    fontSize: '14px', fontFamily: 'inherit', color: 'var(--text-primary)',
    outline: 'none', background: 'var(--bg-input)',
    boxShadow: 'var(--shadow-sm)'
  },
  searchClear: {
    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
    background: 'var(--bg-subtle)', border: 'none', width: '22px', height: '22px',
    borderRadius: '50%', cursor: 'pointer', color: 'var(--text-secondary)',
    fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1, padding: 0
  },

  filterRow: {
    display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end'
  },
  filterPill: {
    background: 'var(--bg-card)', border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-full)',
    padding: '6px 6px 6px 14px', fontSize: '13px', fontWeight: '600',
    color: 'var(--text-secondary)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '8px',
    transition: 'all 0.15s ease', fontFamily: 'inherit',
    boxShadow: 'var(--shadow-sm)'
  },
  filterPillActive: {
    background: 'var(--navy-base)', color: 'var(--text-on-dark)',
    borderColor: 'var(--navy-base)'
  },
  filterPillCount: {
    background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-full)',
    padding: '2px 9px', fontSize: '11px', fontWeight: '700', minWidth: '22px',
    textAlign: 'center', display: 'inline-block'
  },
  filterPillCountActive: {
    background: 'var(--red-brand)', color: '#ffffff'
  },

  emptyState: {
    textAlign: 'center', padding: '60px 20px',
    background: 'var(--bg-card)',
    border: '1px dashed var(--border-soft)',
    borderRadius: 'var(--radius-lg)'
  },
  emptyIcon: { fontSize: '52px', marginBottom: '16px', opacity: 0.85 },
  emptyTitle: {
    fontSize: '18px', fontWeight: '500', color: 'var(--text-primary)',
    marginBottom: '6px', fontFamily: "'Instrument Serif', Georgia, serif"
  },
  emptySub: { fontSize: '14px', color: 'var(--text-secondary)' },

  tableCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md), var(--edge-highlight)',
    overflow: 'hidden'
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', padding: '14px 18px',
    background: 'var(--bg-subtle)',
    fontSize: '11px', color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600',
    borderBottom: '1px solid var(--border-hairline)'
  },
  tr: { borderBottom: '1px solid var(--border-hairline)', cursor: 'pointer' },
  td: { padding: '14px 18px', fontSize: '14px', color: 'var(--text-primary)' },
  badge: {
    padding: '4px 12px', borderRadius: 'var(--radius-full)',
    fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap',
    display: 'inline-block'
  },

  rowDeleteBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: '16px', padding: '6px 8px', borderRadius: 'var(--radius-sm)',
    opacity: 0.5, transition: 'opacity 0.15s ease, background 0.15s ease',
    lineHeight: 1
  },

  modalOverlay: {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(7, 10, 20, 0.65)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '60px 20px 40px'
},
  modalCard: {
    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
    padding: '36px', maxWidth: '440px', width: '100%',
    boxShadow: 'var(--shadow-xl), var(--edge-highlight)',
    border: '1px solid var(--border-hairline)',
    textAlign: 'center'
  },
  modalIcon: { fontSize: '48px', marginBottom: '12px' },
  modalTitle: {
    fontSize: '22px', fontWeight: '500', color: 'var(--text-primary)',
    marginBottom: '12px', fontFamily: "'Instrument Serif', Georgia, serif",
    letterSpacing: '-0.01em'
  },
  modalText: {
    fontSize: '14px', color: 'var(--text-secondary)',
    lineHeight: '1.6', marginBottom: '24px'
  },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'center' }
};