import { useEffect, useState } from "react";
import { api } from "../api.js";
import Navbar from "../components/Navbar.jsx";
import TimetableGrid from "../components/TimetableGrid.jsx";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "timetable", label: "Timetable" },
  { key: "holidays", label: "Holidays" },
  { key: "users", label: "Users" },
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
      </div>
    </div>
  );
}
