import { Link } from "react-router-dom";

export default function Disclaimer() {
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
          <h1 className="sl-section-title">Disclaimer & About</h1>

          <div className="sl-card">
            {/* Section A: About This Platform */}
            <div className="legal-section">
              <h2 className="legal-heading">About This Platform</h2>
              <div className="legal-text">
                <p>
                  Smart Learning Plus is an independent, free, non-commercial resource built by a student, for students. 
                  This platform is created to help engineering students access study materials, track attendance, 
                  and navigate their academic journey more effectively.
                </p>
                <p>
                  <strong>Important:</strong> This platform has no affiliation with Rajasthan Technical University (RTU), 
                  any college, university, or educational institution. All content is provided voluntarily by the community 
                  and should be used as a supplementary resource only.
                </p>
              </div>
            </div>

            {/* Section B: Content Ownership & Copyright */}
            <div className="legal-section">
              <h2 className="legal-heading">Content Ownership & Copyright</h2>
              <div className="legal-text">
                <p>
                  Syllabus PDFs, scheme documents, and similar university materials belong to their respective 
                  original sources, including RTU and its publishers. These materials are shared on this platform solely 
                  for educational reference purposes.
                </p>
                <p>
                  All such content is provided "as-is" and is not intended for commercial redistribution. We respect 
                  the intellectual property rights of the original creators and encourage users to refer to 
                  university sources for the most authoritative and up-to-date information.
                </p>
              </div>
            </div>

            {/* Section C: User-Contributed Content */}
            <div className="legal-section">
              <h2 className="legal-heading">User-Contributed Content</h2>
              <div className="legal-text">
                <p>
                  Students can upload study material through the contribution system. When content is submitted, it goes 
                  through an admin approval process. This approval is solely a quality and relevance check — it does 
                  NOT imply ownership verification or endorsement of the content's originality.
                </p>
                <p>
                  <strong>The uploader is solely responsible</strong> for ensuring they have the right to share any 
                  content they upload. By submitting material, users confirm that it is their own work or that they have 
                  obtained proper permission to share it.
                </p>
              </div>
            </div>

            {/* Section D: AI Assistant Disclaimer */}
            <div className="legal-section">
              <h2 className="legal-heading">AI Assistant Disclaimer</h2>
              <div className="legal-text">
                <p>
                  The SmartAI/RAG-based assistant may generate inaccurate, incomplete, or outdated answers. While we strive 
                  to provide helpful information, the AI should not be relied upon as the sole source of academic truth.
                </p>
                <p>
                  <strong>Always verify important academic information</strong> from university sources such as your 
                  course syllabus, professor's notes, or university publications before making academic decisions.
                </p>
              </div>
            </div>

            {/* Section E: No Guarantee of Accuracy */}
            <div className="legal-section">
              <h2 className="legal-heading">No Guarantee of Accuracy</h2>
              <div className="legal-text">
                <p>
                  Syllabus and scheme content may change over time as the university updates its curriculum. While we make 
                  efforts to keep materials current, Smart Learning Plus does not guarantee that all content is always 
                  up to date or completely accurate.
                </p>
                <p>
                  Users should always cross-reference with university publications and consult with their academic 
                  advisors for the most current information.
                </p>
              </div>
            </div>

            {/* Copyright Takedown Notice */}
            <div className="legal-section" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "24px", marginTop: "8px" }}>
              <h2 className="legal-heading">Copyright Takedown Requests</h2>
              <div className="legal-text">
                <p>
                  If you believe any content on this platform infringes your copyright, please report it through the 
                  <Link to="/" state={{ contactTakedown: true }} className="legal-link"> Contact</Link> feature. 
                  We will review all takedown requests promptly and remove any infringing content as appropriate.
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
              // Dispatch custom event to open contact modal
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