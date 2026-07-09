import { useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../api.js";

export default function Navbar({ tabs = [], active, onTab }) {
  const navigate = useNavigate();
  const session = getSession();

  return (
    <div className="sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-line">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-display font-bold text-lg leading-none text-primary flex items-center gap-1.5">
            <span className="font-extrabold tracking-tight">Attendance<span className="text-muted font-light font-mono text-xs ml-1 px-1 bg-primary/10 rounded">OS</span></span>
          </div>
          <div className="text-xs text-muted font-mono">{session?.name}</div>
        <div className="flex items-center gap-1 bg-white border border-line rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => onTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active === t.key ? "bg-primary text-white" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          className="text-sm text-muted hover:text-bad transition-colors"
          onClick={() => {
            clearSession();
            navigate("/login");
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
