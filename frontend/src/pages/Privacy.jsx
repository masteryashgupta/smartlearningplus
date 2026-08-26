import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#f5f7ff] text-[#0f172a] font-sans">
      {/* SCOPED CSS STYLES */}
      <style>{`
        .sl-shell { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
        .sl-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 0; position: relative; z-index: 5;
        }
        .sl-logo { display:flex; align-items:center; gap:10px; font-weight:800; font-size:17px; color: var(--text); }
        .sl-nav-links { display:flex; gap:28px; font-size:14px; font-weight:600; color: var(--muted); }
        .sl-nav-links a { color: inherit; text-decoration:none; transition:.2s; }
        .sl-nav-links a:hover { color: var(--accent); }
        @media (max-width:680px){ .sl-nav-links{ display:none; } }
        
        .sl-card {
          background: var(--surface); border:1px solid var(--border);
          border-radius: 18px; padding: 28px;
          transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s, border-color .3s;
        }
        .sl-section-title { font-size: 30px; font-weight: 800; color: #1e3a8a; letter-spacing:-0.02em; margin-bottom: 34px; }
        .sl-section { padding: 10px 0 60px; }
        .sl-footer { text-align:center; padding: 30px 0 50px; color: var(--muted); font-size: 13.5px; }
        .sl-footer a { color: var(--accent); text-decoration:none; }
        .sl-footer a:hover { text-decoration:underline; }
        
        .legal-section { margin-bottom: 32px; }
        .legal-heading { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .legal-text { font-size: 14px; line-height: 1.65; color: #334155; }
        .legal-text p { margin-bottom: 12px; }
        .legal-link { color: #2563eb; text-decoration:none; }
        .legal-link:hover { text-decoration:underline; }
      `}</style>

      <div className="sl-shell">
        {/* NAV */}
        <nav className="sl-nav">
          <Link to="/" className="sl-logo" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <img src="/logo.png?v=4" alt="Logo" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} />
            Smart Learning
            <span style={{ color: "#2563eb" }}>+</span>
          </Link>
          <div className="sl-nav-links">
            <Link to="/">Home</Link>
            <Link to="/disclaimer">Disclaimer</Link>
            <Link to="/terms">Terms of Use</Link>
            <Link to="/privacy">Privacy Note</Link>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <section className="sl-section">
          <div className="sl-eyebrow-sm" style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1.4px", textTransform: "uppercase", color: "#2563eb", marginBottom: "8px" }}>
            Legal Information
          </div>
          <h1 className="sl-section-title">Privacy Note</h1>

          <div className="sl-card">
            {/* Section 1: Data Collection */}
            <div className="legal-section">
              <h2 className="legal-heading">Data We Collect</h2>
              <div className="legal-text">
                <p>
                  We collect minimal information necessary for the platform to function:
                </p>
                <ul style={{ marginLeft: "20px", marginBottom: "12px" }}>
                  <li style={{ marginBottom: "8px" }}><strong>Email address</strong> - Used for Sign In authentication and account recovery</li>
                  <li style={{ marginBottom: "8px" }}><strong>Telegram ID</strong> - Used for optional Telegram bot integration (attendance notifications, reminders)</li>
                  <li style={{ marginBottom: "8px" }}><strong>Basic profile data</strong> - Name, batch, and study preferences for personalization</li>
                </ul>
              </div>
            </div>

            {/* Section 2: Purpose */}
            <div className="legal-section">
              <h2 className="legal-heading">Why We Collect It</h2>
              <div className="legal-text">
                <p>
                  All collected data serves a specific educational purpose:
                </p>
                <ul style={{ marginLeft: "20px", marginBottom: "12px" }}>
                  <li style={{ marginBottom: "8px" }}>Email enables secure account access and password reset functionality</li>
                  <li style={{ marginBottom: "8px" }}>Telegram integration provides optional attendance tracking and study reminders</li>
                  <li style={{ marginBottom: "8px" }}>Profile data helps personalize your dashboard experience</li>
                </ul>
              </div>
            </div>

            {/* Section 3: No Sharing */}
            <div className="legal-section">
              <h2 className="legal-heading">Data Sharing & Third Parties</h2>
              <div className="legal-text">
                <p>
                  <strong>We do not sell, trade, or share your personal data</strong> with any third parties, 
                  except as required by law or to provide core platform functionality (such as the Telegram bot integration).
                </p>
                <p>
                  Your information is used solely for operating Smart Learning Plus and improving the student experience.
                </p>
              </div>
            </div>

            {/* Section 4: Data Deletion */}
            <div className="legal-section">
              <h2 className="legal-heading">Account & Data Deletion</h2>
              <div className="legal-text">
                <p>
                  You may request deletion of your account and associated data at any time. To do so, please use the 
                  <a href="#contact" onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('openContactModal'));
                  }} className="legal-link" style={{ cursor: "pointer" }}> Contact</a> feature. 
                  We will process deletion requests promptly and remove your data from our systems.
                </p>
              </div>
            </div>

            {/* Section 5: Cookies */}
            <div className="legal-section">
              <h2 className="legal-heading">Cookies & Local Storage</h2>
              <div className="legal-text">
                <p>
                  The platform uses minimal cookies and browser local storage to maintain your session and preferences. 
                  No tracking or analytics cookies are used.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="sl-footer">
          <p className="text-xs text-muted font-medium" style={{ marginBottom: "8px" }}>
            © {new Date().getFullYear()} Smart Learning Plus
          </p>
          <p className="text-xs text-muted" style={{ marginBottom: "12px" }}>
            Smart Learning Plus is an independent, non-commercial student resource. Not affiliated with or endorsed by any institution.
          </p>
          <p className="text-xs" style={{ color: "#64748b" }}>
            <Link to="/disclaimer" className="sl-footer-link">Disclaimer</Link> |{" "}
            <Link to="/terms" className="sl-footer-link">Terms of Use</Link> |{" "}
            <Link to="/privacy" className="sl-footer-link">Privacy Note</Link> |{" "}
            <a href="#contact" onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('openContactModal'));
            }} className="sl-footer-link" style={{ cursor: "pointer" }}>
              Contact
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}