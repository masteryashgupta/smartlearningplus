import { useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../api.js";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Navbar({ tabs = [], active, onTab, userName }) {
  const navigate = useNavigate();
  const session = getSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = userName || session?.name;

  function signOut() {
    clearSession();
    window.location.href = "/login";
    window.location.reload();
  }

  return (
    <div className="sticky top-0 z-20 backdrop-blur-sm border-b" style={{ background: 'var(--color-paper, #FAFAF8)', borderColor: 'var(--color-line, #E8E6E1)' }}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="font-display font-bold text-base leading-none text-primary flex items-center gap-2 shrink-0">
          <img src="/logo.png?v=3" alt="Logo" className="w-6 h-6 object-contain" />
          <span className="font-extrabold tracking-tight">
            Smart Learning<span className="text-primary font-bold font-mono text-[10px] ml-1 px-1 bg-primary/10 rounded">+</span>
          </span>
        </div>

        {/* Desktop tabs — scrollable, no visible scrollbar */}
        <div className="hidden sm:flex items-center flex-1 max-w-lg mx-auto overflow-hidden">
          <div
            className="flex items-center gap-0.5 border rounded-xl p-1 overflow-x-auto w-full"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => onTab(t.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
                  active === t.key ? "bg-primary text-white shadow-sm" : "text-muted hover:text-ink hover:bg-paper"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: name + sign out */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted font-mono">{displayName}</span>
          <ThemeToggle />
          <button
            className="text-sm text-muted hover:text-bad transition-colors font-medium"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>

        {/* Mobile: hamburger */}
        <button
          className="sm:hidden flex flex-col gap-1 p-1.5 rounded-lg hover:bg-paper transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          <span className={`block h-0.5 w-5 bg-ink transition-transform origin-center ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
          <span className={`block h-0.5 w-5 bg-ink transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-5 bg-ink transition-transform origin-center ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="sm:hidden border-t px-4 py-3 space-y-1 shadow-lg" style={{ background: 'var(--color-paper)', borderColor: 'var(--color-line)' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { onTab(t.key); setMenuOpen(false); }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active === t.key ? "bg-primary text-white" : "text-ink hover:bg-white"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="pt-2 border-t border-line flex items-center justify-between mt-2">
            <span className="text-xs text-muted font-mono">{displayName}</span>
            <button onClick={signOut} className="text-sm text-bad font-medium">Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}
