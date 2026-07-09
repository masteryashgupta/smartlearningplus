const THRESHOLD = Number(import.meta.env.VITE_ATTENDANCE_THRESHOLD || 75);

export default function SubjectGauge({ subject }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, subject.percentage);
  const offset = c - (pct / 100) * c;
  const thresholdAngle = (THRESHOLD / 100) * 360 - 90;
  const color = subject.safe ? "#16A34A" : subject.percentage >= THRESHOLD - 10 ? "#F59E0B" : "#E11D48";

  const tx = 50 + 46 * Math.cos((thresholdAngle * Math.PI) / 180);
  const ty = 50 + 46 * Math.sin((thresholdAngle * Math.PI) / 180);

  return (
    <div className="card p-5 flex flex-col items-center gap-3 bg-white border border-line/80 rounded-2xl shadow-soft hover:shadow-medium hover:border-primary/20 hover:-translate-y-1 transition-all duration-300">
      <div className="text-[10px] font-mono font-bold tracking-wider text-muted/80 bg-paper px-2 py-0.5 rounded-full border border-line/50">
        {subject.code}
      </div>
      <div className="relative w-28 h-28 my-1">
        <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#F1F0EC" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        {/* threshold tick mark */}
        <div
          className="absolute w-2 h-2 rounded-full bg-slate-900 border border-white shadow-soft"
          style={{ left: `${tx}%`, top: `${ty}%`, transform: "translate(-50%,-50%)" }}
          title={`${THRESHOLD}% threshold`}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-bold text-2xl tracking-tight text-ink">{subject.percentage}%</span>
          <span className="text-[10px] text-muted font-mono bg-paper/60 px-1.5 py-0.5 rounded">{subject.present}/{subject.total}</span>
        </div>
      </div>
      <div className="text-center w-full">
        <div className="font-semibold text-sm leading-snug text-ink truncate" title={subject.name}>{subject.name}</div>
        <div className="text-xs mt-1.5 font-medium leading-none" style={{ color }}>
          {subject.safe ? `Can skip ${subject.canSkip} more` : `Attend next ${subject.needToAttend} to recover`}
        </div>
      </div>
    </div>
  );
}
