import { Link } from "react-router-dom";

export default function Terms() {
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
        .legal-list { margin-left: 20px; margin-bottom: 12px; }
        .legal-list li { margin-bottom: 8px; }
      `}</style>

      <div className="sl-shell">
        {/* NAV */}
        <nav className="sl-nav">
          <Link to="/" className="sl-logo" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <img src="/logo.png?v=3" alt="Logo" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
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
          <h1 className="sl-section-title">Terms of Use</h1>

          <div className="sl-card">
            {/* Section 1: Acceptance of Terms */}
            <div className="legal-section">
              <h2 className="legal-heading">Acceptance of Terms</h2>
              <div className="legal-text">
                <p>
                  By accessing or using Smart Learning Plus, you agree to be bound by these Terms of Use and all 
                  applicable laws and regulations. If you do not agree with any of these terms, you are prohibited 
                  from using or accessing this site.
                </p>
              </div>
            </div>

            {/* Section 2: Acceptable Use */}
            <div className="legal-section">
              <h2 className="legal-heading">Acceptable Use</h2>
              <div className="legal-text">
                <p>You agree to use this site and any Sign In accounts responsibly and for their intended educational purposes. Specifically, you will not:</p>
                <ul className="legal-list">
                  <li>Upload, post, or distribute any content that is defamatory, obscene, or infringes on intellectual property rights</li>
                  <li>Engage in spam uploads or abuse the admin approval system</li>
                  <li>Use the platform for any commercial purpose or to solicit business</li>
                  <li>Attempt to gain unauthorized access to any portion of the site or its features</li>
                  <li>Interfere with or disrupt the site's operation, servers, or networks</li>
                </ul>
              </div>
            </div>

            {/* Section 3: Content As-Is */}
            <div className="legal-section">
              <h2 className="legal-heading">Content Provided "As-Is"</h2>
              <div className="legal-text">
                <p>
                  All content on Smart Learning Plus, including study materials, syllabi, and other resources, 
                  is provided "as-is" without warranty of any kind, either expressed or implied. We do not warrant 
                  that the content will be uninterrupted or error-free, or that defects will be corrected.
                </p>
              </div>
            </div>

            {/* Section 4: No Liability */}
            <div className="legal-section">
              <h2 className="legal-heading">Limitation of Liability</h2>
              <div className="legal-text">
                <p>
                  <strong>Smart Learning Plus shall not be liable for any academic outcomes</strong> (exam results, grades, 
                  academic standing, etc.) based on material found on this site. The platform is provided for educational 
                  convenience only, and users assume all risks associated with their academic decisions.
                </p>
                <p>
                  To the fullest extent permitted by law, in no event shall Smart Learning Plus, its creators, or 
                  administrators be liable for any indirect, incidental, special, or consequential damages arising out of 
                  or in connection with your use of or inability to use the platform.
                </p>
              </div>
            </div>

            {/* Section 5: Access Restriction */}
            <div className="legal-section">
              <h2 className="legal-heading">Access Restriction</h2>
              <div className="legal-text">
                <p>
                  We reserve the right, at our sole discretion, to terminate or suspend access to the site, 
                  including any Sign In accounts, for any reason, including but not limited to:
                </p>
                <ul className="legal-list">
                  <li>Violation of these Terms of Use</li>
                  <li>Spam uploads or abuse of the contribution system</li>
                  <li>Misuse of admin approval features</li>
                  <li>Any conduct that we believe is harmful to the platform or other users</li>
                </ul>
              </div>
            </div>

            {/* Section 6: Changes to Terms */}
            <div className="legal-section">
              <h2 className="legal-heading">Changes to Terms</h2>
              <div className="legal-text">
                <p>
                  We may revise these Terms of Use at any time without notice. By using this site, you agree to be 
                  bound by the current version of these terms as posted on the site.
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