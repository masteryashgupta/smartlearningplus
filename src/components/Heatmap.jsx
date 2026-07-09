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

  function tooltipFor(dateKey) {
    const rec = map.get(dateKey);
    if (!rec || Number(rec.total) === 0) return dateKey;
    return `${dateKey}: ${rec.present}/${rec.total} present`;
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="w-full">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 flex-shrink-0">
            {week.map((day) => (
              <div
                key={day}
                title={tooltipFor(day)}
                className="w-3 h-3 rounded-sm cursor-default transition-transform hover:scale-125"
                style={{ background: colorFor(day) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted flex-wrap justify-center">
        {[
          { color: "#16A34A", label: "Full day" },
          { color: "#F59E0B", label: "Partial" },
          { color: "#E11D48", label: "Absent" },
          { color: "#EFEDE8", label: "No data" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
