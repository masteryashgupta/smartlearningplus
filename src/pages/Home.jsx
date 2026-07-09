import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSession, clearSession, api } from "../api.js";
import AdminPanel from "./AdminPanel.jsx";
import Login from "./Login.jsx";
import SubjectGauge from "../components/SubjectGauge.jsx";
import Heatmap from "../components/Heatmap.jsx";
import DayEditor from "../components/DayEditor.jsx";

export default function Home() {
  const session = getSession();

  // Student dashboard states
  const [stats, setStats] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const refreshData = () => {
    if (!session || session.role !== "student") return;
    api.get("/attendance/stats").then((r) => setStats(r.data));
    api.get("/attendance/heatmap").then((r) => setHeatmap(r.data));
    api.get("/attendance/leaderboard").then((r) => setLeaderboard(r.data));
  };

  const fetchProfile = () => {
    if (!session || session.role !== "student") return;
    setLoadingProfile(true);
    api.get("/auth/student/profile")
      .then((r) => {
        setProfile(r.data);
        if (r.data.name) localStorage.setItem("name", r.data.name);
      })
      .catch((err) => console.error("Error fetching profile", err))
      .finally(() => setLoadingProfile(false));
  };

  useEffect(() => {
    if (session && session.role === "student") {
      refreshData();
      fetchProfile();
    }
  }, []);

  // Poll for telegram connection status
  useEffect(() => {
    let interval;
    if (session && session.role === "student" && profile && !profile.telegram_id) {
      interval = setInterval(() => {
        api.get("/auth/student/profile")
          .then((r) => {
            if (r.data.telegram_id) setProfile(r.data);
            if (r.data.name) localStorage.setItem("name", r.data.name);
          })
          .catch((e) => console.error(e));
      }, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [profile]);

  async function handleDisconnectTelegram() {
    if (!window.confirm("Are you sure you want to disconnect your Telegram account?")) return;
    setLoadingProfile(true);
    try {
      await api.post("/auth/student/disconnect-telegram");
      fetchProfile();
    } catch (err) {
      console.error(err);
      alert("Failed to disconnect Telegram");
    } finally {
      setLoadingProfile(false);
    }
  }

  function signOut() {
    clearSession();
    window.location.reload();
  }

  useEffect(() => {
    let onMouseMove;
    const cursorDot = document.querySelector("[data-cursor-dot]");
    const cursorOutline = document.querySelector("[data-cursor-outline]");

    if (!session && cursorDot && cursorOutline) {
      onMouseMove = (e) => {
        cursorDot.style.left = `${e.clientX}px`;
        cursorDot.style.top = `${e.clientY}px`;
        cursorOutline.animate(
          { left: `${e.clientX}px`, top: `${e.clientY}px` },
          { duration: 180, fill: "forwards" }
        );
      };
      window.addEventListener("mousemove", onMouseMove);

      const interactiveElements = document.querySelectorAll(
        "a, button, .sl-card, .sl-feat, .sl-pill, .sl-doc-btn"
      );
      interactiveElements.forEach((el) => {
        el.addEventListener("mouseenter", () =>
          cursorOutline?.classList.add("cursor-hovering")
        );
        el.addEventListener("mouseleave", () =>
          cursorOutline?.classList.remove("cursor-hovering")
        );
      });

      // Add sl-home-active class to body when on homepage to hide system cursor
      document.body.classList.add("sl-home-active");
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("sl-in");
        });
      },
      { threshold: 0.12 }
    );

    const animatedElements = document.querySelectorAll(
      ".sl-card, .sl-feat, .sl-pill, .subject-row-card"
    );
    animatedElements.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 6) * 0.05}s`;
      io.observe(el);
    });

    return () => {
      if (onMouseMove) window.removeEventListener("mousemove", onMouseMove);
      io.disconnect();
      document.body.classList.remove("sl-home-active");
    };
  }, [session]);

  if (!session) {
    return <Login />;
  }

  if (session.role === "admin") {
    return <AdminPanel />;
  }

  return (
    <div className="sl-home min-h-screen text-[#0f172a] font-sans relative overflow-x-hidden">
      {/* SCOPED CSS STYLES FOR LANDING PAGE */}
      <style>{`
        .sl-home {
          --bg: #f5f7ff;
          --surface: #ffffff;
          --surface2: #f0f4ff;
          --border: #e2e8f0;
          --border2: #cbd5e1;
          --text: #0f172a;
          --text2: #334155;
          --muted: #64748b;
          --accent: #2563eb;
          --accent-light: #eff6ff;
          --accent-hover: #1d4ed8;
          --accent2: #06b6d4;
          --accent2-light: #ecfeff;
          --green: #10b981;
          --green-light: #ecfdf5;
          --amber: #f59e0b;
          --amber-light: #fffbeb;
          --red: #ef4444;
          --red-light: #fef2f2;
          --purple: #8b5cf6;
          --purple-light: #f5f3ff;
          --shadow-sm: 0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04);
          --shadow: 0 4px 16px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.04);
          --shadow-lg: 0 10px 40px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06);
          --radius: 14px;
          --radius-sm: 8px;
          background: var(--bg);
        }

        /* Scoped cursor styling */
        body.sl-home-active, 
        body.sl-home-active a, 
        body.sl-home-active button, 
        body.sl-home-active .sl-card, 
        body.sl-home-active .sl-pill {
          cursor: none !important;
        }

        .cursor-dot, .cursor-outline {
          position: fixed; top: 0; left: 0;
          pointer-events: none; z-index: 9999;
          border-radius: 50%;
          will-change: transform;
        }

        .cursor-dot {
          width: 5px; height: 5px;
          margin: -2.5px 0 0 -2.5px;
          background: var(--accent);
          transition: opacity 0.15s ease;
        }

        .cursor-outline {
          width: 22px; height: 22px;
          margin: -11px 0 0 -11px;
          border: 1.5px solid rgba(79, 70, 229, 0.55);
          background: transparent;
          transition: width 0.18s cubic-bezier(.2,.8,.2,1),
                      height 0.18s cubic-bezier(.2,.8,.2,1),
                      margin 0.18s cubic-bezier(.2,.8,.2,1),
                      border-color 0.18s ease,
                      background 0.18s ease,
                      opacity 0.15s ease;
        }

        .cursor-hovering {
          width: 30px; height: 30px;
          margin: -15px 0 0 -15px;
          background: rgba(79, 70, 229, 0.07);
          border-color: var(--accent);
        }

        @media (hover: none), (pointer: coarse) {
          body.sl-home-active, body.sl-home-active a, body.sl-home-active button { cursor: auto !important; }
          .cursor-dot, .cursor-outline { display: none; }
        }

        /* animated mesh background */
        .sl-mesh {
          position: fixed; inset: 0; z-index: -1; overflow: hidden; background: var(--bg);
        }
        .sl-mesh span {
          position: absolute; border-radius: 50%; filter: blur(60px); opacity: .35;
          animation: sl-float 18s ease-in-out infinite;
        }
        .sl-mesh span:nth-child(1) { width: 420px; height: 420px; background: var(--accent); top: -120px; left: -80px; animation-delay: 0s; }
        .sl-mesh span:nth-child(2) { width: 360px; height: 360px; background: var(--accent2); top: 30%; right: -100px; animation-delay: -6s; }
        .sl-mesh span:nth-child(3) { width: 300px; height: 300px; background: var(--purple); bottom: -100px; left: 20%; animation-delay: -12s; }
        .sl-mesh span:nth-child(4) { width: 240px; height: 240px; background: var(--green); bottom: 10%; right: 15%; animation-delay: -3s; opacity: .22; }
        
        @keyframes sl-float {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(40px,-30px) scale(1.08); }
          66% { transform: translate(-30px,25px) scale(0.95); }
        }

        /* grid overlay texture */
        .sl-grid-overlay {
          position: fixed; inset: 0; z-index: -1; pointer-events: none;
          background-image:
            linear-gradient(rgba(79,70,229,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79,70,229,0.035) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 90%);
        }

        .sl-shell { max-width: 1180px; margin: 0 auto; padding: 0 24px; }

        /* nav */
        .sl-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 0; position: relative; z-index: 5;
        }
        .sl-logo { display:flex; align-items:center; gap:10px; font-weight:800; font-size:17px; color: var(--text); }
        .sl-logo-mark {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          display:flex; align-items:center; justify-content:center; color:#fff; font-size:16px;
          box-shadow: 0 4px 14px rgba(79,70,229,0.35);
        }
        .sl-nav-links { display:flex; gap:28px; font-size:14px; font-weight:600; color: var(--muted); }
        .sl-nav-links a { color: inherit; text-decoration:none; transition:.2s; }
        .sl-nav-links a:hover { color: var(--accent); }
        @media (max-width:680px){ .sl-nav-links{ display:none; } }

        /* hero split layout */
        .sl-hero-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 50px;
          padding: 80px 0 50px;
          position: relative;
        }
        .sl-hero-left {
          flex: 1.2;
          text-align: left;
        }
        .sl-hero-right {
          flex: 0.8;
          display: flex;
          justify-content: center;
          animation: sl-pop .7s cubic-bezier(.2,.8,.2,1) both;
          animation-delay: 0.2s;
        }
        @media (max-width: 880px) {
          .sl-hero-container {
            flex-direction: column;
            text-align: center;
            padding: 40px 0;
            gap: 30px;
          }
          .sl-hero-left {
            text-align: center;
          }
          .sl-hero-right {
            margin-top: 10px;
          }
        }
        .sl-eyebrow {
          display:inline-flex; align-items:center; gap:8px;
          background: var(--surface); border:1px solid var(--border);
          padding: 7px 16px; border-radius: 999px; font-size:12.5px; font-weight:700;
          color: var(--accent); box-shadow: var(--shadow-sm); margin-bottom: 26px;
          animation: sl-pop .6s cubic-bezier(.2,.8,.2,1) both;
        }
        .sl-eyebrow .dot { width:7px; height:7px; border-radius:50%; background: var(--green); box-shadow:0 0 0 4px var(--green-light); animation: sl-pulse 2s infinite; }
        @keyframes sl-pulse { 0%,100%{ box-shadow:0 0 0 4px var(--green-light);} 50%{ box-shadow:0 0 0 7px var(--green-light);} }

        .sl-headline {
          font-size: clamp(36px, 6vw, 68px); font-weight: 800; line-height: 1.06;
          letter-spacing: -0.03em; color: var(--text); margin-bottom: 22px;
          animation: sl-pop .7s cubic-bezier(.2,.8,.2,1) both; animation-delay: .05s;
        }
        .sl-headline .grad {
          background: linear-gradient(120deg, var(--accent) 10%, var(--accent2) 50%, var(--purple) 90%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          background-size: 200% auto; animation: sl-shine 6s linear infinite;
        }
        @keyframes sl-shine { to { background-position: 200% center; } }

        .sl-sub {
          margin-bottom: 36px; font-size: 16px; color: var(--muted);
          line-height: 1.65; animation: sl-pop .7s cubic-bezier(.2,.8,.2,1) both; animation-delay: .1s;
        }
        .sl-sub strong { color: var(--text2); }

        .sl-hero-actions {
          display:flex; gap:14px; flex-wrap:wrap; margin-bottom: 54px;
          animation: sl-pop .7s cubic-bezier(.2,.8,.2,1) both; animation-delay: .15s;
        }
        .sl-btn-primary, .sl-btn-ghost {
          font-size:15px; font-weight:700; padding:14px 28px; border-radius: 12px;
          text-decoration:none; display:inline-flex; align-items:center; gap:8px; transition:.25s;
        }
        .sl-btn-primary {
          background: linear-gradient(135deg, var(--accent), #6366f1); color:#fff;
          box-shadow: 0 8px 24px rgba(79,70,229,0.35);
        }
        .sl-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 14px 32px rgba(79,70,229,0.42); }
        .sl-btn-ghost {
          background: var(--surface); color: var(--text); border:1.5px solid var(--border);
        }
        .sl-btn-ghost:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-3px); }

        @keyframes sl-pop { from { opacity:0; transform: translateY(16px);} to { opacity:1; transform: translateY(0);} }

        /* stats strip */
        .sl-stats {
          display:grid; grid-template-columns: repeat(4,1fr); gap:1px;
          background: var(--border); border:1px solid var(--border); border-radius: var(--radius);
          overflow:hidden; max-width: 760px; margin: 0 auto 70px; box-shadow: var(--shadow-sm);
        }
        .sl-stat { background: var(--surface); padding: 22px 10px; text-align:center; }
        .sl-stat-num { font-size: 26px; font-weight:800; color: var(--accent); letter-spacing:-0.02em; }
        .sl-stat-label { font-size:11.5px; color: var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:.4px; margin-top:4px; }
        @media (max-width:560px){ .sl-stats{ grid-template-columns: repeat(2,1fr);} }

        /* section label */
        .sl-section { padding: 10px 0 60px; }
        .sl-eyebrow-sm {
          font-size:12px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase;
          color: var(--accent); margin-bottom: 8px;
        }
        .sl-section-title { font-size: 30px; font-weight: 800; color: #1e3a8a; letter-spacing:-0.02em; margin-bottom: 34px; }

        /* bento subject grid */
        .sl-bento {
          display:grid; grid-template-columns: repeat(3, 1fr); gap: 18px;
        }
        .sl-bento .sl-card { grid-column: span 1; }
        @media (max-width: 880px) {
          .sl-bento { grid-template-columns: repeat(2,1fr); }
        }
        @media (max-width: 540px) {
          .sl-bento { grid-template-columns: 1fr; }
        }

        .sl-card {
          position: relative; background: var(--surface); border:1px solid var(--border);
          border-radius: 18px; padding: 28px; text-decoration:none; overflow:hidden;
          display:flex; flex-direction:column; min-height: 168px;
          transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s, border-color .3s;
          opacity:0; transform: translateY(24px);
        }
        .sl-card.sl-in { opacity:1; transform: translateY(0); }
        .sl-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-lg); border-color: var(--accent-c, var(--accent)); }
        .sl-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:3px;
          background: var(--accent-c, var(--accent)); transform: scaleX(0); transform-origin:left;
          transition: transform .35s ease;
        }
        .sl-card:hover::before { transform: scaleX(1); }
        .sl-card::after {
          content:''; position:absolute; width:140px; height:140px; border-radius:50%;
          background: var(--accent-c, var(--accent)); opacity:.07; top:-50px; right:-50px;
          transition: transform .4s ease;
        }
        .sl-card:hover::after { transform: scale(1.3); }

        .sl-card-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: auto; }
        .sl-card-icon {
          width: 46px; height: 46px; border-radius: 12px; display:flex; align-items:center; justify-content:center;
          font-size: 21px; background: var(--accent-bg, var(--accent-light)); position: relative; z-index:1;
        }
        .sl-card-arrow {
          width: 32px; height: 32px; border-radius: 50%; border:1.5px solid var(--border);
          display:flex; align-items:center; justify-content:center; font-size:14px; color: var(--muted);
          transition: .3s; position:relative; z-index:1;
        }
        .sl-card:hover .sl-card-arrow { background: var(--accent-c, var(--accent)); border-color: transparent; color:#fff; transform: rotate(45deg); }

        .sl-card-body { margin-top: 22px; position:relative; z-index:1; }
        .sl-card-title { font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 4px; letter-spacing:-0.01em; }
        .sl-card-code { font-family:'JetBrains Mono',monospace; font-size:11.5px; color: var(--muted); margin-bottom: 14px; }
        .sl-card-status {
          display:inline-flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700;
          padding: 4px 10px; border-radius:999px; background: var(--green-light); color: var(--green);
        }
        .sl-card-status .dot2 { width:6px; height:6px; border-radius:50%; background: var(--green); }

        /* per-card accents */
        .sl-c-itc { --accent-c:#4f46e5; --accent-bg:#eef2ff; }
        .sl-c-cd  { --accent-c:#e11d48; --accent-bg:#fff1f2; }
        .sl-c-os  { --accent-c:#059669; --accent-bg:#ecfdf5; }
        .sl-c-cg  { --accent-c:#ea580c; --accent-bg:#fff7ed; }
        .sl-c-aoa { --accent-c:#7c3aed; --accent-bg:#f5f3ff; }
        .sl-c-hci { --accent-c:#db2777; --accent-bg:#fdf2f8; }

        /* group labels */
        .sl-group-label {
          font-size: 14px; font-weight: 800; color: var(--text2); margin-bottom: 16px;
          display:flex; align-items:center; gap:8px;
        }
        .sl-group-note { font-size:12px; font-weight:600; color: var(--muted); text-transform:none; letter-spacing:0; }

        /* pill cards (electives / labs) */
        .sl-pill-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .sl-pill-grid-4 { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 880px){ .sl-pill-grid, .sl-pill-grid-4 { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 540px){ .sl-pill-grid, .sl-pill-grid-4 { grid-template-columns: 1fr; } }

        .sl-pill {
          display:flex; align-items:center; gap:12px; text-decoration:none;
          background: var(--surface); border:1px solid var(--border); border-radius: 14px;
          padding: 14px 16px; transition:.25s; opacity:.85;
          opacity:0; transform: translateY(16px);
        }
        .sl-pill.sl-in { opacity:1; transform: translateY(0); }
        .sl-pill:hover { border-color: var(--accent-c, var(--border2)); box-shadow: var(--shadow-sm); transform: translateY(-3px); }
        .sl-pill-icon {
          width:36px; height:36px; flex-shrink:0; border-radius:10px; display:flex; align-items:center; justify-content:center;
          font-size:16px; background: var(--accent-bg, var(--surface2));
        }
        .sl-pill > span:nth-child(2) { display:flex; flex-direction:column; flex:1; min-width:0; }
        .sl-pill-title { font-size: 13.5px; font-weight:700; color: var(--text); line-height:1.3; }
        .sl-pill-code { font-family:'JetBrains Mono',monospace; font-size:10.5px; color: var(--muted); margin-top:3px; }
        .sl-pill-status {
          flex-shrink:0; font-size:10px; font-weight:700; padding:3px 9px; border-radius:999px;
        }
        .sl-pill-pending { background: var(--amber-light); color: var(--amber); }

        .sl-c-el1 { --accent-c:#0891b2; --accent-bg:#ecfeff; }
        .sl-c-el2 { --accent-c:#db2777; --accent-bg:#fdf2f8; }
        .sl-c-el3 { --accent-c:#16a34a; --accent-bg:#f0fdf4; }
        .sl-c-lab1 { --accent-c:#ea580c; --accent-bg:#fff7ed; }
        .sl-c-lab2 { --accent-c:#e11d48; --accent-bg:#fff1f2; }
        .sl-c-lab3 { --accent-c:#7c3aed; --accent-bg:#f5f3ff; }
        .sl-c-lab4 { --accent-c:#b45309; --accent-bg:#fffbeb; }

        /* doc cards */
        .sl-doc-grid { display:grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
        @media (max-width: 720px){ .sl-doc-grid{ grid-template-columns: 1fr; } }
        .sl-doc-card {
          background: var(--surface); border:1px solid var(--border); border-radius: 18px;
          padding: 26px; display:flex; flex-direction:column; gap: 16px;
          transition:.25s; box-shadow: var(--shadow-sm);
        }
        .sl-doc-card:hover { border-color: var(--accent); box-shadow: var(--shadow); transform: translateY(-4px); }
        .sl-doc-icon { width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px; }
        .sl-doc-title { font-size: 16.5px; font-weight: 800; color: var(--text); margin-bottom: 6px; }
        .sl-doc-desc { font-size: 13.5px; color: var(--muted); line-height:1.55; }
        .sl-doc-btn {
          align-self:flex-start; font-size:13.5px; font-weight:700; color: var(--accent);
          background: var(--accent-light); border:1.5px solid var(--accent-light);
          padding: 10px 18px; border-radius: 10px; text-decoration:none; transition:.2s;
          display:inline-flex; align-items:center; gap:6px;
        }
        .sl-doc-btn:hover { background: var(--accent); color:#fff; border-color: var(--accent); }

        /* features feat */
        .sl-feat-grid {
          display:grid; grid-template-columns: repeat(3, 1fr); gap: 18px;
        }
        @media (max-width: 880px){ .sl-feat-grid{ grid-template-columns: repeat(2,1fr);} }
        @media (max-width: 560px){ .sl-feat-grid{ grid-template-columns: 1fr;} }
        .sl-feat {
          background: var(--surface); border:1px solid var(--border); border-radius:16px; padding:22px;
          transition: .25s; opacity:0; transform: translateY(20px);
        }
        .sl-feat.sl-in { opacity:1; transform: translateY(0); }
        .sl-feat:hover { border-color: var(--accent); transform: translateY(-4px); box-shadow: var(--shadow); }
        .sl-feat-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:19px; margin-bottom:14px; }
        .sl-feat-title { font-weight:700; font-size:15.5px; color: var(--text); margin-bottom:6px; }
        .sl-feat-desc { font-size: 13.5px; color: var(--muted); line-height:1.55; }

        /* cta */
        .sl-cta {
          position: relative; border-radius: 24px; padding: 56px 40px; text-align:center; overflow:hidden;
          background: linear-gradient(135deg, #4338ca, #4f46e5 45%, #6366f1 75%, #06b6d4);
          margin-bottom: 70px;
        }
        .sl-cta::before, .sl-cta::after {
          content:''; position:absolute; border-radius:50%; background: rgba(255,255,255,0.10);
        }
        .sl-cta::before { width:280px; height:280px; top:-120px; right:-60px; }
        .sl-cta::after { width:180px; height:180px; bottom:-90px; left:10%; }
        .sl-cta h3 { position:relative; z-index:1; color:#fff; font-size: 28px; font-weight:800; margin-bottom:10px; }
        .sl-cta p { position:relative; z-index:1; color: rgba(255,255,255,0.85); font-size:15px; margin-bottom: 26px; }
        .sl-cta a {
          position:relative; z-index:1; display:inline-flex; align-items:center; gap:8px;
          background:#fff; color: var(--accent); font-weight:800; font-size:15px;
          padding: 13px 26px; border-radius: 12px; text-decoration:none; transition:.25s;
        }
        .sl-cta a:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 14px 30px rgba(0,0,0,0.25); }

        /* footer */
        .sl-footer { text-align:center; padding: 30px 0 50px; color: var(--muted); font-size: 13.5px; }
        .sl-footer strong { color: var(--text2); }

        /* Dashboard premium layout styles */
        .dashboard-welcome-card {
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%);
          border: 1px solid rgba(79, 70, 229, 0.12);
          border-radius: 20px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
          animation: sl-pop 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        @media (max-width: 640px) {
          .dashboard-welcome-card {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
            gap: 16px;
            padding: 16px 20px;
          }
          .dashboard-welcome-card > div:last-child {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }
          .dashboard-welcome-card .text-right {
            text-align: center;
          }
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }
        @media (min-width: 960px) {
          .dashboard-grid {
            grid-template-columns: 7.2fr 4.8fr;
          }
        }
        .dashboard-main-col {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .dashboard-sidebar-col {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        /* Sleek Subject Note Row instead of giant bento box */
        .subject-row-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 12px;
          margin-bottom: 32px;
        }
        @media (min-width: 640px) {
          .subject-row-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          }
        }
        .subject-row-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          text-decoration: none;
          transition: all 0.2s ease;
          opacity: 0;
          transform: translateY(16px);
          min-width: 0;
        }
        .subject-row-card.sl-in {
          opacity: 1;
          transform: translateY(0);
        }
        .subject-row-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent);
          box-shadow: var(--shadow);
        }
        .subject-row-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .subject-row-icon {
          font-size: 20px;
          width: 40px;
          height: 40px;
          background: var(--surface2);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .subject-row-details {
          min-width: 0;
        }
        .subject-row-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .subject-row-code {
          font-size: 11px;
          color: var(--muted);
          font-family: monospace;
          margin-top: 2px;
        }
        .subject-row-arrow {
          font-size: 14px;
          color: var(--accent);
          font-weight: bold;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .subject-row-card:hover .subject-row-arrow {
          transform: translateX(4px);
        }
      `}</style>

      {/* CUSTOM CURSOR DOTS */}
      {!session && (
        <>
          <div className="cursor-dot" data-cursor-dot></div>
          <div className="cursor-outline" data-cursor-outline></div>
        </>
      )}

      {/* FLOATING BACKGROUND MESH & GRID OVERLAY */}
      <div className="sl-mesh">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="sl-grid-overlay"></div>

      <div className="sl-shell">
        {/* NAV */}
        <nav className="sl-nav">
          <div className="sl-logo" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img src="/logo.png?v=3" alt="Logo" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
            Smart Learning
            <span style={{ color: "var(--accent)" }}>+</span>
          </div>
          <div className="flex items-center gap-6">
            {session && session.role === "student" ? (
              <div className="flex items-center gap-4">
                <div className="sl-nav-links flex items-center gap-6">
                  <a href="#attendance-section" onClick={(e) => { e.preventDefault(); document.getElementById('attendance-section')?.scrollIntoView({ behavior: 'smooth' }); }}>Attendance</a>
                  <a href="#subjects" onClick={(e) => { e.preventDefault(); document.getElementById('subjects')?.scrollIntoView({ behavior: 'smooth' }); }}>Subjects</a>
                  <a href="#downloads" onClick={(e) => { e.preventDefault(); document.getElementById('downloads')?.scrollIntoView({ behavior: 'smooth' }); }}>Downloads</a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-mono bg-paper border border-line/60 rounded-lg px-2.5 py-1">{profile?.name || session?.name}</span>
                  <button
                    onClick={signOut}
                    className="px-3 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 font-medium text-xs hover:bg-red-100 transition-colors shadow-soft"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="sl-nav-links flex items-center gap-6">
                  <a href="#subjects" onClick={(e) => { e.preventDefault(); document.getElementById('subjects')?.scrollIntoView({ behavior: 'smooth' }); }}>Subjects</a>
                  <a href="#downloads" onClick={(e) => { e.preventDefault(); document.getElementById('downloads')?.scrollIntoView({ behavior: 'smooth' }); }}>Downloads</a>
                </div>
                <a
                  href="#login-section"
                  onClick={(e) => { e.preventDefault(); document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 !text-white font-medium text-xs hover:bg-indigo-700 transition-colors shadow-soft"
                  style={{ cursor: "none", color: "#ffffff" }}
                >
                  Sign In
                </a>
              </div>
            )}
          </div>
        </nav>

        {/* DASHBOARD HEADER & WELCOME CARD */}
        {session && session.role === "student" && (
          <div className="dashboard-welcome-card my-6">
            <div>
              <h2 className="text-xl font-bold text-ink">Hello, {profile?.name || session?.name} 👋</h2>
              <p className="text-xs text-muted mt-1">JECRC B.Tech CSE V Semester • {profile?.batch || "G2"} Batch</p>
            </div>
            {(() => {
              const overallPct = stats?.overall.percentage ?? null;
              const safeColor = overallPct === null ? "#6D5EF5" : overallPct >= 75 ? "#16A34A" : overallPct >= 65 ? "#F59E0B" : "#E11D48";
              return (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-muted">Overall Attendance</div>
                    <div className="text-sm font-mono font-bold mt-0.5" style={{ color: safeColor }}>
                      {overallPct !== null ? `${overallPct}%` : "—"} ({stats?.overall.present ?? 0}/{stats?.overall.total ?? 0} classes)
                    </div>
                  </div>
                  
                  {/* Telegram Status Pill */}
                  <div className="flex items-center gap-1 bg-white border border-line/60 rounded-xl p-1 shadow-soft">
                    {loadingProfile ? (
                      <span className="text-[10px] text-muted px-2 py-1">Syncing...</span>
                    ) : profile?.telegram_id ? (
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        <span className="text-[10px] text-green-600 font-medium">🤖 connected</span>
                        <button onClick={handleDisconnectTelegram} className="text-[9px] bg-red-50 hover:bg-red-100 text-red-600 px-1.5 py-0.5 rounded transition-all font-semibold border border-red-200">Unlink</button>
                      </div>
                    ) : profile?.telegram_connect_token && profile?.bot_username ? (
                      <a
                        href={`https://t.me/${profile.bot_username}?start=${profile.telegram_connect_token}`}
                        target="_blank" rel="noopener noreferrer"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg transition-colors border border-indigo-700"
                        style={{ cursor: "none" }}
                      >
                        Link Telegram Bot
                      </a>
                    ) : (
                      <span className="text-[10px] text-muted px-2 py-1">Loading...</span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* MAIN DASHBOARD GRID */}
        {session && session.role === "student" && (
          <div className="dashboard-grid">
            {/* LEFT COLUMN: TIMETABLE & SUBJECT GAUGES */}
            <div className="dashboard-main-col" id="attendance-section">
              {/* TIMETABLE TRACKER */}
              <div className="card p-5 bg-white border border-line rounded-2xl shadow-soft">
                <DayEditor onAttendanceChange={refreshData} />
              </div>

              {/* SUBJECT BREAKDOWN */}
              <div className="card p-5 bg-white border border-line rounded-2xl shadow-soft">
                <h3 className="font-bold text-xs text-ink mb-4 uppercase tracking-wider">Subject Attendance breakdown</h3>
                {stats?.perSubject && stats.perSubject.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {stats.perSubject.map((sub) => (
                      <SubjectGauge key={sub.subject_id} subject={sub} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted text-xs font-medium">
                    No subject attendance logged. Use the timetable scheduler above to log attendance!
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: LEADERBOARD & HEATMAP */}
            <div className="dashboard-sidebar-col">
              {/* LEADERBOARD */}
              <div className="card p-5 bg-white border border-line rounded-2xl shadow-soft flex flex-col justify-between">
                <h3 className="font-bold text-xs text-ink mb-3 uppercase tracking-wider flex items-center justify-between">
                  <span>🏆 Leaderboard</span>
                  <span className="text-[10px] font-mono text-muted bg-paper px-2 py-0.5 rounded border border-line/40">{leaderboard.length} users</span>
                </h3>
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {leaderboard.map((r, i) => {
                    const isMe = r.id === session?.id;
                    const pct = r.percentage;
                    const barColor = pct === null ? "#94A3B8" : pct >= 75 ? "#16A34A" : pct >= 65 ? "#F59E0B" : "#E11D48";
                    return (
                      <div key={r.id} className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${isMe ? "bg-indigo-50/50 border-indigo-200" : "border-line/30 bg-paper/40"}`}>
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-semibold truncate ${isMe ? "text-indigo-900" : "text-ink"}`}>{r.name} {isMe && "(You)"}</div>
                          <div className="text-[10px] text-muted font-mono">{r.batch} batch</div>
                        </div>
                        <div className="font-bold text-xs font-mono shrink-0" style={{ color: barColor }}>
                          {pct !== null ? `${pct}%` : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* HEATMAP */}
              <div className="card p-5 bg-white border border-line rounded-2xl shadow-soft flex flex-col justify-between">
                <h3 className="font-bold text-xs text-ink mb-3 uppercase tracking-wider">📅 Consistency Heatmap</h3>
                <div className="flex items-center justify-center py-2 overflow-x-auto">
                  <Heatmap data={heatmap} />
                </div>
                <p className="text-[9px] text-muted text-center mt-2 leading-relaxed">
                  Hover over the grid blocks to inspect date details. Brighter green represents higher presence rate.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STUDY MATERIALS SECTION */}
        <section className="sl-section scroll-anchor" id="subjects">
          <div className="sl-eyebrow-sm">Study Material</div>
          <div className="sl-section-title" style={{ marginBottom: "20px" }}>JECRC Core Subjects</div>
          
          <div className="subject-row-grid">
            <a href="/itc/index.html" className="subject-row-card sl-c-itc">
              <div className="subject-row-left">
                <div className="subject-row-icon">📘</div>
                <div className="subject-row-details">
                  <div className="subject-row-title">Information Theory &amp; Coding</div>
                  <div className="subject-row-code">5CS3-01 &nbsp;·&nbsp; 2L &nbsp;·&nbsp; Active Module</div>
                </div>
              </div>
              <div className="subject-row-arrow">➔</div>
            </a>

            <a href="/cd/index.html" className="subject-row-card sl-c-cd">
              <div className="subject-row-left">
                <div className="subject-row-icon">📕</div>
                <div className="subject-row-details">
                  <div className="subject-row-title">Compiler Design</div>
                  <div className="subject-row-code">5CS4-02 &nbsp;·&nbsp; 3L &nbsp;·&nbsp; Active Module</div>
                </div>
              </div>
              <div className="subject-row-arrow">➔</div>
            </a>

            <a href="/os/index.html" className="subject-row-card sl-c-os">
              <div className="subject-row-left">
                <div className="subject-row-icon">📗</div>
                <div className="subject-row-details">
                  <div className="subject-row-title">Operating Systems</div>
                  <div className="subject-row-code">5CS4-03 &nbsp;·&nbsp; 3L &nbsp;·&nbsp; Active Module</div>
                </div>
              </div>
              <div className="subject-row-arrow">➔</div>
            </a>

            <a href="/cg/index.html" className="subject-row-card sl-c-cg">
              <div className="subject-row-left">
                <div className="subject-row-icon">📙</div>
                <div className="subject-row-details">
                  <div className="subject-row-title">Computer Graphics &amp; Multimedia</div>
                  <div className="subject-row-code">5CS4-04 &nbsp;·&nbsp; 3L &nbsp;·&nbsp; Active Module</div>
                </div>
              </div>
              <div className="subject-row-arrow">➔</div>
            </a>

            <a href="/aoa/index.html" className="subject-row-card sl-c-aoa">
              <div className="subject-row-left">
                <div className="subject-row-icon">📓</div>
                <div className="subject-row-details">
                  <div className="subject-row-title">Analysis of Algorithms</div>
                  <div className="subject-row-code">5CS4-05 &nbsp;·&nbsp; 3L &nbsp;·&nbsp; Active Module</div>
                </div>
              </div>
              <div className="subject-row-arrow">➔</div>
            </a>

            <a href="#" className="subject-row-card sl-c-hci">
              <div className="subject-row-left">
                <div className="subject-row-icon">🖥️</div>
                <div className="subject-row-details">
                  <div className="subject-row-title">Human-Computer Interaction</div>
                  <div className="subject-row-code">5CS5-12 &nbsp;·&nbsp; 2L &nbsp;·&nbsp; Pending</div>
                </div>
              </div>
              <div className="subject-row-arrow">➔</div>
            </a>
          </div>
        </section>

        {/* SYLLABUS DOWNLOADS */}
        <section className="sl-section scroll-anchor" id="downloads" style={{ paddingBottom: "40px" }}>
          <div className="sl-eyebrow-sm">Official Schemes</div>
          <div className="sl-section-title" style={{ marginBottom: "20px" }}>RTU Syllabus Scheme PDFs</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              className="subject-row-card sl-c-el1"
              href="https://drive.google.com/file/d/1QrFGUTRRIEk2V4H6_XXJCw9vgBUVkZ35/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="subject-row-left">
                <div className="subject-row-icon">🗂️</div>
                <div className="subject-row-details">
                  <div className="subject-row-title">Teaching &amp; Examination Scheme</div>
                  <div className="subject-row-code">JECRC V Semester · Credits &amp; Codes</div>
                </div>
              </div>
              <div className="subject-row-arrow">⬇</div>
            </a>

            <a
              className="subject-row-card sl-c-el3"
              href="https://drive.google.com/file/d/1pobfLjiwsL2clnoFelTSg6bseLGvdvTV/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="subject-row-left">
                <div className="subject-row-icon">📘</div>
                <div className="subject-row-details">
                  <div className="subject-row-title">Full V-VI Semester Syllabus</div>
                  <div className="subject-row-code">Official RTU B.Tech CSE topics index</div>
                </div>
              </div>
              <div className="subject-row-arrow">⬇</div>
            </a>
          </div>
        </section>

        <footer className="sl-footer">
          <p>
            Built with ❤️ for RTU students &nbsp;·&nbsp;{" "}
            <strong>Smart Learning Plus</strong> &nbsp;·&nbsp; B.Tech CSE 5th Sem
          </p>
        </footer>
      </div>
    </div>
  );
}
