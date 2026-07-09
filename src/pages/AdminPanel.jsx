import { useEffect, useState } from "react";
import { api } from "../api.js";
import Navbar from "../components/Navbar.jsx";
import TimetableGrid from "../components/TimetableGrid.jsx";

const TABS = [
  { key: "overview", label: "📊 Overview" },
  { key: "timetable", label: "📅 Timetable" },
  { key: "holidays", label: "🎉 Holidays" },
  { key: "users", label: "👥 Users" },
  { key: "attendance", label: "✅ Attendance" },
  { key: "settings", label: "⚙ Settings" },
];

const DAYS = [
  { v: 1, l: "Mon" }, { v: 2, l: "Tue" }, { v: 3, l: "Wed" },
  { v: 4, l: "Thu" }, { v: 5, l: "Fri" }, { v: 6, l: "Sat" }, { v: 0, l: "Sun" },
];

function StatCard({ icon, label, value, sub, color = "#6D5EF5" }) {
  return (
    <div className="card p-4 sm:p-5 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: color + "18" }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-muted text-xs font-semibold uppercase tracking-wider">{label}</div>
        <div className="font-display font-bold text-2xl sm:text-3xl mt-0.5" style={{ color }}>{value}</div>
        {sub && <div className="text-xs text-muted mt-0.5 font-mono">{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [week, setWeek] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceSlots, setAttendanceSlots] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [slotForm, setSlotForm] = useState({ day_of_week: 1, slot_number: 1, start_time: "08:30", end_time: "09:30", subject_id: "", batch: "ALL", label: "" });
  const [holidayForm, setHolidayForm] = useState({ date: "", reason: "" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [toast, setToast] = useState(null);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function reloadTimetable() {
    api.get("/timetable").then((r) => { setWeek(r.data.week); setSubjects(r.data.subjects); });
  }
  function reloadHolidays() {
    api.get("/admin/holidays").then((r) => setHolidays(r.data));
  }
  function reloadUsers() {
    api.get("/admin/users").then((r) => setUsers(r.data));
  }
  async function loadAttendance(d) {
    setAttendanceLoading(true);
    try {
      // Get all slots for that day, then show attendance status for all users
      // We use the timetable day to get expected slots
      const dayNum = new Date(d + "T00:00:00").getDay();
      const slots = week[dayNum] || [];
      setAttendanceSlots(slots);
    } catch (err) {
      console.error(err);
    } finally {
      setAttendanceLoading(false);
    }
  }

  useEffect(() => {
    api.get("/admin/overview").then((r) => setOverview(r.data));
    reloadTimetable();
    reloadHolidays();
    reloadUsers();
  }, []);

  useEffect(() => {
    if (tab === "attendance") loadAttendance(attendanceDate);
  }, [tab, attendanceDate, week]);

  async function addSlot(e) {
    e.preventDefault();
    try {
      await api.post("/timetable/slots", slotForm);
      reloadTimetable();
      showToast("Slot added successfully!");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to add slot", false);
    }
  }

  async function handleDeleteSlot(id) {
    if (!window.confirm("Are you sure you want to delete this class slot?")) return;
    try {
      await api.delete(`/timetable/slots/${id}`);
      reloadTimetable();
      showToast("Slot deleted.");
    } catch (err) {
      console.error("Error deleting slot:", err);
    }
  }

  async function addHoliday(e) {
    e.preventDefault();
    if (!holidayForm.date) return;
    try {
      await api.post("/admin/holidays", { date: holidayForm.date, reason: holidayForm.reason, slot_id: null });
      setHolidayForm({ date: "", reason: "" });
      reloadHolidays();
      showToast("Holiday declared!");
    } catch (err) {
      showToast("Failed to add holiday", false);
    }
  }

  async function removeHoliday(id) {
    await api.delete(`/admin/holidays/${id}`);
    reloadHolidays();
    showToast("Holiday removed.");
  }

  async function saveUser(u) {
    try {
      await api.put(`/admin/users/${u.id}`, { name: u.name, batch: u.batch, is_active: u.is_active });
      reloadUsers();
      setEditingUser(null);
      showToast("User updated!");
    } catch (err) {
      showToast("Failed to update user", false);
    }
  }

  async function deleteUser(id, name) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      reloadUsers();
      showToast("User deleted.");
    } catch (err) {
      showToast("Failed to delete user", false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ ok: false, text: "Passwords do not match" }); return; }
    if (pwForm.next.length < 8) { setPwMsg({ ok: false, text: "Min. 8 characters required" }); return; }
    setPwLoading(true);
    try {
      await api.post("/admin/change-password", { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwMsg({ ok: true, text: "✓ Password updated successfully!" });
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.error || "Failed to change password" });
    } finally {
      setPwLoading(false);
    }
  }

  const filteredUsers = users.filter((u) =>
    userSearch === "" ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.batch?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.telegram_username?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const todayPresent = overview?.todayMarks?.find((m) => m.status === "present")?.count ?? 0;
  const todayAbsent = overview?.todayMarks?.find((m) => m.status === "absent")?.count ?? 0;

  return (
    <div className="min-h-screen">
      <Navbar tabs={TABS} active={tab} onTab={setTab} />

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all"
          style={{
            background: toast.ok ? "#DCFCE7" : "#FEE2E2",
            color: toast.ok ? "#15803D" : "#DC2626",
            border: `1px solid ${toast.ok ? "#86EFAC" : "#FCA5A5"}`,
          }}
        >
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && overview && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon="👥" label="Active Students" value={overview.activeUsers} color="#6D5EF5" />
              <StatCard icon="✅" label="Present Today" value={todayPresent} color="#16A34A" />
              <StatCard icon="❌" label="Absent Today" value={todayAbsent} color="#E11D48" />
              <StatCard icon="📚" label="Total Subjects" value={subjects.length} color="#0891B2" />
            </div>

            <div className="card p-4 sm:p-5">
              <div className="font-display font-bold text-base mb-3 text-ink flex items-center gap-2">
                <span>⚠️</span> Lowest Attendance (At Risk)
              </div>
              {overview.lowAttendance.length === 0 ? (
                <div className="text-sm text-muted">All students above threshold 🎉</div>
              ) : (
                <div className="space-y-2.5">
                  {overview.lowAttendance.map((u, i) => {
                    const pct = u.percentage;
                    const barColor = pct >= 75 ? "#16A34A" : pct >= 65 ? "#F59E0B" : "#E11D48";
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-ink truncate">{u.name}</span>
                            <span className="text-xs text-muted font-mono">{u.batch}</span>
                          </div>
                          <div className="h-2 rounded-full bg-line overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                        </div>
                        <div className="text-sm font-bold font-mono flex-shrink-0" style={{ color: barColor }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TIMETABLE ── */}
        {tab === "timetable" && (
          <div className="space-y-4">
            <TimetableGrid week={week} onDeleteSlot={handleDeleteSlot} />
            <div className="card p-4">
              <div className="font-display font-bold text-base mb-3 text-ink">Add Class Slot</div>
              <form onSubmit={addSlot} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <select className="input" value={slotForm.day_of_week} onChange={(e) => setSlotForm({ ...slotForm, day_of_week: Number(e.target.value) })}>
                  {DAYS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                </select>
                <input className="input" type="number" min="1" placeholder="Slot #" value={slotForm.slot_number}
                  onChange={(e) => setSlotForm({ ...slotForm, slot_number: Number(e.target.value) })} />
                <select className="input" value={slotForm.batch} onChange={(e) => setSlotForm({ ...slotForm, batch: e.target.value })}>
                  <option value="ALL">All students</option>
                  <option value="G1">G1 only</option>
                  <option value="G2">G2 only</option>
                </select>
                <input className="input" type="time" value={slotForm.start_time}
                  onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })} />
                <input className="input" type="time" value={slotForm.end_time}
                  onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })} />
                <select className="input" value={slotForm.subject_id}
                  onChange={(e) => setSlotForm({ ...slotForm, subject_id: e.target.value })} required>
                  <option value="">Select subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input className="input col-span-2" placeholder="Label override (optional, e.g. 'CD - YP')"
                  value={slotForm.label} onChange={(e) => setSlotForm({ ...slotForm, label: e.target.value })} />
                <button className="btn-primary col-span-2 sm:col-span-1">+ Add Slot</button>
              </form>
            </div>
          </div>
        )}

        {/* ── HOLIDAYS ── */}
        {tab === "holidays" && (
          <div className="space-y-4">
            <div className="card p-4">
              <div className="font-display font-bold text-base mb-1 text-ink">Declare a Holiday</div>
              <p className="text-xs text-muted mb-4">Cancels every class for every student on that date — nothing counts against attendance.</p>
              <form onSubmit={addHoliday} className="flex flex-col sm:flex-row gap-3">
                <input className="input !w-auto" type="date" value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} required />
                <input className="input flex-1" placeholder="Reason (e.g. Republic Day)"
                  value={holidayForm.reason} onChange={(e) => setHolidayForm({ ...holidayForm, reason: e.target.value })} />
                <button className="btn-primary whitespace-nowrap">🎉 Mark Holiday</button>
              </form>
            </div>
            <div className="card p-4">
              <div className="font-display font-bold text-base mb-3 text-ink">Declared Holidays ({holidays.length})</div>
              {holidays.length === 0 ? (
                <div className="text-sm text-muted text-center py-6">No holidays declared yet.</div>
              ) : (
                <div className="space-y-2">
                  {holidays.map((h) => (
                    <div key={h.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-line hover:bg-paper/50">
                      <div>
                        <div className="text-sm font-semibold text-ink">
                          {h.date?.toString().slice(0, 10)}
                          {h.label ? ` — ${h.label}` : " (whole day)"}
                        </div>
                        <div className="text-xs text-muted mt-0.5">{h.reason || "No reason given"}</div>
                      </div>
                      <button
                        onClick={() => removeHoliday(h.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold flex-shrink-0 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                className="input flex-1"
                placeholder="Search by name, batch, or @telegram…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <div className="text-sm text-muted font-mono whitespace-nowrap">{filteredUsers.length} students</div>
            </div>
            <div className="card p-0 overflow-hidden">
              {filteredUsers.length === 0 ? (
                <div className="text-sm text-muted text-center py-10">No students found.</div>
              ) : (
                <div className="divide-y divide-line">
                  {filteredUsers.map((u) => (
                    <div key={u.id}>
                      {editingUser?.id === u.id ? (
                        /* Edit row */
                        <div className="p-4 bg-primary/5">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                            <input className="input" placeholder="Name" value={editingUser.name}
                              onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                            <select className="input" value={editingUser.batch}
                              onChange={(e) => setEditingUser({ ...editingUser, batch: e.target.value })}>
                              <option value="ALL">ALL</option>
                              <option value="G1">G1</option>
                              <option value="G2">G2</option>
                            </select>
                            <label className="flex items-center gap-2 text-sm font-medium text-ink">
                              <input type="checkbox" checked={editingUser.is_active}
                                onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                                className="w-4 h-4 accent-primary" />
                              Active
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => saveUser(editingUser)} className="btn-primary !py-1.5 !px-4 text-sm">Save</button>
                            <button onClick={() => setEditingUser(null)} className="btn-secondary !py-1.5 !px-4 text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-paper/50 transition-colors">
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                            {u.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-ink truncate">{u.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-paper rounded-full text-muted font-mono border border-line">{u.batch}</span>
                              {!u.is_active && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-red-50 rounded-full text-red-500 font-bold border border-red-100">Inactive</span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted font-mono mt-0.5">
                              @{u.telegram_username || "—"}
                              {u.telegram_id && <span className="ml-2 text-green-600">✓ connected</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-sm font-mono" style={{
                              color: u.percentage === null ? "#94A3B8" : u.percentage >= 75 ? "#16A34A" : u.percentage >= 65 ? "#F59E0B" : "#E11D48"
                            }}>
                              {u.percentage !== null ? `${u.percentage}%` : "—"}
                            </div>
                            <div className="flex gap-1.5 mt-1 justify-end">
                              <button
                                onClick={() => setEditingUser({ ...u })}
                                className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteUser(u.id, u.name)}
                                className="text-[10px] px-2 py-1 rounded-lg bg-red-50 text-red-500 font-bold hover:bg-red-100 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ATTENDANCE BROWSER ── */}
        {tab === "attendance" && (
          <div className="space-y-4">
            <div className="card p-4">
              <div className="font-display font-bold text-base mb-3 text-ink">Browse Attendance by Date</div>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="input !w-auto"
                  max={new Date().toISOString().slice(0, 10)}
                />
                <div className="text-sm text-muted font-mono">
                  {new Date(attendanceDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </div>
              </div>
            </div>

            {attendanceLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-paper animate-pulse" />)}
              </div>
            ) : attendanceSlots.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-3xl mb-2">📅</div>
                <div className="text-sm text-muted">No classes scheduled on this day.</div>
              </div>
            ) : (
              <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-line bg-paper/50">
                  <div className="font-semibold text-sm text-ink">{attendanceSlots.length} class slots scheduled</div>
                  <div className="text-xs text-muted mt-0.5">Timetable-based view — switch to Users tab to see per-student records</div>
                </div>
                <div className="divide-y divide-line">
                  {attendanceSlots.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <div
                        className="w-2 h-8 rounded-full flex-shrink-0"
                        style={{ background: s.color || "#6D5EF5" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-ink">{s.label || s.subject_name}</div>
                        <div className="text-xs text-muted font-mono">
                          {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                          {s.batch !== "ALL" && <span className="ml-2">{s.batch}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-muted">Slot {s.slot_number}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-user attendance summary */}
            <div className="card p-4">
              <div className="font-display font-bold text-base mb-3 text-ink">Student Attendance Summary</div>
              <div className="divide-y divide-line">
                {users.slice(0, 20).map((u) => {
                  const pct = u.percentage;
                  const barColor = pct >= 75 ? "#16A34A" : pct >= 65 ? "#F59E0B" : "#E11D48";
                  return (
                    <div key={u.id} className="flex items-center gap-3 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                        {u.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-ink truncate">{u.name}</span>
                          <span className="text-xs font-bold font-mono" style={{ color: pct !== null ? barColor : "#94A3B8" }}>
                            {pct !== null ? `${pct}%` : "—"}
                          </span>
                        </div>
                        {pct !== null && (
                          <div className="h-1.5 rounded-full bg-line overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <div className="max-w-md space-y-4">
            <div className="card p-5 sm:p-6">
              <div className="font-display font-bold text-lg mb-1">Change Password</div>
              <p className="text-muted text-sm mb-5">Enter your current password, then choose a new one.</p>
              <form onSubmit={changePassword} className="space-y-4">
                {[
                  { key: "current", label: "Current password", ph: "Enter current password", ac: "current-password" },
                  { key: "next", label: "New password", ph: "Min. 8 characters", ac: "new-password" },
                  { key: "confirm", label: "Confirm new password", ph: "Repeat new password", ac: "new-password" },
                ].map(({ key, label, ph, ac }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold mb-1.5 text-ink">{label}</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input"
                        style={{ paddingRight: "2.75rem" }}
                        type={showPw[key] ? "text" : "password"}
                        placeholder={ph}
                        value={pwForm[key]}
                        onChange={(e) => { setPwForm({ ...pwForm, [key]: e.target.value }); setPwMsg(null); }}
                        required
                        autoComplete={ac}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw({ ...showPw, [key]: !showPw[key] })}
                        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--muted)", lineHeight: 1 }}
                        tabIndex={-1}
                        aria-label="Toggle visibility"
                      >
                        {showPw[key] ? "🙈" : "👁"}
                      </button>
                    </div>
                  </div>
                ))}

                {pwMsg && (
                  <div style={{
                    padding: "10px 14px", borderRadius: "10px", fontSize: "13.5px", fontWeight: 600,
                    background: pwMsg.ok ? "#DCFCE7" : "#FEE2E2",
                    color: pwMsg.ok ? "#15803D" : "#DC2626",
                    border: `1px solid ${pwMsg.ok ? "#86EFAC" : "#FCA5A5"}`,
                  }}>
                    {pwMsg.text}
                  </div>
                )}

                <button className="btn-primary w-full" type="submit" disabled={pwLoading}
                  style={{ opacity: pwLoading ? 0.7 : 1 }}>
                  {pwLoading ? "Updating…" : "Update Password"}
                </button>
              </form>
            </div>

            {/* Info card */}
            <div className="card p-4">
              <div className="font-semibold text-sm text-ink mb-2">System Info</div>
              <div className="space-y-2 text-xs font-mono text-muted">
                <div className="flex justify-between"><span>Students</span><span className="font-bold text-ink">{users.length}</span></div>
                <div className="flex justify-between"><span>Subjects</span><span className="font-bold text-ink">{subjects.length}</span></div>
                <div className="flex justify-between"><span>Holidays</span><span className="font-bold text-ink">{holidays.length}</span></div>
                <div className="flex justify-between"><span>Attendance threshold</span><span className="font-bold text-ink">75%</span></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
