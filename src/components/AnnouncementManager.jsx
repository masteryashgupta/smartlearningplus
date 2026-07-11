import { useEffect, useState } from "react";
import { api } from "../api.js";

/**
 * AnnouncementManager — admin tab for managing the Live Announcement Bar.
 * Rendered inside AdminPanel under Communications group.
 */
export default function AnnouncementManager() {
  const [text, setText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [scrollSpeed, setScrollSpeed] = useState(45);
  const [gap, setGap] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "success"|"error", text }
  const [updatedAt, setUpdatedAt] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);

  const MAX = 300;
  const remaining = MAX - text.length;

  // Fetch current announcement from admin endpoint
  useEffect(() => {
    setLoading(true);
    api
      .get("/announcement")
      .then(({ data }) => {
        setText(data.text || "");
        setIsActive(data.isActive !== false);
        setScrollSpeed(data.scrollSpeed || 45);
        setGap(data.gap || 20);
        setUpdatedAt(data.updatedAt || null);
        setUpdatedBy(data.updatedBy || null);
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load announcement data." }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (text.length > MAX) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/announcement", { text: text.trim(), isActive, scrollSpeed, gap });
      setMessage({ type: "success", text: "Announcement updated successfully! Changes are live instantly." });
      // Refresh updatedAt
      const { data } = await api.get("/announcement");
      setUpdatedAt(data.updatedAt);
      setUpdatedBy(data.updatedBy);
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.error || "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Clear the announcement bar text? This will hide the bar site-wide.")) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/announcement", { text: "", isActive: false, scrollSpeed, gap });
      setText("");
      setIsActive(false);
      setMessage({ type: "success", text: "Announcement cleared and bar hidden." });
    } catch {
      setMessage({ type: "error", text: "Failed to clear." });
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const spacesPreview = "\u00A0".repeat(gap);
  const repeatedPreview = text ? `${text}${spacesPreview}·${spacesPreview}${text}${spacesPreview}·${spacesPreview}` : "";

  return (
    <div style={{ maxWidth: 680 }}>
      <style>{`
        .ann-mgr h2 { font-size:1.25rem; font-weight:700; margin:0 0 4px; color:#1e293b; }
        .ann-mgr .subtitle { font-size:0.85rem; color:#64748b; margin:0 0 24px; }
        .ann-mgr .field-label {
          display:flex; align-items:center; justify-content:space-between;
          font-size:0.8rem; font-weight:600; color:#475569;
          text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px;
        }
        .ann-mgr .char-count {
          font-size:0.78rem; font-weight:500;
          color: ${remaining < 30 ? "#ef4444" : remaining < 80 ? "#f59e0b" : "#94a3b8"};
          transition: color .2s;
        }
        .ann-mgr textarea {
          width:100%; box-sizing:border-box;
          border: 1.5px solid #e2e8f0; border-radius:10px;
          padding:12px 14px; font-size:14px; line-height:1.6;
          resize:vertical; min-height:100px; max-height:240px;
          font-family:inherit; color:#1e293b; background:#fff;
          transition:border-color .2s, box-shadow .2s;
          outline:none;
        }
        .ann-mgr textarea:focus {
          border-color:#2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        .ann-mgr .toggle-row {
          display:flex; align-items:center; gap:12px;
          margin:18px 0;
          padding:14px 16px;
          background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px;
        }
        .ann-mgr .toggle-row label { font-size:14px; font-weight:600; color:#334155; flex:1; cursor:pointer; }
        .ann-mgr .toggle-row small { font-size:12px; color:#94a3b8; display:block; font-weight:400; }
        /* iOS-style toggle */
        .ann-toggle { position:relative; width:44px; height:24px; flex-shrink:0; }
        .ann-toggle input { opacity:0; width:0; height:0; position:absolute; }
        .ann-toggle .slider {
          position:absolute; inset:0; border-radius:12px;
          background:#cbd5e1; transition:background .25s;
          cursor:pointer;
        }
        .ann-toggle .slider:before {
          content:""; position:absolute;
          width:18px; height:18px; border-radius:50%;
          left:3px; top:3px; background:#fff;
          box-shadow:0 1px 4px rgba(0,0,0,.25);
          transition:transform .25s;
        }
        .ann-toggle input:checked + .slider { background:#2563eb; }
        .ann-toggle input:checked + .slider:before { transform:translateX(20px); }

        .ann-mgr .preview-box {
          border-radius:10px;
          overflow:hidden;
          margin: 0 0 20px;
          border:1.5px solid #e2e8f0;
        }
        .ann-mgr .preview-label {
          font-size:11px; font-weight:700; letter-spacing:.08em;
          text-transform:uppercase; padding:6px 12px;
          background:#f1f5f9; color:#64748b; border-bottom:1px solid #e2e8f0;
        }
        .ann-mgr .preview-bar {
          height:36px; display:flex; align-items:center;
          background: linear-gradient(90deg,#2563eb,#7c3aed 50%,#06b6d4);
          overflow:hidden; position:relative;
        }
        .ann-mgr .preview-bar .preview-badge {
          flex-shrink:0; padding:0 10px; font-size:11px; font-weight:700;
          letter-spacing:.07em; text-transform:uppercase; color:#fff;
          border-right:1px solid rgba(255,255,255,.3); height:100%;
          display:flex; align-items:center; gap:5px;
          background:rgba(0,0,0,.12);
          white-space:nowrap;
        }
        .ann-mgr .preview-bar .preview-text {
          flex:1; overflow:hidden; color:#fff; font-size:13px;
          font-weight:500; padding:0 16px; white-space:nowrap;
          text-overflow:ellipsis;
        }
        .ann-mgr .btn-row { display:flex; gap:10px; flex-wrap:wrap; margin-top:20px; }
        .ann-mgr .btn {
          padding:10px 22px; border-radius:8px; border:none; cursor:pointer;
          font-size:14px; font-weight:600; transition:all .18s; outline:none;
          display:inline-flex; align-items:center; gap:6px;
        }
        .ann-mgr .btn:disabled { opacity:.6; cursor:not-allowed; }
        .ann-mgr .btn-primary { background:#2563eb; color:#fff; }
        .ann-mgr .btn-primary:hover:not(:disabled) { background:#1d4ed8; transform:translateY(-1px); box-shadow:0 4px 12px rgba(37,99,235,.3); }
        .ann-mgr .btn-danger { background:#fff; color:#ef4444; border:1.5px solid #fca5a5; }
        .ann-mgr .btn-danger:hover:not(:disabled) { background:#fef2f2; }
        .ann-mgr .msg {
          padding:11px 16px; border-radius:8px; font-size:13px; font-weight:500;
          margin-bottom:16px; display:flex; align-items:center; gap:8px;
        }
        .ann-mgr .msg-success { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
        .ann-mgr .msg-error   { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .ann-mgr .meta { font-size:12px; color:#94a3b8; margin-top:16px; }
        .ann-mgr .meta span { color:#64748b; font-weight:500; }
        .ann-mgr .tips {
          margin-top:20px; padding:14px 16px;
          background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px;
        }
        .ann-mgr .tips-title { font-size:12px; font-weight:700; color:#1d4ed8; margin:0 0 6px; }
        .ann-mgr .tips ul { margin:0; padding-left:18px; }
        .ann-mgr .tips li { font-size:12px; color:#3b82f6; margin-bottom:3px; }
        .ann-mgr .setting-group {
          background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px;
          padding:16px; margin: 18px 0;
        }
        .ann-mgr .setting-title { font-size:13px; font-weight:700; color:#475569; text-transform:uppercase; margin-bottom:12px; }
        .ann-mgr .slider-col { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .ann-mgr .slider-label { display:flex; justify-content:space-between; font-size:14px; font-weight:600; color:#334155; }
        .ann-mgr .slider-desc { font-size:11px; color:#64748b; }
        .ann-mgr input[type="range"] { -webkit-appearance:none; width:100%; height:6px; border-radius:3px; background:#cbd5e1; outline:none; margin: 8px 0; }
        .ann-mgr input[type="range"]::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:#2563eb; cursor:pointer; transition:transform 0.1s; }
        .ann-mgr input[type="range"]::-webkit-slider-thumb:hover { transform:scale(1.2); }
      `}</style>

      <div className="ann-mgr">
        <h2>📣 Live Announcement Bar</h2>
        <p className="subtitle">
          Manage the scrolling announcement ticker that appears at the top of every page.
          Changes go live instantly — no reload needed by visitors.
        </p>

        {loading ? (
          <div style={{ color: "#94a3b8", padding: "24px 0", textAlign: "center" }}>Loading announcement data…</div>
        ) : (
          <>
            {/* Live preview */}
            {text && (
              <div className="preview-box">
                <div className="preview-label">📺 Live Preview</div>
                <div className="preview-bar" style={{ opacity: isActive ? 1 : 0.45 }}>
                  <div className="preview-badge">
                    <span>📢</span> Live
                  </div>
                  <div className="preview-text" style={{ whiteSpace: "pre" }}>{repeatedPreview}</div>
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <div className={`msg msg-${message.type}`}>
                <span>{message.type === "success" ? "✅" : "⚠️"}</span>
                {message.text}
              </div>
            )}

            {/* Text field */}
            <div className="field-label">
              <span>Announcement Text</span>
              <span className="char-count">{remaining} characters left</span>
            </div>
            <textarea
              value={text}
              maxLength={MAX}
              onChange={(e) => {
                setText(e.target.value);
                setMessage(null);
              }}
              placeholder="Enter the announcement text that will scroll across the top of the site… (max 300 chars)"
              spellCheck
            />

            {/* Marquee Customizer settings */}
            <div className="setting-group">
              <div className="setting-title">⚙️ Marquee Style Customizer</div>
              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                <div className="slider-col">
                  <div className="slider-label">
                    <span>Scroll Duration</span>
                    <span style={{ color: "#2563eb" }}>{scrollSpeed}s</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={scrollSpeed}
                    onChange={(e) => {
                      setScrollSpeed(parseInt(e.target.value, 10));
                      setMessage(null);
                    }}
                  />
                  <span className="slider-desc">Lower = Faster (e.g. 15s), Higher = Slower (e.g. 60s).</span>
                </div>

                <div className="slider-col">
                  <div className="slider-label">
                    <span>Repetition Gap</span>
                    <span style={{ color: "#2563eb" }}>{gap} spaces</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    value={gap}
                    onChange={(e) => {
                      setGap(parseInt(e.target.value, 10));
                      setMessage(null);
                    }}
                  />
                  <span className="slider-desc">Space separation between scrolled text repeats.</span>
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div className="toggle-row">
              <label htmlFor="ann-active-toggle">
                Show announcement bar
                <small>
                  {isActive
                    ? "Bar is visible to all visitors right now"
                    : "Bar is hidden site-wide — save to apply"}
                </small>
              </label>
              <label className="ann-toggle">
                <input
                  id="ann-active-toggle"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>

            {/* Action buttons */}
            <div className="btn-row">
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || text.length > MAX}
              >
                {saving ? "⏳ Saving…" : "💾 Save & Publish"}
              </button>
              <button
                className="btn btn-danger"
                onClick={handleClear}
                disabled={saving}
              >
                🗑️ Clear & Hide
              </button>
            </div>

            {/* Last updated meta */}
            {updatedAt && (
              <div className="meta">
                Last updated: <span>{fmtDate(updatedAt)}</span>
                {updatedBy && <> &nbsp;·&nbsp; By: <span>{updatedBy}</span></>}
              </div>
            )}

            {/* Tips */}
            <div className="tips">
              <p className="tips-title">💡 Tips</p>
              <ul>
                <li>Keep announcements short and impactful — best under 120 characters.</li>
                <li>Pause the bar by hovering over it (users can do this too).</li>
                <li>Toggle off to hide the bar without erasing the text — useful to re-enable quickly.</li>
                <li>Visitors can close the bar for their session using the ✕ button.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
