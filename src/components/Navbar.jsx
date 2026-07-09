import { useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../api.js";
import { useState } from "react";

export default function Navbar({ tabs = [], active, onTab }) {
  const navigate = useNavigate();
  const session = getSession();
  const [menuOpen, setMenuOpen] = useState(false);

  function signOut() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-sm border-b border-line">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="font-display font-bold text-base leading-none text-primary flex items-center gap-1.5 shrink-0">
          <span className="font-extrabold tracking-tight">
            Attendance<span className="text-muted font-light font-mono text-[10px] ml-1 px-1 bg-primary/10 rounded">OS</span>
          </span>
        </div>

        {/* Desktop tabs */}
        <div className="hidden sm:flex items-center gap-1 bg-white border border-line rounded-xl p-1 flex-1 max-w-lg mx-auto overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => onTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                active === t.key ? "bg-primary text-white shadow-sm" : "text-muted hover:text-ink hover:bg-paper"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Right: name + sign out */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted font-mono">{session?.name}</span>
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
        <div className="sm:hidden border-t border-line bg-paper px-4 py-3 space-y-1 shadow-lg">
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
            <span className="text-xs text-muted font-mono">{session?.name}</span>
            <button onClick={signOut} className="text-sm text-bad font-medium">Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}
