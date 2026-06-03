import { useEffect, useState } from 'react';
import { BookOpen, FolderOpen, Plus, Trash2, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { deleteLocalCourse, getAllLocalCourses } from './utils/storage';

// Google Fonts import via style tag
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');

  :root {
    --navy: #2d0b0b;
    --navy-mid: #4a1212;
    --navy-light: #621818;
    --gold: #c9a96e;
    --gold-light: #dbbe8a;
    --surface: #f7f6f4;
    --surface-2: #eeecea;
    --border: #dedad4;
    --border-strong: #c8c3bb;
    --text-primary: #0d1f3c;
    --text-secondary: #4a4a5a;
    --text-muted: #7a7a8c;
    --white: #ffffff;
  }

  .dash-root * {
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
  }

  .dash-root {
    font-family: 'Roboto', sans-serif;
    background-color: var(--surface);
    min-height: 100vh;
    color: var(--text-primary);
  }

  /* ── Top bar ── */
  .dash-topbar {
    background: var(--navy);
    border-bottom: 1px solid var(--navy-light);
    padding: 0 2.5rem;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .dash-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dash-brand-icon {
    width: 28px;
    height: 28px;
    color: var(--gold);
    flex-shrink: 0;
  }

  .dash-brand-name {
    font-family: 'Roboto', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    color: var(--white);
    letter-spacing: 0.03em;
  }

  .dash-brand-divider {
    width: 1px;
    height: 18px;
    background: rgba(255,255,255,0.2);
    margin: 0 12px;
  }

  .dash-brand-sub {
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
  }

  .dash-topbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dash-pill {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--gold-light);
    background: rgba(176, 141, 87, 0.12);
    border: 1px solid rgba(176, 141, 87, 0.25);
    padding: 3px 10px;
    border-radius: 2px;
  }

  /* ── Page body ── */
  .dash-body {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2.5rem 2.5rem 4rem;
  }

  /* ── Page header ── */
  .dash-page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .dash-page-title-block {}

  .dash-eyebrow {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 6px;
  }

  .dash-page-title {
    font-family: 'Roboto', sans-serif;
    font-size: 1.9rem;
    font-weight: 700;
    color: var(--navy);
    line-height: 1.15;
    margin: 0 0 6px;
  }

  .dash-page-desc {
    font-size: 0.82rem;
    color: var(--text-muted);
    font-weight: 400;
    line-height: 1.5;
    margin: 0;
    max-width: 420px;
  }

  /* ── Create button ── */
  .dash-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 18px;
    background: var(--navy);
    color: var(--white);
    border: 1px solid var(--navy);
    font-family: 'Roboto', sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    border-radius: 2px;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
    text-decoration: none;
  }

  .dash-btn-primary:hover {
    background: var(--navy-mid);
    border-color: var(--navy-mid);
  }

  .dash-btn-primary:focus-visible {
    outline: 2px solid var(--gold);
    outline-offset: 2px;
  }

  /* ── Stats row ── */
  .dash-stats {
    display: flex;
    gap: 1px;
    margin-bottom: 2rem;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: 3px;
    overflow: hidden;
  }

  .dash-stat {
    flex: 1;
    background: var(--white);
    padding: 14px 20px;
  }

  .dash-stat-label {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .dash-stat-value {
    font-family: 'Roboto', sans-serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--navy);
    line-height: 1;
  }

  /* ── Error ── */
  .dash-error {
    background: #fdf2f2;
    border: 1px solid #e8b8b8;
    border-left: 3px solid #b94040;
    padding: 10px 16px;
    font-size: 0.8rem;
    color: #7a2020;
    border-radius: 2px;
    margin-bottom: 1.5rem;
  }

  /* ── Section label ── */
  .dash-section-label {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dash-section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  /* ── Loading ── */
  .dash-loading {
    background: var(--white);
    border: 1px solid var(--border);
    padding: 3rem 2rem;
    text-align: center;
    font-size: 0.82rem;
    color: var(--text-muted);
    border-radius: 2px;
    letter-spacing: 0.03em;
  }

  /* ── Empty ── */
  .dash-empty {
    background: var(--white);
    border: 1px dashed var(--border-strong);
    padding: 4rem 2rem;
    text-align: center;
    border-radius: 2px;
  }

  .dash-empty-icon {
    width: 40px;
    height: 40px;
    color: var(--border-strong);
    margin: 0 auto 1rem;
  }

  .dash-empty-title {
    font-family: 'Roboto', sans-serif;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--navy);
    margin: 0 0 6px;
  }

  .dash-empty-desc {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.55;
  }

  /* ── Grid ── */
  .dash-grid {
    display: grid;
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: 3px;
    overflow: hidden;
  }

  @media (min-width: 700px) {
    .dash-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (min-width: 1100px) {
    .dash-grid { grid-template-columns: repeat(3, 1fr); }
  }

  /* ── Card ── */
  .dash-card {
    background: var(--white);
    padding: 1.4rem 1.5rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
    transition: background 0.1s;
  }

  .dash-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: transparent;
    transition: background 0.15s;
  }

  .dash-card:hover {
    background: #fafaf8;
  }

  .dash-card:hover::before {
    background: var(--gold);
  }

  .dash-card-title {
    font-family: 'Roboto', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--navy);
    margin: 0 0 6px;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .dash-card-meta {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    color: var(--text-muted);
    font-weight: 400;
    margin-bottom: 1.25rem;
  }

  .dash-card-meta svg {
    flex-shrink: 0;
  }

  .dash-card-actions {
    display: flex;
    gap: 6px;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid var(--surface-2);
  }

  .dash-btn-open {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 12px;
    background: var(--navy);
    color: var(--white);
    border: 1px solid var(--navy);
    font-family: 'Roboto', sans-serif;
    font-size: 0.76rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    border-radius: 2px;
    transition: background 0.15s;
    white-space: nowrap;
  }

  .dash-btn-open:hover {
    background: var(--navy-mid);
  }

  .dash-btn-open:focus-visible {
    outline: 2px solid var(--gold);
    outline-offset: 2px;
  }

  .dash-btn-delete {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 34px;
    padding: 0 11px;
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border);
    font-family: 'Roboto', sans-serif;
    font-size: 0.76rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 2px;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }

  .dash-btn-delete:hover {
    color: #7a2020;
    border-color: #e8b8b8;
    background: #fdf2f2;
  }

  .dash-btn-delete:focus-visible {
    outline: 2px solid var(--gold);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    .dash-topbar { padding: 0 1.25rem; }
    .dash-body { padding: 1.5rem 1.25rem 3rem; }
    .dash-page-header { flex-direction: column; align-items: flex-start; gap: 1.25rem; }
    .dash-page-title { font-size: 1.5rem; }
  }
`;

function formatCourseDate(timestamp) {
  if (!timestamp) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function Dashboard({ onCreateNew, onOpenCourse, onOpenAIGenerator }) {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        const savedCourses = await getAllLocalCourses();
        if (isMounted) {
          setCourses(savedCourses);
          setError('');
        }
      } catch {
        if (isMounted) {
          setError('Could not load saved courses from this browser.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCourses();
    return () => { isMounted = false; };
  }, []);

  const handleDelete = async (courseId) => {
    await deleteLocalCourse(courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  return (
    <div className="dash-root">
      <style>{fontStyle}</style>

      {/* Top bar */}
      <header className="dash-topbar">
        <div className="dash-brand">
          <BookOpen className="dash-brand-icon" />
          <span className="dash-brand-name">CourseForge</span>
          <div className="dash-brand-divider" />
          <span className="dash-brand-sub">Authoring Suite</span>
        </div>
        <div className="dash-topbar-right">
          <span className="dash-pill">Dashboard</span>
        </div>
      </header>

      {/* Body */}
      <main className="dash-body">
        {/* Page header */}
        <div className="dash-page-header">
          <div className="dash-page-title-block">
            <p className="dash-eyebrow">Course Management</p>
            <h1 className="dash-page-title">My Courses</h1>
            <p className="dash-page-desc">
              Open and manage course authoring projects saved in this browser.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onOpenAIGenerator} className="dash-btn-primary" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', border: 'none', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}>
              <Sparkles size={14} style={{ marginRight: 4 }} />
              Generate with AI
            </button>
            <button type="button" onClick={onCreateNew} className="dash-btn-primary">
              <Plus size={14} />
              Create New Course
            </button>
          </div>
        </div>

        {/* Stats row */}
        {!isLoading && !error && (
          <div className="dash-stats">
            <div className="dash-stat">
              <div className="dash-stat-label">Total Courses</div>
              <div className="dash-stat-value">{courses.length}</div>
            </div>
            <div className="dash-stat">
              <div className="dash-stat-label">Storage</div>
              <div className="dash-stat-value">Local</div>
            </div>
            <div className="dash-stat">
              <div className="dash-stat-label">Status</div>
              <div className="dash-stat-value" style={{ fontSize: '0.95rem', color: '#2a6e3f', fontFamily: 'Roboto, sans-serif', fontWeight: 600 }}>Active</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className="dash-error">{error}</div>}

        {/* Section label */}
        {!isLoading && courses.length > 0 && (
          <div className="dash-section-label">All Courses</div>
        )}

        {/* Content states */}
        {isLoading ? (
          <div className="dash-loading">Loading saved courses…</div>
        ) : courses.length === 0 ? (
          <div className="dash-empty">
            <BookOpen className="dash-empty-icon" />
            <h2 className="dash-empty-title">No courses yet</h2>
            <p className="dash-empty-desc">
              Create a course to start authoring.<br />Saved courses will appear here.
            </p>
          </div>
        ) : (
          <div className="dash-grid">
            {courses.map((course) => (
              <article key={course.id} className="dash-card">
                <h2 className="dash-card-title">{course.title || 'Untitled Course'}</h2>
                <p className="dash-card-meta">
                  <Clock size={11} />
                  Last edited {formatCourseDate(course.updatedAt)}
                </p>
                <div className="dash-card-actions">
                  <button
                    type="button"
                    onClick={() => onOpenCourse(course)}
                    className="dash-btn-open"
                  >
                    <FolderOpen size={13} />
                    Open
                    <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(course.id)}
                    className="dash-btn-delete"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;