import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

const MAX_CHARS = 200000;

export default function PastePage() {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { slug, url } on success
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const charCount = content.length;
  const charPercent = Math.min((charCount / MAX_CHARS) * 100, 100);

  const handleSave = async () => {
    if (!content.trim()) {
      setError("Please paste or type some text before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await api.post("/paste", { content });
      setResult(data);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to save. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = useCallback(async () => {
    if (!result) return;
    const fullUrl = `${window.location.origin}/${result.slug}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = fullUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [result]);

  const handleReset = () => {
    setContent("");
    setResult(null);
    setError(null);
    setCopied(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const fullLink = result ? `${window.location.origin}/${result.slug}` : "";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .paste-root {
          min-height: 100vh;
          background: #0a0d14;
          background-image:
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(99, 102, 241, 0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 110%, rgba(139, 92, 246, 0.10) 0%, transparent 60%);
          font-family: 'Inter', sans-serif;
          color: #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 16px 48px;
        }

        .paste-nav {
          width: 100%;
          max-width: 900px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0 0;
          margin-bottom: 40px;
        }

        .paste-nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #e2e8f0;
        }

        .paste-nav-logo-icon {
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .paste-nav-logo-text {
          font-size: 15px;
          font-weight: 600;
          color: #94a3b8;
        }

        .paste-nav-logo-text span {
          color: #6366f1;
        }

        .paste-nav-badge {
          font-size: 11px;
          font-weight: 600;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #818cf8;
          padding: 4px 10px;
          border-radius: 100px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .paste-hero {
          text-align: center;
          margin-bottom: 36px;
        }

        .paste-hero-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6366f1;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          padding: 5px 14px;
          border-radius: 100px;
          margin-bottom: 18px;
        }

        .paste-hero h1 {
          font-size: clamp(28px, 5vw, 44px);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 12px;
          line-height: 1.15;
          background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .paste-hero h1 .accent {
          background: linear-gradient(135deg, #6366f1, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .paste-hero p {
          font-size: 15px;
          color: #64748b;
          margin: 0;
          line-height: 1.6;
        }

        .paste-card {
          width: 100%;
          max-width: 900px;
          background: rgba(15, 20, 35, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 24px 64px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
        }

        .paste-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .paste-card-dots {
          display: flex;
          gap: 7px;
        }

        .paste-card-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .paste-card-dot.red { background: #ef4444; }
        .paste-card-dot.yellow { background: #f59e0b; }
        .paste-card-dot.green { background: #10b981; }

        .paste-card-title {
          font-size: 12px;
          font-weight: 500;
          color: #475569;
          font-family: 'JetBrains Mono', monospace;
        }

        .paste-char-info {
          font-size: 12px;
          color: #475569;
          font-family: 'JetBrains Mono', monospace;
        }

        .paste-char-info.warning { color: #f59e0b; }
        .paste-char-info.danger { color: #ef4444; }

        textarea.paste-textarea {
          width: 100%;
          min-height: 420px;
          background: transparent;
          border: none;
          outline: none;
          padding: 24px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          line-height: 1.7;
          color: #cbd5e1;
          resize: vertical;
          box-sizing: border-box;
          caret-color: #6366f1;
          tab-size: 2;
        }

        textarea.paste-textarea::placeholder {
          color: #334155;
        }

        .paste-progress-bar {
          height: 2px;
          background: rgba(255,255,255,0.04);
          margin: 0 24px;
        }

        .paste-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          border-radius: 2px;
          transition: width 0.2s ease;
        }

        .paste-progress-fill.warning { background: linear-gradient(90deg, #f59e0b, #f97316); }
        .paste-progress-fill.danger { background: #ef4444; }

        .paste-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
          gap: 12px;
          flex-wrap: wrap;
        }

        .paste-footer-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #475569;
        }

        .paste-footer-left svg {
          opacity: 0.6;
        }

        .paste-save-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 28px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-size: 14px;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.35);
        }

        .paste-save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(99, 102, 241, 0.5);
        }

        .paste-save-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .paste-save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .paste-error {
          width: 100%;
          max-width: 900px;
          margin-top: 16px;
          padding: 14px 18px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 12px;
          color: #fca5a5;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* ── Success state ── */
        .paste-success {
          width: 100%;
          max-width: 900px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
        }

        .paste-success-card {
          width: 100%;
          background: rgba(15, 20, 35, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 20px;
          padding: 40px 32px;
          text-align: center;
          animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .paste-success-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
          border: 2px solid rgba(99, 102, 241, 0.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin: 0 auto 20px;
          animation: pulse-ring 2s ease-in-out infinite;
        }

        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 0 12px rgba(99, 102, 241, 0); }
        }

        .paste-success-title {
          font-size: 22px;
          font-weight: 700;
          color: #e2e8f0;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }

        .paste-success-subtitle {
          font-size: 14px;
          color: #64748b;
          margin: 0 0 28px;
        }

        .paste-link-box {
          display: flex;
          align-items: center;
          gap: 0;
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.25);
          border-radius: 14px;
          overflow: hidden;
          max-width: 520px;
          margin: 0 auto 24px;
        }

        .paste-link-text {
          flex: 1;
          padding: 14px 18px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 500;
          color: #a5b4fc;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          text-align: left;
        }

        .paste-link-copy-btn {
          padding: 14px 18px;
          background: rgba(99, 102, 241, 0.15);
          border: none;
          border-left: 1px solid rgba(99, 102, 241, 0.2);
          color: #818cf8;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .paste-link-copy-btn:hover {
          background: rgba(99, 102, 241, 0.25);
          color: #c7d2fe;
        }

        .paste-link-copy-btn.copied {
          background: rgba(16, 185, 129, 0.15);
          color: #6ee7b7;
          border-left-color: rgba(16, 185, 129, 0.2);
        }

        .paste-action-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .paste-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .paste-action-btn.primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
        }

        .paste-action-btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
        }

        .paste-action-btn.ghost {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.08);
          color: #94a3b8;
        }

        .paste-action-btn.ghost:hover {
          background: rgba(255,255,255,0.08);
          color: #cbd5e1;
        }

        .paste-tips {
          width: 100%;
          max-width: 900px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          margin-top: 8px;
        }

        .paste-tip {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .paste-tip-icon {
          font-size: 18px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .paste-tip-text {
          font-size: 12px;
          color: #475569;
          line-height: 1.5;
        }

        .paste-tip-text strong {
          display: block;
          color: #64748b;
          margin-bottom: 2px;
          font-size: 12px;
        }

        /* Spinner */
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .paste-card-footer {
            flex-direction: column;
            align-items: stretch;
          }
          .paste-save-btn {
            justify-content: center;
            width: 100%;
          }
          .paste-nav {
            margin-bottom: 24px;
          }
        }
      `}</style>

      <div className="paste-root">
        {/* Nav */}
        <nav className="paste-nav">
          <Link to="/" className="paste-nav-logo">
            <div className="paste-nav-logo-icon">📋</div>
            <span className="paste-nav-logo-text">
              Smart<span>Learning</span>Plus
            </span>
          </Link>
          <span className="paste-nav-badge">QuickPaste</span>
        </nav>

        {!result ? (
          <>
            {/* Hero */}
            <div className="paste-hero">
              <div className="paste-hero-label">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="#6366f1" strokeWidth="1.5"/>
                  <path d="M6 3.5v3l1.5 1.5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Instant • Anonymous • Permanent
              </div>
              <h1>
                Paste. Save. <span className="accent">Share.</span>
              </h1>
              <p>
                Paste any text, get a short memorable link instantly.
                <br />No account needed — just type and share.
              </p>
            </div>

            {/* Editor card */}
            <div className="paste-card">
              <div className="paste-card-header">
                <div className="paste-card-dots">
                  <div className="paste-card-dot red" />
                  <div className="paste-card-dot yellow" />
                  <div className="paste-card-dot green" />
                </div>
                <span className="paste-card-title">new-paste.txt</span>
                <span
                  className={`paste-char-info ${
                    charPercent > 90 ? "danger" : charPercent > 70 ? "warning" : ""
                  }`}
                >
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>

              <textarea
                ref={textareaRef}
                className="paste-textarea"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Paste or type your text here…&#10;&#10;All formatting, spaces, and line breaks are preserved exactly as you type them."
                autoFocus
                maxLength={MAX_CHARS}
                spellCheck={false}
              />

              <div className="paste-progress-bar">
                <div
                  className={`paste-progress-fill ${
                    charPercent > 90 ? "danger" : charPercent > 70 ? "warning" : ""
                  }`}
                  style={{ width: `${charPercent}%` }}
                />
              </div>

              <div className="paste-card-footer">
                <div className="paste-footer-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2"/>
                  </svg>
                  Shareable link · Read-only for viewers
                </div>
                <button
                  className="paste-save-btn"
                  onClick={handleSave}
                  disabled={saving || charCount === 0}
                  id="paste-save-btn"
                >
                  {saving ? (
                    <>
                      <div className="spinner" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Save &amp; Publish
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="paste-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Tips */}
            <div className="paste-tips">
              <div className="paste-tip">
                <span className="paste-tip-icon">🔗</span>
                <div className="paste-tip-text">
                  <strong>Memorable Links</strong>
                  Gets a short link like <em>swift-tiger-07</em> — easy to share or type
                </div>
              </div>
              <div className="paste-tip">
                <span className="paste-tip-icon">🔒</span>
                <div className="paste-tip-text">
                  <strong>Anonymous & Instant</strong>
                  No account, no email. Just paste and share
                </div>
              </div>
              <div className="paste-tip">
                <span className="paste-tip-icon">📐</span>
                <div className="paste-tip-text">
                  <strong>Exact Formatting</strong>
                  All spaces, indents and line breaks are preserved perfectly
                </div>
              </div>
              <div className="paste-tip">
                <span className="paste-tip-icon">♾️</span>
                <div className="paste-tip-text">
                  <strong>Permanent</strong>
                  Once saved, your link works forever — immutable and reliable
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Success state */
          <div className="paste-success">
            <div className="paste-success-card">
              <div className="paste-success-icon">✓</div>
              <h2 className="paste-success-title">Your paste is live!</h2>
              <p className="paste-success-subtitle">
                Share this link with anyone — they can view and copy your text instantly.
              </p>

              <div className="paste-link-box">
                <span className="paste-link-text">{fullLink}</span>
                <button
                  className={`paste-link-copy-btn ${copied ? "copied" : ""}`}
                  onClick={handleCopyLink}
                  id="paste-copy-link-btn"
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>
              </div>

              <div className="paste-action-row">
                <a
                  href={`/${result.slug}`}
                  className="paste-action-btn primary"
                  target="_blank"
                  rel="noopener noreferrer"
                  id="paste-open-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  Open Link
                </a>
                <button
                  className="paste-action-btn ghost"
                  onClick={handleReset}
                  id="paste-new-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  New Paste
                </button>
                <Link to="/" className="paste-action-btn ghost" id="paste-home-btn">
                  ← Home
                </Link>
              </div>
            </div>

            <div className="paste-tips">
              <div className="paste-tip">
                <span className="paste-tip-icon">💡</span>
                <div className="paste-tip-text">
                  <strong>Tip</strong>
                  Bookmark your link! Once you leave this page, you cannot edit the paste
                </div>
              </div>
              <div className="paste-tip">
                <span className="paste-tip-icon">📤</span>
                <div className="paste-tip-text">
                  <strong>Share anywhere</strong>
                  WhatsApp, email, Telegram — the link works everywhere
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
