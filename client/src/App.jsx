import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, Link } from 'react-router-dom';
import JdListPage from './components/JdListPage';
import JdDetailPage from './components/JdDetailPage';
import CandidateDetailPage from './components/CandidateDetailPage';
import PipelineTab from './components/PipelineTab';
import './App.css';

const THEME_KEY = 'resumind-theme';

function getInitialTheme() {
  // Read persisted preference first
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (_) { /* localStorage blocked — fall through */ }

  // Fall back to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply theme to <html> so CSS variables cascade everywhere
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_) { /* localStorage blocked — silently ignore */ }
  }, [theme]);

  function toggleTheme() {
    setTheme(t => (t === 'light' ? 'dark' : 'light'));
  }

  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <div className="header-inner">
            <Link to="/jds" className="brand">
              <span className="brand-name">RESUMIND</span>
            </Link>

            <div className="header-right">
              <nav className="tabs">
                <NavLink
                  to="/jds"
                  className={({ isActive }) => isActive ? 'tab active' : 'tab'}
                >
                  Job Postings
                </NavLink>
                <NavLink
                  to="/pipeline"
                  className={({ isActive }) => isActive ? 'tab active' : 'tab'}
                >
                  How It Works
                </NavLink>
              </nav>

              <button
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/jds" replace />} />
            <Route path="/jds" element={<JdListPage />} />
            <Route path="/jds/:id" element={<JdDetailPage />} />
            <Route path="/jds/:jdId/candidates/:candidateId" element={<CandidateDetailPage />} />
            <Route path="/pipeline" element={<PipelineTab />} />
            <Route path="*" element={<Navigate to="/jds" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}