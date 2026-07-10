const THRESHOLD = Number(import.meta.env.VITE_ATTENDANCE_THRESHOLD || 75);

const COLOR_MAP = {
  safe: { ring: "#16A34A", text: "#16A34A", bg: "#DCFCE7", track: "#BBF7D0" },
  warn: { ring: "#F59E0B", text: "#B45309", bg: "#FEF9C3", track: "#FDE68A" },
  bad:  { ring: "#E11D48", text: "#E11D48", bg: "#FEE2E2", track: "#FECACA" },
};

export default function SubjectGauge({ subject }) {
  // Smaller radius for compact 8-col grid
  const size = 64;
  const r = 26;
  const strokeW = 6;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, subject.percentage ?? 0);
  const offset = c - (pct / 100) * c;
  const tier = subject.safe ? "safe" : subject.percentage >= THRESHOLD - 10 ? "warn" : "bad";
  const color = COLOR_MAP[tier];

  return (
    <div
      className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-line/60 bg-white hover:border-current/20 hover:-translate-y-0.5 transition-all duration-200 cursor-default"
      style={{ "--tw-border-opacity": 1 }}
    >
      {/* Subject code */}
      <div
        className="text-[9px] font-mono font-bold tracking-widest uppercase w-full text-center truncate px-0.5"
        style={{ color: color.ring }}
        title={subject.code}
      >
        {subject.code}
      </div>

      {/* Compact circular SVG gauge */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx="32" cy="32" r={r}
            fill="none"
            stroke="#F1F0EC"
            strokeWidth={strokeW}
          />
          {/* Progress arc */}
          <circle
            cx="32" cy="32" r={r}
            fill="none"
            stroke={color.ring}
            strokeWidth={strokeW}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold leading-none"
            style={{ fontSize: pct === 100 ? "10px" : "11px", color: color.ring }}
          >
            {pct}%
          </span>
          <span className="text-[8px] text-muted/70 font-mono leading-none mt-0.5">
            {subject.present}/{subject.total}
          </span>
        </div>
      </div>

      {/* Short subject name */}
      <div
        className="text-[9px] font-semibold text-center text-ink/80 leading-tight w-full truncate px-0.5"
        title={subject.name}
      >
        {subject.name}
      </div>

      {/* Skip / Need badge */}
      <div
        className="text-[8px] font-bold px-1.5 py-0.5 rounded-full w-full text-center leading-none"
        style={{ background: color.bg, color: color.text }}
      >
        {subject.safe
          ? `Skip ${subject.canSkip}`
          : `Need ${subject.needToAttend}`}
      </div>
    </div>
  );
}
