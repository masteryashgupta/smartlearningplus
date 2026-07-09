const DAY_LABELS = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
const DAY_ORDER = [1, 2, 3, 4, 5, 6];

const COLS = [
  { type: "slot", num: 1, name: "8:30–9:30", startMin: 8 * 60 + 30, endMin: 9 * 60 + 30 },
  { type: "slot", num: 2, name: "9:30–10:30", startMin: 9 * 60 + 30, endMin: 10 * 60 + 30 },
  { type: "slot", num: 3, name: "10:30–11:30", startMin: 10 * 60 + 30, endMin: 11 * 60 + 30 },
  { type: "slot", num: 4, name: "11:30–12:30", startMin: 11 * 60 + 30, endMin: 12 * 60 + 30 },
  { type: "break", name: "12:30–1:30" },
  { type: "slot", num: 5, name: "1:30–2:30", startMin: 13 * 60 + 30, endMin: 14 * 60 + 30 },
  { type: "slot", num: 6, name: "2:30–3:30", startMin: 14 * 60 + 30, endMin: 15 * 60 + 30 },
];

function getSlotSpan(s, colIdx) {
  if (!s.start_time || !s.end_time) return 1;

  const [endH, endM] = s.end_time.split(":").map(Number);
  const endTotal = endH * 60 + endM;

  let span = 1;
  let currentColIdx = colIdx;

  while (currentColIdx < COLS.length - 1) {
    const nextCol = COLS[currentColIdx + 1];
    if (nextCol.type === "break") {
      break;
    }

    const currentCol = COLS[currentColIdx];
    if (endTotal > currentCol.endMin) {
      span++;
      currentColIdx++;
    } else {
      break;
    }
  }
  return span;
}

export default function TimetableGrid({ week, onDeleteSlot }) {
  return (
    <div className="card p-4 overflow-x-auto bg-white border border-line rounded-xl shadow-soft">
      <div className="font-display font-semibold mb-3 text-ink">Weekly Timetable</div>
      <table className="w-full text-sm border-collapse min-w-[760px]">
        <thead>
          <tr>
            <th className="text-left text-muted font-medium pb-3 pr-2 w-16 align-middle">Day</th>
            {COLS.map((col, idx) => (
              <th key={idx} className={`pb-3 px-1.5 text-center text-muted font-medium align-middle ${col.type === 'break' ? 'w-20' : ''}`}>
                <div className="text-xs">{col.name}</div>
                {col.type === "slot" && (
                  <div className="text-[10px] font-mono opacity-60">Slot {col.num}</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAY_ORDER.map((d) => {
            const slots = week[d] || [];
            const skippedCols = new Set();

            return (
              <tr key={d} className="border-t border-line hover:bg-paper/10">
                <td className="py-3 pr-2 font-semibold text-ink align-middle">{DAY_LABELS[d]}</td>
                {COLS.map((col, colIdx) => {
                  if (skippedCols.has(colIdx)) {
                    return null;
                  }

                  if (col.type === "break") {
                    return (
                      <td key={colIdx} className="px-1.5 py-3 text-center align-middle bg-paper/20 border-l border-r border-line/40">
                        <span className="text-[9px] text-muted tracking-wider font-mono uppercase font-semibold">BREAK</span>
                      </td>
                    );
                  }

                  const slotsForCol = slots.filter((s) => s.slot_number === col.num);
                  if (slotsForCol.length === 0) {
                    return <td key={colIdx} className="px-1.5 py-3 align-middle" />;
                  }

                  // Calculate how many columns this cell should span
                  const cellSpan = Math.max(
                    1,
                    ...slotsForCol.map((s) => getSlotSpan(s, colIdx))
                  );

                  // Mark future columns in the span as skipped
                  for (let offset = 1; offset < cellSpan; offset++) {
                    skippedCols.add(colIdx + offset);
                  }

                  return (
                    <td key={colIdx} colSpan={cellSpan} className="px-1.5 py-3 align-middle">
                      <div className="space-y-1.5">
                        {slotsForCol.map((s) => (
                          <div
                            key={s.id}
                            className="relative group rounded-lg p-2 text-xs leading-tight border border-current/10 transition-shadow hover:shadow-soft"
                            style={{ background: (s.color || "#5B5BD6") + "1A", color: s.color || "#5B5BD6" }}
                          >
                            <div className="font-semibold pr-3">{s.label || s.subject_name}</div>
                            <div className="text-[9px] opacity-85 font-mono mt-1">
                              {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                              {s.batch !== "ALL" ? ` · ${s.batch}` : ""}
                            </div>
                            
                            {onDeleteSlot && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onDeleteSlot(s.id);
                                }}
                                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center h-4 w-4 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px] font-bold shadow-soft transition-all"
                                title="Delete class"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
