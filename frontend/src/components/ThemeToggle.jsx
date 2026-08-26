import { useEffect, useState } from "react";

/**
 * Compact theme toggle button — designed to live inside a navbar.
 * Uses no fixed positioning; caller controls placement.
 */
export default function ThemeToggle({ className = "" }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.removeItem("theme");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "34px",
        height: "34px",
        borderRadius: "10px",
        border: "1.5px solid var(--border, #e2e8f0)",
        background: "var(--surface, #ffffff)",
        color: "var(--text, #0f172a)",
        fontSize: "16px",
        cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s, transform 0.15s",
        flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
