import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function ToolsPage() {
  const tools = [
    {
      id: "quickpaste",
      title: "QuickPaste",
      tagline: "Instant Anonymous Text Sharing",
      description: "Paste any text or code snippet and generate a clean, memorable short link instantly. No account required.",
      icon: "📋",
      badge: "Free & Instant",
      path: "/paste",
      color: "from-indigo-500 to-purple-600",
      features: ["Custom Links", "Auto-Copy on Visit", "Expiry Timer", "Read-Only Viewer"]
    },
    {
      id: "wheel",
      title: "Spin Wheel / Random Picker",
      tagline: "Fair & Interactive Random Chooser",
      description: "Create customizable spinning decision wheels for raffles, student names, giveaways, tasks, and quick picks. Features custom weights, sound effects, fairness testing, and elimination mode.",
      icon: "🎡",
      badge: "Interactive Tool",
      path: "/wheel",
      color: "from-amber-500 to-emerald-500",
      features: ["Weighted Entries", "Elimination Mode", "Web Audio Sounds", "Fairness Simulator", "Shareable Wheels"]
    }
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap');

        .tools-root {
          min-height: 100vh;
          background: #FAFAF8;
          background-image:
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(99, 102, 241, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 110%, rgba(16, 185, 129, 0.06) 0%, transparent 60%);
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 16px 64px;
          transition: background 0.3s ease, color 0.3s ease;
        }

        /* ── DARK THEME SUPPORT ── */
        html.dark .tools-root {
          background: #0f172a;
          background-image:
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(99, 102, 241, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 110%, rgba(16, 185, 129, 0.10) 0%, transparent 60%);
          color: #f8fafc;
        }

        .tools-nav {
          width: 100%;
          max-width: 1000px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0;
          margin-bottom: 32px;
        }

        .tools-nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #1e293b;
        }

        .tools-nav-logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #fff;
          box-shadow: 0 4px 12px rgba(99,102,241,0.25);
        }

        .tools-nav-logo-text {
          font-size: 17px;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          color: #0f172a;
          transition: color 0.2s;
        }

        .tools-nav-logo-text span { color: #6366f1; }

        html.dark .tools-nav-logo-text {
          color: #f8fafc;
        }

        .tools-nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tools-nav-link {
          text-decoration: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 34px;
        }

        .tools-nav-link:hover {
          color: #4f46e5;
          border-color: #c7d2fe;
          background: #f8fafc;
        }

        html.dark .tools-nav-link {
          background: #1e293b;
          border-color: #334155;
          color: #94a3b8;
        }

        html.dark .tools-nav-link:hover {
          background: #334155;
          border-color: #6366f1;
          color: #818cf8;
        }

        .tools-hero {
          text-align: center;
          max-width: 640px;
          margin-bottom: 48px;
        }

        .tools-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 100px;
          font-size: 12px;
          font-weight: 700;
          color: #4f46e5;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: all 0.2s;
        }

        html.dark .tools-hero-badge {
          background: rgba(99, 102, 241, 0.18);
          border-color: rgba(99, 102, 241, 0.35);
          color: #a5b4fc;
        }

        .tools-hero-title {
          font-size: 36px;
          font-weight: 800;
          font-family: 'Space Grotesk', sans-serif;
          color: #0f172a;
          margin: 0 0 12px;
          letter-spacing: -0.02em;
          transition: color 0.2s;
        }

        html.dark .tools-hero-title {
          color: #f8fafc;
        }

        .tools-hero-desc {
          font-size: 15px;
          color: #64748b;
          line-height: 1.6;
          margin: 0;
          transition: color 0.2s;
        }

        html.dark .tools-hero-desc {
          color: #94a3b8;
        }

        .tools-grid {
          width: 100%;
          max-width: 1000px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
        }

        .tool-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04);
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }

        .tool-card:hover {
          transform: translateY(-4px);
          border-color: #c7d2fe;
          box-shadow: 0 12px 36px -4px rgba(99, 102, 241, 0.12);
        }

        html.dark .tool-card {
          background: #1e293b;
          border-color: #334155;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4);
        }

        html.dark .tool-card:hover {
          border-color: #6366f1;
          box-shadow: 0 12px 36px -4px rgba(99, 102, 241, 0.25);
        }

        .tool-card-top {
          margin-bottom: 24px;
        }

        .tool-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .tool-card-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        html.dark .tool-card-icon {
          background: #0f172a;
          border-color: #334155;
        }

        .tool-card-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 100px;
          background: #f1f5f9;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          transition: all 0.2s;
        }

        html.dark .tool-card-badge {
          background: #334155;
          color: #cbd5e1;
        }

        .tool-card-title {
          font-size: 22px;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          color: #0f172a;
          margin: 0 0 6px;
          transition: color 0.2s;
        }

        html.dark .tool-card-title {
          color: #f8fafc;
        }

        .tool-card-tagline {
          font-size: 13px;
          font-weight: 600;
          color: #4f46e5;
          margin-bottom: 12px;
          transition: color 0.2s;
        }

        html.dark .tool-card-tagline {
          color: #818cf8;
        }

        .tool-card-desc {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 20px;
          transition: color 0.2s;
        }

        html.dark .tool-card-desc {
          color: #94a3b8;
        }

        .tool-card-features {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 24px;
        }

        .tool-feature-tag {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          transition: all 0.2s;
        }

        html.dark .tool-feature-tag {
          background: #0f172a;
          border-color: #334155;
          color: #94a3b8;
        }

        .tool-card-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.25);
          transition: all 0.2s;
        }

        .tool-card-btn:hover {
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
        }
      `}</style>

      <div className="tools-root">
        {/* Nav */}
        <nav className="tools-nav">
          <Link to="/" className="tools-nav-logo">
            <div className="tools-nav-logo-icon">🧰</div>
            <span className="tools-nav-logo-text">
              Smart<span>Learning</span>Plus
            </span>
          </Link>
          <div className="tools-nav-actions">
            <ThemeToggle />
            <Link to="/" className="tools-nav-link">
              ← Home
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="tools-hero">
          <span className="tools-hero-badge">🛠️ Student Utilities & Tools</span>
          <h1 className="tools-hero-title">Useful Learning Tools</h1>
          <p className="tools-hero-desc">
            Free, fast, and interactive tools designed to help students share notes, pick decision winners, and work faster.
          </p>
        </div>

        {/* Grid */}
        <div className="tools-grid">
          {tools.map((tool) => (
            <div className="tool-card" key={tool.id}>
              <div className="tool-card-top">
                <div className="tool-card-header">
                  <div className="tool-card-icon">{tool.icon}</div>
                  <span className="tool-card-badge">{tool.badge}</span>
                </div>
                <h2 className="tool-card-title">{tool.title}</h2>
                <div className="tool-card-tagline">{tool.tagline}</div>
                <p className="tool-card-desc">{tool.description}</p>
                <div className="tool-card-features">
                  {tool.features.map((feat) => (
                    <span className="tool-feature-tag" key={feat}>
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              </div>
              <Link to={tool.path} className="tool-card-btn">
                Open {tool.title} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
