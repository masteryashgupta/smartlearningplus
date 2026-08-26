import { Link, useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../api.js";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle.jsx";

const GITHUB_REPO_URL = "https://github.com/masteryashgupta/smartlearningplus";

export default function Navbar({ onOpenSubscribe }) {
  const navigate = useNavigate();
  const session = getSession();
  const [menuOpen, setMenuOpen] = useState(false);

  function signOut() {
    clearSession();
    window.location.reload();
  }

  return (
    <nav
      className="sticky top-0 z-30 backdrop-blur-md border-b transition-colors"
      style={{
        background: "var(--color-nav-bg, rgba(255, 255, 255, 0.85))",
        borderColor: "var(--color-line, #E2E8F0)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 text-decoration-none group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            <img src="/logo.png?v=3" alt="Logo" className="w-5 h-5 object-contain" />
          </div>
          <span className="font-display font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center">
            Smart Learning<span className="text-primary font-bold text-[10px] ml-1 px-1.5 py-0.5 bg-primary/10 dark:bg-primary/20 rounded-md border border-primary/30">+</span>
          </span>
        </Link>

        {/* Desktop navigation links */}
        <div className="hidden md:flex items-center gap-1 text-sm font-medium">
          <a
            href="/#subjects"
            className="px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            📚 Study Notes
          </a>
          <Link
            to="/tools"
            className="px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            ⚡ Tools Hub
          </Link>
          <Link
            to="/paste"
            className="px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            📋 QuickPaste
          </Link>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Contribute</span>
          </a>
          {onOpenSubscribe && (
            <button
              onClick={onOpenSubscribe}
              className="px-3.5 py-1.5 rounded-lg bg-primary/10 dark:bg-primary/15 hover:bg-primary/20 dark:hover:bg-primary/25 text-primary border border-primary/30 font-semibold transition-colors flex items-center gap-1.5"
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
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-xs font-semibold text-slate-800 dark:text-white transition-colors"
              >
                ⚙️ Admin Panel
              </Link>
              <button
                onClick={signOut}
                className="text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 font-medium px-2 py-1.5"
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
            className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className="text-xl">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 py-4 space-y-2 bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-xl">
          <a
            href="/#subjects"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            📚 Study Notes &amp; Units
          </a>
          <Link
            to="/tools"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            ⚡ Study Tools &amp; Utilities
          </Link>
          <Link
            to="/paste"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            📋 QuickPaste
          </Link>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>GitHub / Contribute</span>
          </a>
          {onOpenSubscribe && (
            <button
              onClick={() => { onOpenSubscribe(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-primary bg-primary/10 border border-primary/20"
            >
              📧 Subscribe to Email Notifications
            </button>
          )}
          {session && session.role === "admin" && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="text-xs font-semibold text-primary"
              >
                ⚙️ Admin Panel
              </Link>
              <button onClick={signOut} className="text-xs text-rose-500 dark:text-rose-400 font-medium">
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
