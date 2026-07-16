import { useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../api.js";
import { useState, useEffect } from "react";
import { toggleTheme, getTheme } from "../theme.js";

export default function Navbar({ tabs = [], active, onTab, userName }) {
  const navigate = useNavigate();
  const session = getSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = userName || session?.name;
  const [dark, setDark] = useState(getTheme() === "dark");

  function handleThemeToggle() {
    const newIsDark = toggleTheme();
    setDark(newIsDark);
  }

  function signOut() {
    clearSession();
    window.location.href = "/index.html#/login";
    window.location.reload();
  }

  return (
    <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-sm border-b border-line">
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
            className="flex items-center gap-0.5 bg-white border border-line rounded-xl p-1 overflow-x-auto w-full"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
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

        {/* Right: theme toggle + name + sign out */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleThemeToggle}
            className="p-1.5 rounded-lg hover:bg-paper text-muted hover:text-ink transition-colors flex items-center justify-center border border-line/20"
            title={dark ? "Switch to light theme" : "Switch to dark theme"}
            aria-label="Toggle theme"
          >
            {dark ? (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 2.293a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zm2.707 5.707a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-2.293 4a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM11 17a1 1 0 100-2v-1a1 1 0 100 2v1zm-4-2.293a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM3 11a1 1 0 100-2h1a1 1 0 100 2h-1zm2.293-4a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM10 5a5 5 0 100 10 5 5 0 000-10z" clipRule="evenodd"/></svg>
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
            )}
          </button>
          <span className="text-xs text-muted font-mono">{displayName}</span>
          <button
            className="text-sm text-muted hover:text-bad transition-colors font-medium"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>

        {/* Mobile controls: Theme toggle + Hamburger */}
        <div className="sm:hidden flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleThemeToggle}
            className="p-1.5 rounded-lg hover:bg-paper text-muted hover:text-ink transition-colors flex items-center justify-center"
            aria-label="Toggle theme"
          >
            {dark ? (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 2.293a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zm2.707 5.707a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-2.293 4a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM11 17a1 1 0 100-2v-1a1 1 0 100 2v1zm-4-2.293a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM3 11a1 1 0 100-2h1a1 1 0 100 2h-1zm2.293-4a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM10 5a5 5 0 100 10 5 5 0 000-10z" clipRule="evenodd"/></svg>
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
            )}
          </button>
          <button
            className="flex flex-col gap-1 p-1.5 rounded-lg hover:bg-paper transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <span className={`block h-0.5 w-5 bg-ink transition-transform origin-center ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
            <span className={`block h-0.5 w-5 bg-ink transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-ink transition-transform origin-center ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
          </button>
        </div>
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
            <span className="text-xs text-muted font-mono">{displayName}</span>
            <button onClick={signOut} className="text-sm text-bad font-medium">Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}
