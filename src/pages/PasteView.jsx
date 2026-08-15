import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";

export default function PasteView() {
  const { slug } = useParams();
  const [paste, setPaste] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("paste_theme") || "dark");

  const isDark = theme === "dark";

  useEffect(() => {
    localStorage.setItem("paste_theme", theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  useEffect(() => {
    const fetchPaste = async () => {
      try {
        const { data } = await api.get(`/paste/${slug}`);
        setPaste(data);
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(err.response?.data?.error || "Failed to load paste.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPaste();
  }, [slug]);

  const handleCopyText = useCallback(async () => {
    if (!paste) return;
    try {
      await navigator.clipboard.writeText(paste.content);
    } catch {
      const el = document.createElement("textarea");
      el.value = paste.content;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [paste]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      const el = document.createElement("textarea");
      el.value = window.location.href;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  };

  const lineCount = paste?.content?.split("\n").length || 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        /* ── THEME VARIABLES ── */
        .view-root {
          --bg: #0a0d14;
          --bg-card: rgba(15, 20, 35, 0.8);
          --border: rgba(99, 102, 241, 0.15);
          --text: #e2e8f0;
          --text2: #94a3b8;
          --text-muted: #64748b;
          --meta-bg: rgba(99, 102, 241, 0.08);
          --meta-border: rgba(99, 102, 241, 0.2);
          --meta-color: #818cf8;
          --btn-ghost-bg: rgba(255,255,255,0.04);
          --btn-ghost-border: rgba(255,255,255,0.08);
          --btn-ghost-color: #94a3b8;
          --header-bg: rgba(255,255,255,0.02);
          --header-border: rgba(255,255,255,0.05);
          --line-num-color: #334155;
          --line-num-border: rgba(255,255,255,0.04);
          --code-color: #e2e8f0;
          --shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 24px 64px rgba(0, 0, 0, 0.5);
        }

        .view-root.light-mode {
          --bg: #f1f5fb;
          --bg-card: #ffffff;
          --border: rgba(99, 102, 241, 0.2);
          --text: #1e293b;
          --text2: #475569;
          --text-muted: #64748b;
          --meta-bg: rgba(99, 102, 241, 0.06);
          --meta-border: rgba(99, 102, 241, 0.15);
          --meta-color: #4f46e5;
          --btn-ghost-bg: #ffffff;
          --btn-ghost-border: rgba(0,0,0,0.1);
          --btn-ghost-color: #475569;
          --header-bg: rgba(0,0,0,0.02);
          --header-border: rgba(0,0,0,0.06);
          --line-num-color: #94a3b8;
          --line-num-border: rgba(0,0,0,0.06);
          --code-color: #1e293b;
          --shadow: 0 4px 24px rgba(99,102,241,0.08), 0 1px 4px rgba(0,0,0,0.06);
        }

        .view-root {
          min-height: 100vh;
          background: var(--bg);
          background-image:
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(99, 102, 241, 0.10) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 110%, rgba(139, 92, 246, 0.08) 0%, transparent 60%);
          font-family: 'Inter', sans-serif;
          color: var(--text);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 16px 48px;
          transition: background 0.3s, color 0.3s;
        }

        .view-nav {
          width: 100%;
          max-width: 900px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0 0;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .view-nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text);
        }

        .view-nav-logo-icon {
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .view-nav-logo-text {
          font-size: 15px;
          font-weight: 600;
          color: var(--text2);
        }

        .view-nav-logo-text span { color: #6366f1; }

        .view-theme-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 13px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--btn-ghost-bg);
          color: var(--btn-ghost-color);
          transition: all 0.2s;
        }

        .view-theme-toggle:hover {
          color: var(--text);
        }

        .view-nav-right {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .view-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .view-nav-btn.ghost {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.08);
          color: #94a3b8;
        }

        .view-nav-btn.ghost:hover {
          background: rgba(255,255,255,0.08);
          color: #cbd5e1;
        }

        .view-nav-btn.primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.25);
        }

        .view-nav-btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        /* Meta bar */
        .view-meta {
          width: 100%;
          max-width: 900px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }

        .view-meta-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .view-slug {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 500;
          color: #818cf8;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          padding: 6px 14px;
          border-radius: 8px;
        }

        .view-meta-pill {
          font-size: 12px;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .view-meta-pill svg { opacity: 0.6; }

        .view-copy-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: #64748b;
          transition: all 0.2s;
        }

        .view-copy-link-btn:hover {
          background: rgba(255,255,255,0.07);
          color: #94a3b8;
        }

        .view-copy-link-btn.copied {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.08);
          color: #6ee7b7;
        }

        /* Content card */
        .view-card {
          width: 100%;
          max-width: 900px;
          background: rgba(15, 20, 35, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.12);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 24px 64px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .view-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .view-card-dots {
          display: flex;
          gap: 7px;
        }

        .view-card-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .view-card-dot.red { background: #ef4444; }
        .view-card-dot.yellow { background: #f59e0b; }
        .view-card-dot.green { background: #10b981; }

        .view-card-label {
          font-size: 12px;
          font-weight: 500;
          color: #475569;
          font-family: 'JetBrains Mono', monospace;
        }

        .view-card-lines {
          font-size: 12px;
          color: #334155;
          font-family: 'JetBrains Mono', monospace;
        }

        .view-content-wrap {
          display: flex;
          overflow-x: auto;
        }

        /* Line numbers */
        .view-line-nums {
          min-width: 48px;
          padding: 24px 0 24px 16px;
          background: rgba(255,255,255,0.01);
          border-right: 1px solid rgba(255,255,255,0.04);
          user-select: none;
          flex-shrink: 0;
        }

        .view-line-num {
          display: block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          line-height: 1.7;
          color: #2d3748;
          text-align: right;
          padding-right: 10px;
        }

        pre.view-pre {
          margin: 0;
          flex: 1;
          padding: 24px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          line-height: 1.7;
          color: #cbd5e1;
          white-space: pre;
          overflow-x: auto;
          word-break: normal;
          min-height: 120px;
        }

        .view-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
          flex-wrap: wrap;
          gap: 12px;
        }

        .view-readonly-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 5px 12px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .view-copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-size: 13px;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
        }

        .view-copy-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(99, 102, 241, 0.45);
        }

        .view-copy-btn.copied {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }

        /* Loading */
        .view-loading {
          width: 100%;
          max-width: 900px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 80px 0;
          color: #475569;
        }

        .view-loading-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(99, 102, 241, 0.15);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* 404 */
        .view-404 {
          width: 100%;
          max-width: 540px;
          text-align: center;
          padding: 60px 24px;
          animation: fadeIn 0.3s ease;
        }

        .view-404-icon {
          font-size: 56px;
          margin-bottom: 20px;
          display: block;
        }

        .view-404 h2 {
          font-size: 24px;
          font-weight: 700;
          color: #e2e8f0;
          margin: 0 0 10px;
          letter-spacing: -0.02em;
        }

        .view-404 p {
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 28px;
        }

        .view-404-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .view-line-nums { display: none; }
          .view-card-footer { flex-direction: column; align-items: stretch; }
          .view-copy-btn { justify-content: center; }
        }
      `}</style>

      <div className={`view-root${isDark ? "" : " light-mode"}`}>
        {/* Nav */}
        <nav className="view-nav">
          <Link to="/" className="view-nav-logo">
            <div className="view-nav-logo-icon">📋</div>
            <span className="view-nav-logo-text">
              Smart<span>Learning</span>Plus
            </span>
          </Link>
          <div className="view-nav-right">
            <button
              onClick={toggleTheme}
              className="view-theme-toggle"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? "☀️ Light" : "🌙 Dark"}
            </button>
            <Link to="/paste" className="view-nav-btn primary" id="create-new-paste-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Paste
            </Link>
            <Link to="/" className="view-nav-btn ghost">
              ← Home
            </Link>
          </div>
        </nav>

        {loading && (
          <div className="view-loading">
            <div className="view-loading-spinner" />
            <span>Loading paste…</span>
          </div>
        )}

        {notFound && !loading && (
          <div className="view-404">
            <span className="view-404-icon">🔍</span>
            <h2>Paste not found</h2>
            <p>
              The link <strong style={{ color: "#818cf8", fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>{slug}</strong> doesn't exist.
              It may have been mistyped or the link might be incorrect.
            </p>
            <div className="view-404-actions">
              <Link to="/paste" className="view-nav-btn primary" style={{ textDecoration: "none" }}>
                Create a Paste
              </Link>
              <Link to="/" className="view-nav-btn ghost" style={{ textDecoration: "none" }}>
                Go Home
              </Link>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="view-404">
            <span className="view-404-icon">⚠️</span>
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <div className="view-404-actions">
              <button
                className="view-nav-btn primary"
                onClick={() => window.location.reload()}
                style={{ border: "none" }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {paste && !loading && (
          <>
            {/* Meta bar */}
            <div className="view-meta">
              <div className="view-meta-left">
                <span className="view-slug">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  /p/{paste.slug}
                </span>
                <span className="view-meta-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {formatDate(paste.created_at)}
                </span>
                <span className="view-meta-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {paste.char_count.toLocaleString()} chars · {lineCount.toLocaleString()} lines
                </span>
              </div>
              <button
                className={`view-copy-link-btn ${copiedLink ? "copied" : ""}`}
                onClick={handleCopyLink}
                id="copy-link-btn"
              >
                {copiedLink ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Link copied!
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    Copy link
                  </>
                )}
              </button>
            </div>

            {/* Content card */}
            <div className="view-card">
              <div className="view-card-header">
                <div className="view-card-dots">
                  <div className="view-card-dot red" />
                  <div className="view-card-dot yellow" />
                  <div className="view-card-dot green" />
                </div>
                <span className="view-card-label">{paste.slug}.txt</span>
                <span className="view-card-lines">{lineCount} lines</span>
              </div>

              <div className="view-content-wrap">
                <div className="view-line-nums" aria-hidden="true">
                  {paste.content.split("\n").map((_, i) => (
                    <span className="view-line-num" key={i}>{i + 1}</span>
                  ))}
                </div>
                <pre className="view-pre" id="paste-content">{paste.content}</pre>
              </div>

              <div className="view-card-footer">
                <span className="view-readonly-badge">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Read-only
                </span>
                <button
                  className={`view-copy-btn ${copied ? "copied" : ""}`}
                  onClick={handleCopyText}
                  id="copy-text-btn"
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Copied to clipboard!
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      Copy All Text
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
