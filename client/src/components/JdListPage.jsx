import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5001';

export default function JdListPage() {
  const [jds, setJds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [title, setTitle] = useState('');
  const [jdText, setJdText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadJds(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadJds() {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/jds`);
      setJds(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load job postings. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim() || !jdText.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/jds`, { title: title.trim(), jdText: jdText.trim() });
      setTitle('');
      setJdText('');
      setShowForm(false);
      await loadJds();
    } catch (err) {
      alert('Failed to create JD: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  function requestDelete(jd, e) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget({ id: jd.id, title: jd.title });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API}/api/jds/${deleteTarget.id}`);
      setDeleteTarget(null);
      await loadJds();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
      setDeleteTarget(null);
    }
  }

  const filteredJds = jds.filter(jd =>
    jd.title.toLowerCase().includes(search.toLowerCase()) ||
    jd.jdText.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      <div style={styles.hero} className="fade-up">
        <h1 className="page-title">
          Job <em>Postings</em>
        </h1>
        <p style={styles.heroSub}>
          Create a posting, upload candidate resumes, and let the pipeline screen them for fit.
        </p>
      </div>

      {!showForm && (
        <button
          style={styles.primaryBtn}
          className="btn-hoverable"
          onClick={() => setShowForm(true)}
        >
          + New Job Posting
        </button>
      )}

      {showForm && (
        <div style={styles.formCard} className="scale-in">
          <h2 style={styles.formTitle}>New Job Posting</h2>
          <form onSubmit={handleCreate}>
            <label style={styles.label}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior React Developer"
              style={styles.input}
              required
            />

            <label style={styles.label}>Job Description</label>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste the full job description here..."
              style={styles.textarea}
              rows={8}
              required
            />

            <div style={styles.formActions}>
              <button
                type="button"
                style={styles.secondaryBtn}
                className="btn-secondary-hoverable"
                onClick={() => { setShowForm(false); setTitle(''); setJdText(''); }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={styles.primaryBtn}
                className="btn-hoverable"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Posting'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && jds.length > 0 && (
        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or description..."
            style={styles.searchInput}
          />
          {search && (
            <button style={styles.searchClear} onClick={() => setSearch('')}>×</button>
          )}
        </div>
      )}

      {loading && <div style={styles.loadingMsg}>Loading job postings...</div>}

      {error && <div style={styles.errorBox}>⚠️ {error}</div>}

      {!loading && !error && jds.length === 0 && !showForm && (
        <div style={styles.emptyState} className="scale-in">
          <div style={styles.emptyIcon}>📋</div>
          <p style={styles.emptyTitle}>No job postings yet</p>
          <p style={styles.emptySub}>Create your first one to start screening candidates.</p>
        </div>
      )}

      {!loading && jds.length > 0 && filteredJds.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔍</div>
          <p style={styles.emptyTitle}>No matches</p>
          <p style={styles.emptySub}>No postings match "{search}". Try another search term.</p>
        </div>
      )}

      {!loading && filteredJds.length > 0 && (
        <div style={styles.grid} className="stagger-children">
          {filteredJds.map((jd) => (
            <Link key={jd.id} to={`/jds/${jd.id}`} style={styles.cardLink}>
              <div style={styles.card} className="card-hoverable">
                <div style={styles.cardTop}>
                  <h3 style={styles.cardTitle}>{jd.title}</h3>
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => requestDelete(jd, e)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
                <p style={styles.cardPreview}>
                  {jd.jdText.length > 140 ? jd.jdText.slice(0, 140) + '...' : jd.jdText}
                </p>
                <div style={styles.cardFooter}>
                  <span style={styles.candidateCount} className="tabular">
                    {jd._count?.candidates || 0} candidate{jd._count?.candidates === 1 ? '' : 's'}
                  </span>
                  <span style={styles.cardDate} className="tabular">
                    {new Date(jd.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div style={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div style={styles.modalCard} className="scale-in" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>⚠️</div>
            <h3 style={styles.modalTitle}>Delete this job posting?</h3>
            <p style={styles.modalText}>
              You're about to delete <strong>"{deleteTarget.title}"</strong> and all candidates
              attached to it. This can't be undone.
            </p>
            <div style={styles.modalActions}>
              <button
                style={styles.secondaryBtn}
                className="btn-secondary-hoverable"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                style={styles.dangerBtn}
                className="btn-hoverable"
                onClick={confirmDelete}
              >
                Yes, delete it
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

  hero: { textAlign: 'center', marginBottom: '40px' },
  heroSub: {
    fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6',
    marginTop: '14px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto'
  },

  primaryBtn: {
    background: 'var(--red-brand)', color: '#ffffff', border: 'none',
    borderRadius: 'var(--radius-md)', padding: '14px 28px',
    fontSize: '14.5px', fontWeight: '600', cursor: 'pointer',
    boxShadow: 'var(--shadow-brand-md)', display: 'block', margin: '0 auto 32px',
    fontFamily: 'inherit', letterSpacing: '0.01em'
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

  formCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-lg)', padding: '32px',
    boxShadow: 'var(--shadow-md), var(--edge-highlight)',
    marginBottom: '32px'
  },
  formTitle: {
    fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)',
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
    outline: 'none', background: 'var(--bg-input)',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
  },
  textarea: {
    width: '100%', padding: '12px 14px',
    border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)',
    fontSize: '14px', fontFamily: 'inherit', color: 'var(--text-primary)',
    resize: 'vertical', outline: 'none', background: 'var(--bg-input)',
    lineHeight: '1.6'
  },
  formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },

  searchWrap: {
    position: 'relative', marginBottom: '24px', maxWidth: '500px',
    margin: '0 auto 24px'
  },
  searchIcon: {
    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
    fontSize: '14px', pointerEvents: 'none', opacity: 0.6
  },
  searchInput: {
    width: '100%', padding: '12px 40px 12px 40px',
    border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)',
    fontSize: '14px', fontFamily: 'inherit', color: 'var(--text-primary)',
    outline: 'none', background: 'var(--bg-input)',
    boxShadow: 'var(--shadow-sm)'
  },
  searchClear: {
    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
    background: 'var(--bg-subtle)', border: 'none', width: '24px', height: '24px',
    borderRadius: '50%', cursor: 'pointer', color: 'var(--text-secondary)',
    fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1
  },

  loadingMsg: {
    textAlign: 'center', color: 'var(--text-tertiary)',
    padding: '40px 0', fontSize: '14px'
  },
  errorBox: {
    background: 'var(--accent-red-bg)', border: '1px solid var(--accent-red-border)',
    color: 'var(--accent-red-fg)', borderRadius: 'var(--radius-md)',
    padding: '16px 20px', fontSize: '14px'
  },

  emptyState: {
    textAlign: 'center', padding: '60px 20px',
    background: 'var(--bg-card)',
    border: '1px dashed var(--border-soft)',
    borderRadius: 'var(--radius-lg)'
  },
  emptyIcon: { fontSize: '52px', marginBottom: '16px', opacity: 0.85 },
  emptyTitle: {
    fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)',
    marginBottom: '6px', fontFamily: "'Instrument Serif', Georgia, serif"
  },
  emptySub: { fontSize: '14px', color: 'var(--text-secondary)' },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '18px'
  },
  cardLink: { textDecoration: 'none', color: 'inherit' },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-md)',
    padding: '22px',
    cursor: 'pointer', height: '100%',
    display: 'flex', flexDirection: 'column',
    boxShadow: 'var(--shadow-sm), var(--edge-highlight)',
    position: 'relative'
  },
  cardTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: '12px', marginBottom: '12px'
  },
  cardTitle: {
    fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)',
    flex: 1, lineHeight: '1.3',
    fontFamily: "'Instrument Serif', Georgia, serif", letterSpacing: '-0.005em'
  },
  deleteBtn: {
    background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
    fontSize: '22px', cursor: 'pointer', padding: '0 4px',
    lineHeight: 1, fontWeight: '300',
    transition: 'color 0.15s ease'
  },
  cardPreview: {
    fontSize: '13px', color: 'var(--text-secondary)',
    lineHeight: '1.55', flex: 1, marginBottom: '16px'
  },
  cardFooter: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: '14px',
    borderTop: '1px solid var(--border-hairline)'
  },
  candidateCount: {
    fontSize: '12px', fontWeight: '600',
    color: 'var(--red-brand)',
    background: 'var(--red-soft)',
    padding: '4px 10px', borderRadius: 'var(--radius-full)'
  },
  cardDate: { fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500' },

  modalOverlay: {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(7, 10, 20, 0.65)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '60px 20px 40px'
},
  modalCard: {
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-lg)',
    padding: '36px',
    maxWidth: '440px', width: '100%',
    boxShadow: 'var(--shadow-xl), var(--edge-highlight)',
    border: '1px solid var(--border-hairline)',
    textAlign: 'center'
  },
  modalIcon: { fontSize: '48px', marginBottom: '12px' },
  modalTitle: {
    fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)',
    marginBottom: '12px', fontFamily: "'Instrument Serif', Georgia, serif",
    letterSpacing: '-0.01em'
  },
  modalText: {
    fontSize: '14px', color: 'var(--text-secondary)',
    lineHeight: '1.6', marginBottom: '24px'
  },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'center' }
};

