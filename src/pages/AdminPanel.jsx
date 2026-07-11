import { useEffect, useState } from "react";
import { api } from "../api.js";
import Navbar from "../components/Navbar.jsx";
import TimetableGrid from "../components/TimetableGrid.jsx";

const TABS = [
  { key: "overview",   label: "Overview" },
  { key: "timetable", label: "Timetable" },
  { key: "holidays",  label: "Holidays" },
  { key: "users",     label: "Users" },
  { key: "registrations", label: "Registration Requests" },
  { key: "whitelist", label: "Whitelist" },
  { key: "materials", label: "Approvals" },
  { key: "attendance",label: "Attendance" },
  { key: "health",    label: "Health Status" },
  { key: "broadcast", label: "Broadcast" },
  { key: "moderator-logs", label: "Moderator Logs" },
  { key: "settings",  label: "Settings" },
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

export default function AdminPanel({ onClose }) {
  const role = localStorage.getItem("role");
  const isModeratorSession = localStorage.getItem("is_moderator") === "true";

  const allowedTabs = TABS.filter((t) => {
    if (role === "admin") return true;
    if (role === "student" && isModeratorSession) {
      return ["whitelist", "materials"].includes(t.key);
    }
    return false;
  });

  const [tab, setTab] = useState(role === "admin" ? "overview" : "materials");
  const [overview, setOverview] = useState(null);
  const [week, setWeek] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [expandedUserStats, setExpandedUserStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [pendingMaterials, setPendingMaterials] = useState([]);
  const [pendingMaterialsCount, setPendingMaterialsCount] = useState(0);
  const [approvedMaterials, setApprovedMaterials] = useState([]);
  const [materialsSubTab, setMaterialsSubTab] = useState("pending");
  const [previewMaterialId, setPreviewMaterialId] = useState(null);
  const [rejectionInputId, setRejectionInputId] = useState(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [moderatorLogs, setModeratorLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  function toggleUserStats(userId) {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setExpandedUserStats(null);
    } else {
      setExpandedUserId(userId);
      setExpandedUserStats(null);
      setStatsLoading(true);
      api.get(`/admin/users/${userId}/stats`)
        .then((r) => setExpandedUserStats(r.data))
        .catch((err) => console.error("Error fetching user stats:", err))
        .finally(() => setStatsLoading(false));
    }
  }

  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceSlots, setAttendanceSlots] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [slotForm, setSlotForm] = useState({ day_of_week: 1, slot_number: 1, start_time: "08:30", end_time: "09:30", subject_id: "", batch: "ALL", label: "" });
  const [holidayForm, setHolidayForm] = useState({ date: "", reason: "" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  // Broadcast States
  const [broadcastChannels, setBroadcastChannels] = useState({ email: true, telegram: true });
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState(null);

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setBroadcastMsg(null);
    if (!broadcastChannels.email && !broadcastChannels.telegram) {
      return setBroadcastMsg({ ok: false, text: "Please select at least one channel (Email or Telegram)." });
    }
    
    const confirmSend = window.confirm(
      `Are you sure you want to send this announcement to ALL active users?`
    );
    if (!confirmSend) return;

    setBroadcastLoading(true);
    try {
      const { data } = await api.post("/admin/broadcast", {
        subject: broadcastChannels.email ? broadcastSubject : undefined,
        message: broadcastMessage,
        channels: Object.keys(broadcastChannels).filter(k => broadcastChannels[k])
      });
      setBroadcastMsg({ ok: true, text: `✓ Broadcast successfully queued! Sent to ${data.sentCount} users.` });
      setBroadcastSubject("");
      setBroadcastMessage("");
    } catch (err) {
      console.error(err);
      setBroadcastMsg({ ok: false, text: err.response?.data?.error || "Failed to send broadcast." });
    } finally {
      setBroadcastLoading(false);
    }
  };
  const [toast, setToast] = useState(null);

  // Whitelist state
  const [whitelist, setWhitelist] = useState([]);
  const [whitelistEmailInput, setWhitelistEmailInput] = useState("");
  const [whitelistSearch, setWhitelistSearch] = useState("");
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [registrations, setRegistrations] = useState([]);

  function reloadRegistrations() {
    api.get("/admin/registrations").then((r) => setRegistrations(r.data));
  }

  async function handleApproveRegistration(id) {
    if (!window.confirm("Approve this registration request?")) return;
    try {
      await api.post(`/admin/registrations/${id}/approve`);
      showToast("Registration approved! User created and welcome email sent.");
      reloadRegistrations();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to approve registration", false);
    }
  }

  async function handleRejectRegistration(id) {
    if (!window.confirm("Reject this registration request?")) return;
    try {
      await api.post(`/admin/registrations/${id}/reject`);
      showToast("Registration rejected!");
      reloadRegistrations();
    } catch (err) {
      showToast("Failed to reject registration", false);
    }
  }

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
  function reloadWhitelist() {
    api.get("/admin/whitelist").then((r) => setWhitelist(r.data));
  }

  function reloadPendingMaterials() {
    api.get("/admin/materials/pending").then((r) => setPendingMaterials(r.data));
    api.get("/admin/materials/pending/count").then((r) => setPendingMaterialsCount(r.data.count));
  }

  function reloadApprovedMaterials() {
    api.get("/admin/materials/approved").then((r) => setApprovedMaterials(r.data || []));
  }

  function reloadModeratorLogs() {
    setLogsLoading(true);
    api.get("/admin/moderator-logs")
      .then((r) => setModeratorLogs(r.data || []))
      .catch((err) => console.error("Error loading moderator logs:", err))
      .finally(() => setLogsLoading(false));
  }

  function loadHealth() {
    setHealthLoading(true);
    api.get("/admin/health")
      .then((r) => setHealth(r.data))
      .catch(() => setHealth(null))
      .finally(() => setHealthLoading(false));
  }

  async function handleToggleHidden(id) {
    try {
      const r = await api.post(`/admin/materials/${id}/toggle-hidden`);
      setApprovedMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_hidden: r.data.is_hidden } : m))
      );
      showToast(r.data.is_hidden ? "Material hidden from public view." : "Material is now visible again.");
    } catch {
      showToast("Failed to update visibility.", false);
    }
  }

  async function handleDeleteMaterial(id) {
    try {
      await api.delete(`/admin/materials/${id}`);
      setApprovedMaterials((prev) => prev.filter((m) => m.id !== id));
      setDeleteConfirmId(null);
      showToast("Material permanently deleted.");
    } catch {
      showToast("Failed to delete material.", false);
    }
  }

  function reloadPendingMaterialsInternal() {
    reloadPendingMaterials();
  }

  async function handleApproveMaterial(id) {
    if (!window.confirm("Are you sure you want to approve this contribution?")) return;
    try {
      await api.post(`/admin/materials/${id}/approve`);
      showToast("Material approved successfully!");
      reloadPendingMaterials();
    } catch (err) {
      console.error(err);
      showToast("Failed to approve material", false);
    }
  }

  async function handleRejectConfirm(id) {
    if (!rejectionReasonText.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    try {
      await api.post(`/admin/materials/${id}/reject`, { reason: rejectionReasonText.trim() });
      showToast("Material rejected.");
      setRejectionInputId(null);
      setRejectionReasonText("");
      reloadPendingMaterials();
    } catch (err) {
      console.error(err);
      showToast("Failed to reject material", false);
    }
  }

  const renderSimpleMarkdown = (text) => {
    if (!text) return "";
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");
    
    html = html.replace(/\*\*(.*?)\*\//g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    
    html = html.split("\n\n").map(p => {
      if (p.startsWith("<h") || p.startsWith("<pre")) return p;
      return `<p>${p.replace(/\n/g, "<br>")}</p>`;
    }).join("");
    
    return html;
  };

  async function loadAttendance(d) {
    setAttendanceLoading(true);
    try {
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
    reloadWhitelist();
    reloadPendingMaterials();
  }, []);

  useEffect(() => {
    if (tab === "attendance") loadAttendance(attendanceDate);
    if (tab === "materials") {
      reloadPendingMaterialsInternal();
      reloadApprovedMaterials();
    }
    if (tab === "health") loadHealth();
    if (tab === "moderator-logs") reloadModeratorLogs();
    if (tab === "registrations") reloadRegistrations();
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
      await api.put(`/admin/users/${u.id}`, {
        name: u.name,
        batch: u.batch,
        section: u.section,
        is_active: u.is_active,
        is_moderator: u.is_moderator,
      });
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

  async function addWhitelistEmail(e) {
    e.preventDefault();
    if (!whitelistEmailInput) return;
    setWhitelistLoading(true);
    try {
      await api.post("/admin/whitelist", { email: whitelistEmailInput });
      setWhitelistEmailInput("");
      reloadWhitelist();
      showToast("Email whitelisted successfully!");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to whitelist email", false);
    } finally {
      setWhitelistLoading(false);
    }
  }

  async function removeWhitelistEmail(id, email) {
    if (!window.confirm(`Are you sure you want to remove ${email} from the whitelist?`)) return;
    try {
      await api.delete(`/admin/whitelist/${id}`);
      reloadWhitelist();
      showToast("Email removed from whitelist.");
    } catch (err) {
      showToast("Failed to remove email", false);
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

  const filteredWhitelist = whitelist.filter((w) =>
    whitelistSearch === "" ||
    w.email?.toLowerCase().includes(whitelistSearch.toLowerCase())
  );

  const todayPresent = overview?.todayMarks?.find((m) => m.status === "present")?.count ?? 0;
  const todayAbsent = overview?.todayMarks?.find((m) => m.status === "absent")?.count ?? 0;

  return (
    <div className="min-h-screen">
      <Navbar tabs={allowedTabs} active={tab} onTab={setTab} />

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
        {onClose && (
          <div className="flex justify-between items-center bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-2">
            <div>
              <h3 className="font-bold text-indigo-900 text-sm">🛡️ Moderator Mode</h3>
              <p className="text-xs text-indigo-700 mt-0.5">You have permissions to approve community content and manage the email whitelist.</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
            >
              ← Back to Student Dashboard
            </button>
          </div>
        )}

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
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                            <input className="input" placeholder="Name" value={editingUser.name}
                              onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                            <select className="input" value={editingUser.batch}
                              onChange={(e) => setEditingUser({ ...editingUser, batch: e.target.value })}>
                              <option value="ALL">ALL</option>
                              <option value="G1">G1</option>
                              <option value="G2">G2</option>
                            </select>
                            <input className="input" placeholder="Section (e.g. 5CSG CS-5)" value={editingUser.section || ""}
                              onChange={(e) => setEditingUser({ ...editingUser, section: e.target.value })} />
                            <label className="flex items-center gap-2 text-sm font-medium text-ink">
                              <input type="checkbox" checked={editingUser.is_active}
                                onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                                className="w-4 h-4 accent-primary" />
                              Active
                            </label>
                            <label className="flex items-center gap-2 text-sm font-medium text-ink">
                              <input type="checkbox" checked={editingUser.is_moderator || false}
                                onChange={(e) => setEditingUser({ ...editingUser, is_moderator: e.target.checked })}
                                className="w-4 h-4 accent-indigo-600" />
                              Moderator
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => saveUser(editingUser)} className="btn-primary !py-1.5 !px-4 text-sm">Save</button>
                            <button onClick={() => setEditingUser(null)} className="btn-secondary !py-1.5 !px-4 text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 px-4 py-3 hover:bg-paper/50 transition-colors">
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                              {u.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-ink truncate">{u.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-paper rounded-full text-muted font-mono border border-line">{u.batch}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-paper rounded-full text-muted font-mono border border-line">{u.section || "—"}</span>
                                {!u.is_active && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-red-50 rounded-full text-red-500 font-bold border border-red-100">Inactive</span>
                                )}
                                {u.is_moderator && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 rounded-full text-indigo-600 font-bold border border-indigo-100">🛡️ Moderator</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted font-mono mt-1">
                                {u.email && <span>📧 {u.email}</span>}
                                <span>🤖 @{u.telegram_username || "—"}{u.telegram_id && <span className="ml-1.5 text-green-600 font-sans font-bold">✓ connected</span>}</span>
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
                                  onClick={() => toggleUserStats(u.id)}
                                  className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-colors ${expandedUserId === u.id ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}
                                >
                                  {expandedUserId === u.id ? "Close Stats" : "Stats"}
                                </button>
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
                          {expandedUserId === u.id && (
                            <div className="px-4 pb-4 pt-1 bg-paper/30 border-t border-line/40">
                              {statsLoading ? (
                                <div className="text-xs text-muted py-3 flex items-center gap-2">
                                  <span className="animate-spin inline-block">⏳</span> Loading subject-wise attendance...
                                </div>
                              ) : expandedUserStats ? (
                                <div className="space-y-2 mt-2">
                                  <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Subject Attendance Breakdown</div>
                                  {expandedUserStats.perSubject.length === 0 ? (
                                    <div className="text-xs text-muted py-2">No attendance records found for this student.</div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {expandedUserStats.perSubject.map((sub, sidx) => {
                                        const subColor = sub.percentage >= 75 ? "#16A34A" : sub.percentage >= 65 ? "#F59E0B" : "#E11D48";
                                        return (
                                          <div key={sidx} className="p-3 bg-white border border-line rounded-xl shadow-sm flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="font-semibold text-xs text-ink truncate">{sub.name}</div>
                                              <div className="text-[10px] text-muted mt-0.5 font-mono">
                                                {sub.present} / {sub.total} classes {sub.safe ? "🟢 safe" : `🔴 need ${sub.needToAttend}`}
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="font-mono text-xs font-bold" style={{ color: subColor }}>{sub.percentage}%</div>
                                              <div className="w-16 h-1.5 bg-line rounded-full overflow-hidden mt-1">
                                                <div className="h-full rounded-full" style={{ width: `${sub.percentage}%`, background: subColor }} />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-red-500 py-3">Failed to load statistics.</div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REGISTRATIONS ── */}
        {tab === "registrations" && (
          <div className="card p-4 sm:p-6 fade-in">
            <h2 className="text-xl font-bold font-display mb-4">Pending Registrations</h2>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface text-muted">
                    <th className="p-3 font-semibold">Name</th>
                    <th className="p-3 font-semibold">Email</th>
                    <th className="p-3 font-semibold">Batch</th>
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-paper">
                  {registrations.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-muted">No pending registrations</td></tr>
                  ) : (
                    registrations.map(r => (
                      <tr key={r.id} className="hover:bg-surface/50 transition-colors">
                        <td className="p-3 font-medium text-ink">{r.name}</td>
                        <td className="p-3 text-muted">{r.email}</td>
                        <td className="p-3">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">{r.batch}</span>
                        </td>
                        <td className="p-3 text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="p-3 text-right space-x-2">
                          <button onClick={() => handleApproveRegistration(r.id)} className="text-xs bg-good text-white px-3 py-1.5 rounded-lg font-semibold hover:opacity-90">Approve</button>
                          <button onClick={() => handleRejectRegistration(r.id)} className="text-xs bg-bad text-white px-3 py-1.5 rounded-lg font-semibold hover:opacity-90">Reject</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── WHITELIST ── */}
        {tab === "whitelist" && (
          <div className="space-y-4">
            <div className="card p-4">
              <div className="font-display font-bold text-base mb-1 text-ink">Whitelist Gmail / Email Address</div>
              <p className="text-xs text-muted mb-4">Only whitelisted emails will be allowed to register a student account on the website.</p>
              <form onSubmit={addWhitelistEmail} className="flex flex-col sm:flex-row gap-3">
                <input
                  className="input flex-1"
                  type="email"
                  placeholder="Enter email address (e.g. student@gmail.com)"
                  value={whitelistEmailInput}
                  onChange={(e) => setWhitelistEmailInput(e.target.value)}
                  required
                />
                <button className="btn-primary whitespace-nowrap" disabled={whitelistLoading}>
                  {whitelistLoading ? "Adding..." : "➕ Whitelist Email"}
                </button>
              </form>
            </div>
            
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="font-display font-bold text-base text-ink">Whitelisted Emails ({whitelist.length})</div>
                <input
                  className="input max-w-xs"
                  placeholder="Search whitelisted emails…"
                  value={whitelistSearch}
                  onChange={(e) => setWhitelistSearch(e.target.value)}
                />
              </div>

              {filteredWhitelist.length === 0 ? (
                <div className="text-sm text-muted text-center py-6">No whitelisted emails found.</div>
              ) : (
                <div className="divide-y divide-line max-h-[400px] overflow-y-auto pr-1">
                  {filteredWhitelist.map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-sm font-mono font-medium text-ink">{w.email}</span>
                      <button
                        onClick={() => removeWhitelistEmail(w.id, w.email)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold flex-shrink-0 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
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

        {/* ── COMMUNITY APPROVALS ── */}
        {tab === "materials" && (
          <div className="space-y-4">
            <div className="card p-4 sm:p-5">
              <div className="font-display font-bold text-lg mb-1 text-ink flex items-center gap-2">
                <span>📚</span> Community Materials Management
              </div>
              <p className="text-muted text-sm">Review pending submissions or manage already-approved materials — hide them temporarily or delete permanently.</p>
              {/* Sub-tab toggle */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setMaterialsSubTab("pending")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    materialsSubTab === "pending"
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-white border-line text-slate-600 hover:bg-amber-50"
                  }`}
                >
                  📥 Pending {pendingMaterialsCount > 0 && `(${pendingMaterialsCount})`}
                </button>
                <button
                  onClick={() => { setMaterialsSubTab("approved"); reloadApprovedMaterials(); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    materialsSubTab === "approved"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white border-line text-slate-600 hover:bg-emerald-50"
                  }`}
                >
                  ✅ Approved ({approvedMaterials.length})
                </button>
              </div>
            </div>

            {/* ── PENDING sub-tab ── */}
            {materialsSubTab === "pending" && (
              <>
                {pendingMaterials.length === 0 ? (
                  <div className="card p-8 text-center bg-white border border-line rounded-2xl shadow-soft">
                    <div className="text-4xl mb-3">🎉</div>
                    <div className="text-sm font-semibold text-ink">All caught up!</div>
                    <div className="text-xs text-muted mt-1">There are no pending student contributions waiting for approval.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {pendingMaterials.map((item) => {
                      const isPreviewOpen = previewMaterialId === item.id;
                      const isRejecting = rejectionInputId === item.id;
                      return (
                        <div key={item.id} className="card p-4 sm:p-5 bg-white border border-line rounded-2xl shadow-soft flex flex-col gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-ink">{item.title}</span>
                                <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                                  {item.content_type.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-xs text-muted font-medium mt-1">
                                Subject: <span className="font-bold text-ink">{item.subject_name} ({item.subject_code})</span> &middot; Category: <span className="font-bold text-ink">{item.section}</span>
                              </div>
                              <div className="text-[11px] text-muted mt-0.5">
                                Uploaded by <span className="font-semibold text-ink">{item.uploader_name || "Unknown"}</span> on {new Date(item.created_at).toLocaleDateString()}
                              </div>
                            </div>

                            {/* Control Actions */}
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                              <button
                                onClick={() => setPreviewMaterialId(isPreviewOpen ? null : item.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${isPreviewOpen ? "bg-slate-800 text-white border-slate-800" : "bg-slate-50 border-line text-slate-700 hover:bg-slate-100"}`}
                              >
                                {isPreviewOpen ? "Hide Preview" : "Preview"}
                              </button>
                              <button
                                onClick={() => handleApproveMaterial(item.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  if (isRejecting) {
                                    setRejectionInputId(null);
                                    setRejectionReasonText("");
                                  } else {
                                    setRejectionInputId(item.id);
                                    setRejectionReasonText("");
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${isRejecting ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-rose-600 text-white hover:bg-rose-750"}`}
                              >
                                Reject
                              </button>
                            </div>
                          </div>

                          {/* Rejection input field inline prompt */}
                          {isRejecting && (
                            <div className="p-3 border border-red-200 rounded-xl bg-red-50/10 mt-1 flex flex-col gap-2">
                              <label className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Provide rejection reason</label>
                              <input
                                type="text"
                                placeholder="e.g. Incomplete notes / content doesn't match RTU syllabus"
                                value={rejectionReasonText}
                                onChange={(e) => setRejectionReasonText(e.target.value)}
                                className="px-3 py-1.5 border border-line rounded-lg text-xs font-semibold focus:ring-1 focus:ring-red-500 focus:outline-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRejectConfirm(item.id)}
                                  className="px-3.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-750"
                                >
                                  Confirm Rejection
                                </button>
                                <button
                                  onClick={() => { setRejectionInputId(null); setRejectionReasonText(""); }}
                                  className="px-3.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Preview Drawer */}
                          {isPreviewOpen && (
                            <div className="border border-line/65 rounded-2xl p-4 bg-slate-50/50 mt-2">
                              <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Content Preview</div>
                              {item.content_type === "pdf" && (
                                <iframe
                                  src={item.file_url}
                                  className="w-full h-[400px] border border-line rounded-xl bg-white"
                                  title={`PDF Preview: ${item.title}`}
                                />
                              )}
                              {item.content_type === "image" && (
                                <div className="flex justify-center p-2 bg-white rounded-xl border">
                                  <img
                                    src={item.file_url}
                                    className="max-h-[350px] object-contain rounded-lg"
                                    alt={`Image Preview: ${item.title}`}
                                  />
                                </div>
                              )}
                              {item.content_type === "text" && (
                                <div className="bg-white rounded-xl border p-4 max-h-[300px] overflow-y-auto">
                                  <div
                                    className="text-xs prose prose-slate max-w-none text-slate-800"
                                    dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(item.text_content) }}
                                  />
                                </div>
                              )}
                              {item.content_type === "html" && (
                                <iframe
                                  sandbox="allow-same-origin"
                                  srcDoc={`<!DOCTYPE html><html><head><style>body { font-family: system-ui; margin: 8px; color: #1e293b; line-height: 1.5; font-size: 13px; } pre { background: #f8fafc; padding: 8px; border-radius: 4px; }</style></head><body>${item.text_content}</body></html>`}
                                  className="w-full h-[300px] border border-line rounded-xl bg-white"
                                  title={`HTML Preview: ${item.title}`}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── APPROVED sub-tab ── */}
            {materialsSubTab === "approved" && (
              <>
                {approvedMaterials.length === 0 ? (
                  <div className="card p-8 text-center bg-white border border-line rounded-2xl shadow-soft">
                    <div className="text-4xl mb-3">📭</div>
                    <div className="text-sm font-semibold text-ink">No approved materials yet.</div>
                    <div className="text-xs text-muted mt-1">Approved student contributions will appear here for management.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {approvedMaterials.map((item) => {
                      const isDeleting = deleteConfirmId === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`card p-4 sm:p-5 bg-white border rounded-2xl shadow-soft flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${item.is_hidden ? "border-slate-300 opacity-60" : "border-line"}`}
                        >
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-ink truncate">{item.title}</span>
                              <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full border border-indigo-200 shrink-0">
                                {item.content_type.toUpperCase()}
                              </span>
                              {item.is_hidden && (
                                <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200 shrink-0">
                                  HIDDEN
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted mt-0.5 truncate">
                              <span className="font-semibold text-ink">{item.subject_code}</span>
                              {" · "}{item.section}
                              {" · "}by <span className="font-semibold text-ink">{item.uploader_name || "Unknown"}</span>
                              {" · "}{new Date(item.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {/* Hide / Unhide */}
                            <button
                              onClick={() => handleToggleHidden(item.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                item.is_hidden
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-slate-50 border-line text-slate-600 hover:bg-slate-100"
                              }`}
                              title={item.is_hidden ? "Unhide — make visible to students" : "Hide from public lab pages"}
                            >
                              {item.is_hidden ? "👁 Unhide" : "🙈 Hide"}
                            </button>

                            {/* Delete with inline confirm */}
                            {isDeleting ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-semibold text-red-600">Delete permanently?</span>
                                <button
                                  onClick={() => handleDeleteMaterial(item.id)}
                                  className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all"
                                title="Permanently delete this material"
                              >
                                🗑 Delete
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}


        {/* ── SYSTEM HEALTH STATUS ── */}
        {tab === "health" && (
          <div className="space-y-6">
            <div className="card p-5 sm:p-6 bg-white border border-line rounded-2xl shadow-soft">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-display font-bold text-lg mb-1 text-ink flex items-center gap-2">
                    <span>⚡</span> System Health Monitor
                  </h3>
                  <p className="text-muted text-sm">Real-time status checks for database connections, storage buckets, Telegram bot services, and email mailers.</p>
                </div>
                <button
                  onClick={loadHealth}
                  disabled={healthLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-soft transition-all"
                >
                  {healthLoading ? "Refreshing..." : "🔄 Refresh Status"}
                </button>
              </div>
            </div>

            {healthLoading && !health ? (
              <div className="flex items-center justify-center p-12">
                <span className="text-sm font-semibold text-muted">Diagnosing services, please wait...</span>
              </div>
            ) : !health ? (
              <div className="card p-8 text-center bg-white border border-line rounded-2xl shadow-soft">
                <div className="text-4xl mb-3">⚠️</div>
                <div className="text-sm font-semibold text-ink">Failed to fetch health metrics</div>
                <div className="text-xs text-muted mt-1">Please ensure the backend is online and running.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Database */}
                <div className="card p-5 bg-white border border-line rounded-2xl shadow-soft flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm text-ink">🗄️ PostgreSQL Database</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${health.database.status === "online" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        {health.database.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">Stores user profiles, logs attendance matrices, configurations, and schedules.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line/60 flex justify-between items-center text-xs font-mono">
                    <span className="text-muted">Query Latency:</span>
                    <span className="font-bold text-ink">{health.database.latency || "N/A"}</span>
                  </div>
                </div>

                {/* Backblaze B2 */}
                <div className="card p-5 bg-white border border-line rounded-2xl shadow-soft flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm text-ink">🪣 Backblaze B2 Storage</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${health.b2.status === "online" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        {health.b2.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">Handles student manual uploads, PDFs, images, and pre-signed assets.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line/60 flex justify-between items-center text-xs font-mono">
                    <span className="text-muted">Status / Errors:</span>
                    <span className="font-bold text-ink truncate max-w-[200px]" title={health.b2.error || "Operational"}>
                      {health.b2.error ? health.b2.error : "Operational"}
                    </span>
                  </div>
                </div>

                {/* Telegram Bot */}
                <div className="card p-5 bg-white border border-line rounded-2xl shadow-soft flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm text-ink">🤖 Telegram Bot Service</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${health.telegram.status === "online" ? "bg-emerald-100 text-emerald-800" : "bg-slate-105 text-slate-800"}`}>
                        {health.telegram.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">Broadcasts smart alerts, schedules alerts, and interacts with students via chat commands.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line/60 flex justify-between items-center text-xs font-mono">
                    <span className="text-muted">Active Mode:</span>
                    <span className="font-bold text-ink">{health.telegram.type || "Offline / Not Set"}</span>
                  </div>
                </div>

                {/* Resend Email */}
                <div className="card p-5 bg-white border border-line rounded-2xl shadow-soft flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm text-ink">✉️ Resend Mailer</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${health.resend.status === "online" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        {health.resend.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">Sends secure account OTPs, password recovery codes, and registration links to users.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line/60 flex justify-between items-center text-xs font-mono">
                    <span className="text-muted">Configuration:</span>
                    <span className="font-bold text-ink truncate max-w-[200px]" title={health.resend.error || "Configured"}>
                      {health.resend.error ? "Missing Key" : "Configured"}
                    </span>
                  </div>
                </div>

                {/* System Diagnostics */}
                <div className="card p-5 bg-white border border-line rounded-2xl shadow-soft md:col-span-2">
                  <span className="font-bold text-sm text-ink block mb-3">🖥️ Server Diagnostics & Uptime</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono pt-2">
                    <div>
                      <span className="text-muted block">Uptime:</span>
                      <span className="font-bold text-ink">{Math.floor(health.server.uptime / 60)} mins</span>
                    </div>
                    <div>
                      <span className="text-muted block">Heap Used:</span>
                      <span className="font-bold text-ink">{Math.round(health.server.memory.heapUsed / 1024 / 1024 * 10) / 10} MB</span>
                    </div>
                    <div>
                      <span className="text-muted block">RSS Memory:</span>
                      <span className="font-bold text-ink">{Math.round(health.server.memory.rss / 1024 / 1024 * 10) / 10} MB</span>
                    </div>
                    <div>
                      <span className="text-muted block">API URL:</span>
                      <span className="font-bold text-ink truncate block max-w-[150px]">{api.defaults.baseURL}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ── MODERATOR LOGS ── */}
        {tab === "moderator-logs" && (
          <div className="card p-4 sm:p-5 bg-white border border-line rounded-2xl shadow-soft space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2">
                  <span>🛡️</span> Moderator Activity Logs
                </h2>
                <p className="text-muted text-xs mt-0.5">Audit log of all actions performed by student moderators.</p>
              </div>
              <button
                onClick={reloadModeratorLogs}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                disabled={logsLoading}
              >
                🔄 Refresh Logs
              </button>
            </div>

            {logsLoading && moderatorLogs.length === 0 ? (
              <div className="text-sm text-muted text-center py-10 flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Loading logs...
              </div>
            ) : moderatorLogs.length === 0 ? (
              <div className="text-sm text-muted text-center py-10 bg-slate-50 rounded-xl border border-dashed border-line">
                No moderator logs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-paper/40 text-muted uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Moderator</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-medium text-ink">
                    {moderatorLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-paper/30 transition-colors">
                        <td className="py-3 px-3 font-mono text-muted whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <div>
                            <div className="font-semibold">{log.moderator_name}</div>
                            {log.moderator_email && (
                              <div className="text-[10px] text-muted font-mono">{log.moderator_email}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              log.action.includes("approve")
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : log.action.includes("reject")
                                ? "bg-rose-50 border-rose-200 text-rose-700"
                                : log.action.includes("delete")
                                ? "bg-rose-50 border-rose-200 text-rose-700"
                                : "bg-indigo-50 border-indigo-200 text-indigo-700"
                            }`}
                          >
                            {log.action.replace(/_/g, " ").toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[280px] break-words text-slate-700">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}


        {/* ── BROADCAST ── */}
        {tab === "broadcast" && (
          <div className="max-w-xl space-y-4">
            <div className="card p-5 sm:p-6 bg-white border border-line rounded-2xl shadow-soft">
              <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2 mb-1">
                <span>📢</span> Send Broadcast Announcement
              </h2>
              <p className="text-muted text-xs mb-5">
                Send a notification message directly to all registered and active users.
              </p>
              
              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-ink font-mono tracking-wide uppercase">Channels</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={broadcastChannels.email} 
                        onChange={(e) => setBroadcastChannels({ ...broadcastChannels, email: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      📧 Send via Email
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={broadcastChannels.telegram} 
                        onChange={(e) => setBroadcastChannels({ ...broadcastChannels, telegram: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      🤖 Send via Telegram
                    </label>
                  </div>
                </div>

                {broadcastChannels.email && (
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Email Subject</label>
                    <input 
                      type="text" 
                      className="input font-sans text-xs" 
                      placeholder="e.g. Platform Update: New Study Materials Available" 
                      value={broadcastSubject} 
                      onChange={(e) => setBroadcastSubject(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Message Content</label>
                  <textarea 
                    className="input min-h-[140px] font-sans text-xs leading-relaxed" 
                    placeholder="Type your announcement details here..." 
                    value={broadcastMessage} 
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    required
                  />
                </div>

                {broadcastMsg && (
                  <div className={`p-3 rounded-xl text-xs font-medium border ${
                    broadcastMsg.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                  }`}>
                    {broadcastMsg.text}
                  </div>
                )}

                <button 
                  className="btn-primary w-full" 
                  type="submit" 
                  disabled={broadcastLoading || (!broadcastChannels.email && !broadcastChannels.telegram)}
                  style={{ opacity: broadcastLoading ? 0.7 : 1 }}
                >
                  {broadcastLoading ? "Sending Broadcast..." : "🚀 Send to All Users"}
                </button>
              </form>
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
