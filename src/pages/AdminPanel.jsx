import { useEffect, useState } from "react";
import { api } from "../api.js";
import Navbar from "../components/Navbar.jsx";
import TimetableGrid from "../components/TimetableGrid.jsx";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "timetable", label: "Timetable" },
  { key: "holidays", label: "Holidays" },
  { key: "users", label: "Users" },
  { key: "settings", label: "⚙ Settings" },
];

const DAYS = [
  { v: 1, l: "Mon" }, { v: 2, l: "Tue" }, { v: 3, l: "Wed" },
  { v: 4, l: "Thu" }, { v: 5, l: "Fri" }, { v: 6, l: "Sat" }, { v: 0, l: "Sun" },
];

export default function AdminPanel() {
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [week, setWeek] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [users, setUsers] = useState([]);
  const [slotForm, setSlotForm] = useState({ day_of_week: 1, slot_number: 1, start_time: "08:30", end_time: "09:30", subject_id: "", batch: "ALL", label: "" });
  const [holidayForm, setHolidayForm] = useState({ date: "", reason: "" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null); // { ok: bool, text: string }
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  function reloadTimetable() {
    api.get("/timetable").then((r) => { setWeek(r.data.week); setSubjects(r.data.subjects); });
  }
  function reloadHolidays() {
    api.get("/admin/holidays").then((r) => setHolidays(r.data));
  }
  function reloadUsers() {
    api.get("/admin/users").then((r) => setUsers(r.data));
  }

  useEffect(() => {
    api.get("/admin/overview").then((r) => setOverview(r.data));
    reloadTimetable();
    reloadHolidays();
    reloadUsers();
  }, []);

  async function addSlot(e) {
    e.preventDefault();
    await api.post("/timetable/slots", slotForm);
    reloadTimetable();
  }

  async function handleDeleteSlot(id) {
    if (!window.confirm("Are you sure you want to delete this class slot?")) return;
    try {
      await api.delete(`/timetable/slots/${id}`);
      reloadTimetable();
    } catch (err) {
      console.error("Error deleting slot:", err);
    }
  }

  async function addHoliday(e) {
    e.preventDefault();
    if (!holidayForm.date) return;
    await api.post("/admin/holidays", { date: holidayForm.date, reason: holidayForm.reason, slot_id: null });
    setHolidayForm({ date: "", reason: "" });
    reloadHolidays();
  }

  async function removeHoliday(id) {
    await api.delete(`/admin/holidays/${id}`);
    reloadHolidays();
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ ok: false, text: "New passwords do not match" });
      return;
    }
    if (pwForm.next.length < 8) {
      setPwMsg({ ok: false, text: "New password must be at least 8 characters" });
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/admin/change-password", { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwMsg({ ok: true, text: "✓ Password changed successfully!" });
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.error || "Failed to change password" });
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar tabs={TABS} active={tab} onTab={setTab} />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {tab === "overview" && overview && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="text-muted text-sm">Active students</div>
              <div className="font-display font-bold text-3xl mt-1">{overview.activeUsers}</div>
            </div>
            <div className="card p-5">
              <div className="text-muted text-sm mb-2">Marked today</div>
              <div className="flex gap-3 text-sm">
                {overview.todayMarks.length === 0 ? <span className="text-muted">Nothing marked yet</span> :
                  overview.todayMarks.map((m) => <span key={m.status} className="font-mono">{m.status}: {m.count}</span>)}
              </div>
            </div>
            <div className="card p-5 sm:col-span-2">
              <div className="text-muted text-sm mb-2">Lowest attendance</div>
              <div className="space-y-1.5">
                {overview.lowAttendance.map((u, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{u.name} <span className="text-muted text-xs">({u.batch})</span></span>
                    <span className="font-mono text-bad">{u.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "timetable" && (
          <div className="space-y-4">
            <TimetableGrid week={week} onDeleteSlot={handleDeleteSlot} />
            <div className="card p-4">
              <div className="font-display font-semibold mb-3">Add / Edit Slot</div>
              <form onSubmit={addSlot} className="grid sm:grid-cols-3 gap-3">
                <select className="input" value={slotForm.day_of_week} onChange={(e) => setSlotForm({ ...slotForm, day_of_week: Number(e.target.value) })}>
                  {DAYS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                </select>
                <input className="input" type="number" min="1" placeholder="Slot #" value={slotForm.slot_number} onChange={(e) => setSlotForm({ ...slotForm, slot_number: Number(e.target.value) })} />
                <select className="input" value={slotForm.batch} onChange={(e) => setSlotForm({ ...slotForm, batch: e.target.value })}>
                  <option value="ALL">All students</option>
                  <option value="G1">G1 only</option>
                  <option value="G2">G2 only</option>
                </select>
                <input className="input" type="time" value={slotForm.start_time} onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })} />
                <input className="input" type="time" value={slotForm.end_time} onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })} />
                <select className="input" value={slotForm.subject_id} onChange={(e) => setSlotForm({ ...slotForm, subject_id: e.target.value })} required>
                  <option value="">Select subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input className="input sm:col-span-2" placeholder="Label override (optional, e.g. 'CD - YP')" value={slotForm.label} onChange={(e) => setSlotForm({ ...slotForm, label: e.target.value })} />
                <button className="btn-primary">Add slot</button>
              </form>
            </div>
          </div>
        )}

        {tab === "holidays" && (
          <div className="space-y-4">
            <div className="card p-4">
              <div className="font-display font-semibold mb-3">Declare a Holiday</div>
              <form onSubmit={addHoliday} className="flex flex-wrap gap-3">
                <input className="input w-auto" type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} required />
                <input className="input flex-1 min-w-[200px]" placeholder="Reason (e.g. Republic Day)" value={holidayForm.reason} onChange={(e) => setHolidayForm({ ...holidayForm, reason: e.target.value })} />
                <button className="btn-primary">Mark whole day off</button>
              </form>
              <p className="text-xs text-muted mt-2">This cancels every class for every student on that date — nothing gets counted against attendance.</p>
            </div>
            <div className="card p-4">
              <div className="font-display font-semibold mb-3">Declared Holidays</div>
              <div className="space-y-1.5">
                {holidays.map((h) => (
                  <div key={h.id} className="flex justify-between items-center text-sm border-b border-line last:border-0 py-2">
                    <span>{h.date?.toString().slice(0, 10)} — {h.reason || "No reason given"} {h.label ? `(${h.label})` : "(whole day)"}</span>
                    <button className="text-bad text-xs" onClick={() => removeHoliday(h.id)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="card p-4">
            <div className="font-display font-semibold mb-3">Students</div>
            <div className="space-y-1.5">
              {users.map((u) => (
                <div key={u.id} className="flex justify-between items-center text-sm border-b border-line last:border-0 py-2">
                  <div>
                    <div className="font-medium">{u.name} <span className="text-muted text-xs">({u.batch})</span></div>
                    <div className="text-xs text-muted font-mono">@{u.telegram_username || "—"}</div>
                  </div>
                  <span className="font-mono">{u.percentage !== null ? `${u.percentage}%` : "no data"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="max-w-md">
            <div className="card p-6">
              <div className="font-display font-bold text-lg mb-1">Change Admin Password</div>
              <p className="text-muted text-sm mb-5">Update your admin account password. You&rsquo;ll need to enter your current password to confirm.</p>
              <form onSubmit={changePassword} className="space-y-4">
                {["current", "next", "confirm"].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--text2)" }}>
                      {field === "current" ? "Current password" : field === "next" ? "New password" : "Confirm new password"}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input w-full"
                        style={{ paddingRight: "2.75rem" }}
                        type={showPw[field] ? "text" : "password"}
                        placeholder={field === "current" ? "Enter current password" : field === "next" ? "Min. 8 characters" : "Repeat new password"}
                        value={pwForm[field]}
                        onChange={(e) => { setPwForm({ ...pwForm, [field]: e.target.value }); setPwMsg(null); }}
                        required
                        autoComplete={field === "current" ? "current-password" : "new-password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw({ ...showPw, [field]: !showPw[field] })}
                        style={{
                          position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                          background: "none", border: "none", cursor: "pointer", fontSize: "16px",
                          color: "var(--muted)", lineHeight: 1,
                        }}
                        tabIndex={-1}
                        aria-label="Toggle visibility"
                      >
                        {showPw[field] ? "🙈" : "👁"}
                      </button>
                    </div>
                  </div>
                ))}

                {pwMsg && (
                  <div style={{
                    padding: "10px 14px", borderRadius: "10px", fontSize: "13.5px", fontWeight: 600,
                    background: pwMsg.ok ? "var(--green-light, #ecfdf5)" : "#fff1f2",
                    color: pwMsg.ok ? "var(--green, #059669)" : "#e11d48",
                    border: `1px solid ${pwMsg.ok ? "#6ee7b7" : "#fecdd3"}`,
                  }}>
                    {pwMsg.text}
                  </div>
                )}

                <button
                  className="btn-primary w-full"
                  type="submit"
                  disabled={pwLoading}
                  style={{ opacity: pwLoading ? 0.7 : 1, width: "100%" }}
                >
                  {pwLoading ? "Updating…" : "Update Password"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
