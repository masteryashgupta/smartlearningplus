import { Link, useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../api.js";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Navbar({ onOpenSubscribe, onOpenContribute }) {
  const navigate = useNavigate();
  const session = getSession();
  const [menuOpen, setMenuOpen] = useState(false);

  function signOut() {
    clearSession();
    window.location.reload();
  }

  return (
    <nav className="sticky top-0 z-30 backdrop-blur-md border-b transition-colors" style={{ background: "var(--color-nav-bg, rgba(15, 23, 42, 0.85))", borderColor: "var(--color-line, rgba(255, 255, 255, 0.08))" }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 text-decoration-none group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            <img src="/logo.png?v=3" alt="Logo" className="w-5 h-5 object-contain" />
          </div>
          <span className="font-display font-extrabold text-base tracking-tight text-white flex items-center">
            Smart Learning<span className="text-primary font-bold text-[10px] ml-1 px-1.5 py-0.5 bg-primary/20 rounded-md border border-primary/30">+</span>
          </span>
        </Link>

        {/* Desktop navigation links */}
        <div className="hidden md:flex items-center gap-1 text-sm font-medium">
          <a
            href="/#subjects"
            className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            📚 Study Notes
          </a>
          <Link
            to="/tools"
            className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            ⚡ Tools Hub
          </Link>
          <Link
            to="/paste"
            className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            📋 QuickPaste
          </Link>
          {onOpenContribute && (
            <button
              onClick={onOpenContribute}
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              📤 Contribute
            </button>
          )}
          {onOpenSubscribe && (
            <button
              onClick={onOpenSubscribe}
              className="px-3.5 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>📧</span>
              <span>Subscribe</span>
            </button>
          )}
        </div>

        {/* Right action items */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <ThemeToggle />
          {session && session.role === "admin" && (
            <div className="flex items-center gap-2">
              <Link
                to="/admin"
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-white transition-colors"
              >
                ⚙️ Admin Panel
              </Link>
              <button
                onClick={signOut}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1.5"
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className="text-xl">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 py-4 space-y-2 bg-slate-900/95 border-slate-800 shadow-xl backdrop-blur-xl">
          <a
            href="/#subjects"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            📚 Study Notes &amp; Units
          </a>
          <Link
            to="/tools"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            ⚡ Study Tools &amp; Utilities
          </Link>
          <Link
            to="/paste"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            📋 QuickPaste
          </Link>
          {onOpenContribute && (
            <button
              onClick={() => { onOpenContribute(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-white/5"
            >
              📤 Share Study Material
            </button>
          )}
          {onOpenSubscribe && (
            <button
              onClick={() => { onOpenSubscribe(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-primary bg-primary/10 border border-primary/20"
            >
              📧 Subscribe to Email Notifications
            </button>
          )}
          {session && session.role === "admin" && (
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="text-xs font-semibold text-primary"
              >
                ⚙️ Admin Panel
              </Link>
              <button onClick={signOut} className="text-xs text-rose-400 font-medium">
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
