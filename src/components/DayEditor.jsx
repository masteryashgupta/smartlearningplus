import { useEffect, useState } from "react";
import { api } from "../api.js";

const STATUS_STYLES = {
  present:   { bg: "#DCFCE7", text: "#16A34A", border: "#86EFAC", label: "✓ Present" },
  absent:    { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5", label: "✗ Absent" },
  cancelled: { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1", label: "— Skip" },
  holiday:   { bg: "#FEF9C3", text: "#B45309", border: "#FDE68A", label: "🎉 Holiday" },
};

// Predefined time slot options
const SLOT_OPTIONS = [
  { label: "Slot 1 — 08:30–09:30", value: "08:30–09:30" },
  { label: "Slot 2 — 09:30–10:30", value: "09:30–10:30" },
  { label: "Slot 3 — 10:30–11:30", value: "10:30–11:30" },
  { label: "Slot 4 — 11:30–12:30", value: "11:30–12:30" },
  { label: "Slot 5 — 13:30–14:30", value: "13:30–14:30" },
  { label: "Slot 5/6 Lab — 13:30–15:30", value: "13:30–15:30" },
  { label: "Slot 6 — 14:30–15:30", value: "14:30–15:30" },
];

export default function DayEditor({ onAttendanceChange, subjects = [] }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [extraSlots, setExtraSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null); // slotId being saved

  // Add class modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState("class");
  const [addSlot, setAddSlot] = useState(SLOT_OPTIONS[0].value);
  const [addSubjectId, setAddSubjectId] = useState("");
  const [addBatch, setAddBatch] = useState("G1");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  const theorySubjects = subjects.filter((s) => s.type === "theory");
  const labSubjects    = subjects.filter((s) => s.type === "lab");
  const activeSubjects = addType === "class" ? theorySubjects : labSubjects;

  async function load(d, silent = false) {
    if (!silent) setLoading(true);
    try {
      const [dayRes, extraRes] = await Promise.all([
        api.get(`/attendance/day/${d}`),
        api.get(`/attendance/extra/${d}`),
      ]);
      setSlots(dayRes.data);
      setExtraSlots(extraRes.data);
    } catch (err) {
      console.error("Error loading day attendance:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { load(date); }, [date]);

  // Reset subject selection when type changes
  useEffect(() => { setAddSubjectId(""); }, [addType]);

  // Auto-select lab slot when type switches to lab
  useEffect(() => {
    if (addType === "lab") setAddSlot("13:30–15:30");
    else setAddSlot(SLOT_OPTIONS[0].value);
  }, [addType]);

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

  async function markExtra(extraId, status) {
    setSaving(extraId);
    setExtraSlots((prev) =>
      prev.map((s) => s.id === extraId ? { ...s, status } : s)
    );
    try {
      await api.patch(`/attendance/extra/${extraId}`, { status });
      await load(date, true);
      if (onAttendanceChange) onAttendanceChange();
    } catch (err) {
      console.error("Error marking extra slot:", err);
      load(date);
    } finally {
      setSaving(null);
    }
  }

  async function deleteExtra(extraId) {
    setSaving(extraId + "_del");
    try {
      await api.delete(`/attendance/extra/${extraId}`);
      await load(date, true);
      if (onAttendanceChange) onAttendanceChange();
    } catch (err) {
      console.error("Error deleting extra slot:", err);
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

  async function handleAddClass(e) {
    e.preventDefault();
    setAddError(null);
    if (!addSubjectId) { setAddError("Please select a subject."); return; }
    setAddLoading(true);
    try {
      await api.post("/attendance/extra", {
        date,
        subject_id: addSubjectId,
        type: addType,
        slot_label: addSlot,
        batch: addType === "lab" ? addBatch : undefined,
      });
      setShowAddModal(false);
      setAddSubjectId("");
      await load(date, true);
      if (onAttendanceChange) onAttendanceChange();
    } catch (err) {
      setAddError(err.response?.data?.error || "Failed to add class. Please try again.");
    } finally {
      setAddLoading(false);
    }
  }

  const presentCount = slots.filter((s) => s.attendance?.status === "present").length
    + extraSlots.filter((s) => s.status === "present").length;
  const totalMarkable = slots.filter((s) => !s.is_holiday).length + extraSlots.length;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="pb-4 mb-4 border-b border-line">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-xs text-ink uppercase tracking-wider">Mark Attendance</h3>
            {totalMarkable > 0 && (
              <div className="text-xs text-muted mt-0.5 font-mono">
                {presentCount}/{totalMarkable} present today
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              id="add-class-btn"
              onClick={() => { setShowAddModal(true); setAddError(null); }}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all"
              style={{
                background: "linear-gradient(135deg, #eff6ff, #f0fdf4)",
                color: "#2563eb",
                borderColor: "#bfdbfe",
              }}
              title="Add a one-off class or lab just for yourself on this date"
            >
              <span style={{ fontSize: "15px", lineHeight: 1 }}>＋</span>
              <span>Add Class</span>
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input !w-auto !py-1.5 !px-2.5 !text-xs font-bold"
            />
          </div>
        </div>

        {/* Quick actions */}
        {totalMarkable > 0 && (
          <div className="flex gap-2 mt-3.5">
            <button
              onClick={() => markWholeDay("present")}
              disabled={saving === "day"}
              className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
              style={{ background: "#DCFCE7", color: "#16A34A", borderColor: "#86EFAC" }}
            >
              ✓ All Present
            </button>
            <button
              onClick={() => markWholeDay("absent")}
              disabled={saving === "day"}
              className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
              style={{ background: "#FEE2E2", color: "#DC2626", borderColor: "#FCA5A5" }}
            >
              ✗ All Absent
            </button>
          </div>
        )}
      </div>

      {/* Slots list */}
      <div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-paper animate-pulse" />
            ))}
          </div>
        ) : slots.length === 0 && extraSlots.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm text-muted font-medium">No classes scheduled for this day</div>
            <div className="text-xs text-muted mt-1">Use "+ Add Class" to log an extra class</div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Admin-set slots */}
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

            {/* User-added extra slots */}
            {extraSlots.map((s) => {
              const isSaving = saving === s.id || saving === s.id + "_del";
              const curStatus = s.status;
              return (
                <div
                  key={s.id}
                  className="rounded-xl border transition-all"
                  style={{
                    borderColor: curStatus ? STATUS_STYLES[curStatus]?.border : "#E5E2DB",
                    background: curStatus ? STATUS_STYLES[curStatus]?.bg + "50" : "white",
                    opacity: isSaving ? 0.5 : 1,
                    borderStyle: "dashed",
                  }}
                >
                  <div className="flex items-center gap-3 px-3 py-2.5 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-ink truncate">
                          {s.subject_name || "Unknown Subject"}
                        </span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "#EFF6FF", color: "#2563eb", border: "1px solid #BFDBFE" }}
                        >
                          {s.type === "lab" ? "🧪 Extra Lab" : "📚 Extra Class"}
                        </span>
                        {s.batch && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-ink/5 rounded-full font-mono">
                            {s.batch}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted font-mono mt-0.5">{s.slot_label}</div>
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0 items-center">
                      {["present", "absent", "cancelled"].map((st) => {
                        const isActive = curStatus === st;
                        const style = STATUS_STYLES[st];
                        return (
                          <button
                            key={st}
                            onClick={() => markExtra(s.id, st)}
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
                      {/* Delete button */}
                      <button
                        onClick={() => {
                          if (window.confirm("Remove this extra class?")) deleteExtra(s.id);
                        }}
                        disabled={isSaving}
                        title="Remove extra class"
                        className="ml-1 text-xs px-2 py-1.5 rounded-lg border transition-all"
                        style={{ background: "white", color: "#EF4444", borderColor: "#FECACA" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add Class Modal ────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: "white",
              border: "1px solid #E2E8F0",
              animation: "addModalIn 0.22s cubic-bezier(.2,.8,.2,1) both",
            }}
          >
            {/* Modal header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)", borderBottom: "1px solid #E2E8F0" }}
            >
              <div>
                <div className="font-bold text-sm text-ink">Add Extra Class</div>
                <div className="text-[11px] text-muted mt-0.5">Only visible to you · {date}</div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted hover:text-ink transition-colors text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleAddClass} className="px-5 py-5 space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "class", icon: "📚", label: "Class" },
                    { value: "lab",   icon: "🧪", label: "Lab" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAddType(opt.value)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                      style={addType === opt.value
                        ? { background: "#EFF6FF", color: "#2563eb", borderColor: "#2563eb", fontWeight: 700 }
                        : { background: "white", color: "#64748b", borderColor: "#E2E8F0" }
                      }
                    >
                      <span>{opt.icon}</span> {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slot */}
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Time Slot</label>
                <select
                  value={addSlot}
                  onChange={(e) => setAddSlot(e.target.value)}
                  className="input w-full !text-sm"
                >
                  {SLOT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                  {addType === "class" ? "Subject" : "Lab"}
                </label>
                {activeSubjects.length === 0 ? (
                  <div className="text-xs text-muted italic py-2">
                    No {addType === "class" ? "subjects" : "labs"} found. Make sure your timetable is set up.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {activeSubjects.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setAddSubjectId(sub.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all text-sm"
                        style={addSubjectId === sub.id
                          ? { background: sub.color + "22", borderColor: sub.color, color: "#1e293b", fontWeight: 600 }
                          : { background: "white", borderColor: "#E2E8F0", color: "#334155" }
                        }
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: sub.color }}
                        />
                        <span className="font-mono text-[10px] text-muted flex-shrink-0">{sub.code}</span>
                        <span className="truncate">{sub.name}</span>
                        {addSubjectId === sub.id && <span className="ml-auto text-xs" style={{ color: sub.color }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lab batch (only for labs) */}
              {addType === "lab" && (
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Your Batch</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["G1", "G2"].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setAddBatch(b)}
                        className="py-2.5 rounded-xl text-sm font-bold border transition-all"
                        style={addBatch === b
                          ? { background: "#F0FDF4", color: "#16A34A", borderColor: "#16A34A" }
                          : { background: "white", color: "#64748b", borderColor: "#E2E8F0" }
                        }
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error message */}
              {addError && (
                <div
                  className="text-xs px-3 py-2 rounded-lg font-medium"
                  style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
                >
                  {addError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                  style={{ background: "white", color: "#64748b", borderColor: "#E2E8F0" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading || !addSubjectId}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{
                    background: addLoading || !addSubjectId
                      ? "#93C5FD"
                      : "linear-gradient(135deg, #2563eb, #6366f1)",
                    cursor: addLoading || !addSubjectId ? "not-allowed" : "pointer",
                  }}
                >
                  {addLoading ? "Adding…" : "Add Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal animation keyframes injected once */}
      <style>{`
        @keyframes addModalIn {
          from { opacity: 0; transform: scale(0.93) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
