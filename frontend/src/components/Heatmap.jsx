export default function Heatmap({ data }) {
  const map = new Map(data.map((d) => [d.date?.slice ? d.date.slice(0, 10) : d.date, d]));
  const days = [];
  const today = new Date();
  for (let i = 119; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  function colorFor(dateKey) {
    const rec = map.get(dateKey);
    if (!rec || Number(rec.total) === 0) return "#EFEDE8";
    const pct = Number(rec.present) / Number(rec.total);
    if (pct === 1) return "#16A34A";
    if (pct >= 0.5) return "#F59E0B";
    return "#E11D48";
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="card p-4">
      <div className="font-display font-semibold mb-3">Last 120 Days</div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day}
                title={`${day}`}
                className="w-3.5 h-3.5 rounded-sm"
                style={{ background: colorFor(day) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-muted">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#16A34A" }} /> full day</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#F59E0B" }} /> partial</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#E11D48" }} /> absent</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#EFEDE8" }} /> no data</span>
      </div>
    </div>
  );
}
