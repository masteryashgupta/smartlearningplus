import { useEffect, useState } from "react";
import { api } from "../api.js";

const STATUS_STYLES = {
  present: "bg-good/10 text-good border-good/30",
  absent: "bg-bad/10 text-bad border-bad/30",
  cancelled: "bg-muted/10 text-muted border-muted/30",
  holiday: "bg-warn/10 text-warn border-warn/30",
};

export default function DayEditor({ onAttendanceChange }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load(d, silent = false) {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/attendance/day/${d}`);
      setSlots(data);
    } catch (err) {
      console.error("Error loading day attendance:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load(date);
  }, [date]);

  async function mark(slotId, status) {
    // Optimistic update
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          return {
            ...s,
            attendance: { ...(s.attendance || {}), status },
          };
        }
        return s;
      })
    );

    try {
      await api.post("/attendance/mark", { slot_id: slotId, date, status, source: "dashboard" });
      await load(date, true);
      if (onAttendanceChange) onAttendanceChange();
    } catch (err) {
      console.error("Error marking attendance:", err);
      // Revert in case of error
      load(date);
    }
  }

  async function markWholeDay(status) {
    // Optimistic update
    setSlots((prev) =>
      prev.map((s) => {
        if (!s.is_holiday) {
          return {
            ...s,
            attendance: { ...(s.attendance || {}), status },
          };
        }
        return s;
      })
    );

    try {
      await api.post("/attendance/mark-day", { date, status, source: "dashboard" });
      await load(date, true);
      if (onAttendanceChange) onAttendanceChange();
    } catch (err) {
      console.error("Error marking whole day attendance:", err);
      // Revert in case of error
      load(date);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="font-display font-semibold">Mark / Edit Attendance</div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-auto py-1.5" />
          <button className="btn-secondary text-sm py-1.5" onClick={() => markWholeDay("present")}>
            Mark day present
          </button>
          <button className="btn-secondary text-sm py-1.5 text-bad" onClick={() => markWholeDay("absent")}>
            Mark day absent
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted text-sm">Loading…</div>
      ) : slots.length === 0 ? (
        <div className="text-muted text-sm">No classes scheduled this day.</div>
      ) : (
        <div className="space-y-2">
          {slots.map((s) => (
            <div key={s.id} className="flex items-center justify-between border border-line rounded-xl px-3 py-2 flex-wrap gap-2">
              <div>
                <div className="font-medium text-sm">{s.label || s.subject_name}</div>
                <div className="text-xs text-muted font-mono">
                  {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)} {s.batch !== "ALL" ? `· ${s.batch}` : ""}
                </div>
              </div>
              {s.is_holiday ? (
                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_STYLES.holiday}`}>
                  Holiday{s.holiday_reason ? ` — ${s.holiday_reason}` : ""}
                </span>
              ) : (
                <div className="flex gap-1.5">
                  {["present", "absent", "cancelled"].map((st) => (
                    <button
                      key={st}
                      onClick={() => mark(s.id, st)}
                      className={`text-xs px-2.5 py-1 rounded-full border capitalize transition-colors ${
                        s.attendance?.status === st ? STATUS_STYLES[st] : "border-line text-muted hover:bg-paper"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
