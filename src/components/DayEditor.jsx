import { useEffect, useState } from "react";
import { api } from "../api.js";

const STATUS_STYLES = {
  present: { bg: "#DCFCE7", text: "#16A34A", border: "#86EFAC", label: "✓ Present" },
  absent:  { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5", label: "✗ Absent" },
  cancelled: { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1", label: "— Skip" },
  holiday: { bg: "#FEF9C3", text: "#B45309", border: "#FDE68A", label: "🎉 Holiday" },
};

export default function DayEditor({ onAttendanceChange }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null); // slotId being saved

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

  useEffect(() => { load(date); }, [date]);

  async function mark(slotId, status) {
    setSaving(slotId);
    setSlots((prev) =>
      prev.map((s) => s.id === slotId ? { ...s, attendance: { ...(s.attendance || {}), status } } : s)
    );
    try {
      await api.post("/attendance/mark", { slot_id: slotId, date, status, source: "dashboard" });
      await load(date, true);
      if (onAttendanceChange) onAttendanceChange();
    } catch (err) {
      console.error("Error marking attendance:", err);
      load(date);
    } finally {
      setSaving(null);
    }
  }

  async function markWholeDay(status) {
    setSaving("day");
    setSlots((prev) =>
      prev.map((s) => !s.is_holiday ? { ...s, attendance: { ...(s.attendance || {}), status } } : s)
    );
    try {
      await api.post("/attendance/mark-day", { date, status, source: "dashboard" });
      await load(date, true);
      if (onAttendanceChange) onAttendanceChange();
    } catch (err) {
      console.error("Error marking whole day:", err);
      load(date);
    } finally {
      setSaving(null);
    }
  }

  const presentCount = slots.filter((s) => s.attendance?.status === "present").length;
  const totalMarkable = slots.filter((s) => !s.is_holiday).length;

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-line bg-paper/50">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="font-display font-bold text-base text-ink">Mark Attendance</div>
            {totalMarkable > 0 && (
              <div className="text-xs text-muted mt-0.5 font-mono">
                {presentCount}/{totalMarkable} present today
              </div>
            )}
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input !w-auto !py-1.5 !text-sm"
          />
        </div>

        {/* Quick actions */}
        {totalMarkable > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={() => markWholeDay("present")}
              disabled={saving === "day"}
              className="flex-1 min-w-[120px] py-2 rounded-xl text-xs font-bold border transition-all"
              style={{ background: "#DCFCE7", color: "#16A34A", borderColor: "#86EFAC" }}
            >
              ✓ All Present
            </button>
            <button
              onClick={() => markWholeDay("absent")}
              disabled={saving === "day"}
              className="flex-1 min-w-[120px] py-2 rounded-xl text-xs font-bold border transition-all"
              style={{ background: "#FEE2E2", color: "#DC2626", borderColor: "#FCA5A5" }}
            >
              ✗ All Absent
            </button>
          </div>
        )}
      </div>

      {/* Slots list */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-paper animate-pulse" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm text-muted font-medium">No classes scheduled for this day</div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {slots.map((s) => {
              const curStatus = s.is_holiday ? "holiday" : (s.attendance?.status || null);
              const isSaving = saving === s.id;
              return (
                <div
                  key={s.id}
                  className="rounded-xl border transition-all"
                  style={{
                    borderColor: curStatus ? STATUS_STYLES[curStatus]?.border : "#E5E2DB",
                    background: curStatus ? STATUS_STYLES[curStatus]?.bg + "60" : "white",
                    opacity: isSaving ? 0.6 : 1,
                  }}
                >
                  <div className="flex items-center gap-3 px-3 py-2.5 flex-wrap">
                    {/* Subject info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink truncate">{s.label || s.subject_name}</div>
                      <div className="text-[11px] text-muted font-mono mt-0.5">
                        {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                        {s.batch !== "ALL" ? <span className="ml-1.5 px-1.5 py-0.5 bg-ink/5 rounded-full">{s.batch}</span> : null}
                      </div>
                    </div>

                    {/* Status buttons or holiday badge */}
                    {s.is_holiday ? (
                      <span className="text-xs px-3 py-1.5 rounded-full font-bold"
                        style={{ background: STATUS_STYLES.holiday.bg, color: STATUS_STYLES.holiday.text, border: `1px solid ${STATUS_STYLES.holiday.border}` }}>
                        🎉 Holiday
                      </span>
                    ) : (
                      <div className="flex gap-1.5 flex-shrink-0">
                        {["present", "absent", "cancelled"].map((st) => {
                          const isActive = curStatus === st;
                          const style = STATUS_STYLES[st];
                          return (
                            <button
                              key={st}
                              onClick={() => mark(s.id, st)}
                              disabled={isSaving}
                              className="text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all"
                              style={isActive
                                ? { background: style.bg, color: style.text, borderColor: style.border, transform: "scale(1.05)" }
                                : { background: "white", color: "#94A3B8", borderColor: "#E2E8F0" }
                              }
                            >
                              {st === "present" ? "✓" : st === "absent" ? "✗" : "—"}
                              <span className="ml-1 hidden sm:inline capitalize">{st}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
