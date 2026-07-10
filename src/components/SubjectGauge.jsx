const THRESHOLD = Number(import.meta.env.VITE_ATTENDANCE_THRESHOLD || 75);

const COLOR_MAP = {
  safe: { ring: "#16A34A", text: "#16A34A", bg: "#DCFCE7" },
  warn: { ring: "#F59E0B", text: "#B45309", bg: "#FEF9C3" },
  bad:  { ring: "#E11D48", text: "#E11D48", bg: "#FEE2E2" },
};

export default function SubjectGauge({ subject }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, subject.percentage);
  const offset = c - (pct / 100) * c;
  const thresholdAngle = (THRESHOLD / 100) * 360 - 90;
  const tier = subject.safe ? "safe" : subject.percentage >= THRESHOLD - 10 ? "warn" : "bad";
  const color = COLOR_MAP[tier];

  const tx = 50 + 46 * Math.cos((thresholdAngle * Math.PI) / 180);
  const ty = 50 + 46 * Math.sin((thresholdAngle * Math.PI) / 180);

  return (
    <div className="card p-3 sm:p-4 flex flex-col items-center gap-2.5 bg-white border border-line/80 rounded-2xl shadow-soft hover:shadow-medium hover:border-primary/20 hover:-translate-y-1 transition-all duration-300">
      {/* Subject code pill */}
      <div className="text-[9px] font-mono font-bold tracking-wider text-muted/80 bg-paper px-1 py-0.5 rounded-full border border-line/50 w-full text-center">
        {subject.code}
      </div>

      {/* Circular gauge */}
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#F1F0EC" strokeWidth="9" />
          <circle
            cx="50" cy="50" r={r} fill="none" stroke={color.ring} strokeWidth="9"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-bold text-xl tracking-tight text-ink">{subject.percentage}%</span>
          <span className="text-[10px] text-muted font-mono">{subject.present}/{subject.total}</span>
        </div>
      </div>

      {/* Subject name */}
      <div className="text-center w-full">
        <div className="font-semibold text-xs leading-snug text-ink line-clamp-2 text-center" title={subject.name}>
          {subject.name}
        </div>
        <div
          className="text-[10px] mt-1.5 font-bold px-2 py-0.5 rounded-full inline-block"
          style={{ background: color.bg, color: color.text }}
        >
          {subject.safe
            ? `Skip ${subject.canSkip} more`
            : `Need ${subject.needToAttend} more`}
        </div>
      </div>
    </div>
  );
}
