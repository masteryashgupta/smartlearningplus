import { useEffect, useState } from "react";
import { api } from "../api.js";
import TimetableGrid from "../components/TimetableGrid.jsx";
import AnnouncementManager from "../components/AnnouncementManager.jsx";

const TAB_GROUPS = [
  {
    title: "Analytics",
    items: [
      { key: "overview", label: "Overview", icon: "📊" },
      { key: "attendance", label: "Attendance Browser", icon: "📅" }
    ]
  },
  {
    title: "People",
    items: [
      { key: "users", label: "Users List", icon: "👥" },
      { key: "registrations", label: "Pending Requests", icon: "📥", badgeKey: "registrationsCount" },
      { key: "whitelist", label: "Email Whitelist", icon: "🛡️" },
      { key: "subscribers", label: "Notification Subscribers", icon: "📧" }
    ]
  },
  {
    title: "Content & Schedule",
    items: [
      { key: "materials", label: "Approvals Vault", icon: "📚", badgeKey: "pendingMaterialsCount" },
      { key: "timetable", label: "Timetable Planner", icon: "🗓️" },
      { key: "holidays", label: "Holiday Manager", icon: "🎉" }
    ]
  },
  {
    title: "Communications",
    items: [
      { key: "broadcast", label: "Broadcaster", icon: "📢" },
      { key: "announcement", label: "Announcement Bar", icon: "📣" },
      { key: "moderator-logs", label: "Moderator Logs", icon: "🕵️‍♂️" }
    ]
  },
  {
    title: "Platform",
    items: [
      { key: "health", label: "System Health", icon: "⚡" },
      { key: "settings", label: "Security Settings", icon: "⚙️" }
    ]
  }
];

const DAYS = [
  { v: 1, l: "Mon" }, { v: 2, l: "Tue" }, { v: 3, l: "Wed" },
  { v: 4, l: "Thu" }, { v: 5, l: "Fri" }, { v: 6, l: "Sat" }, { v: 0, l: "Sun" },
];

function StatCard({ icon, label, value, sub, color = "#4F46E5" }) {
  return (
    <div className="modern-stat-card">
      <div className="icon-wrapper" style={{ backgroundColor: color + "12", color: color }}>
        {icon}
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color: color }}>{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminPanel({ onClose }) {
  const role = localStorage.getItem("role");
  const isModeratorSession = localStorage.getItem("is_moderator") === "true";
  const userName = localStorage.getItem("name") || "Admin User";

  // State
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
  const [registrations, setRegistrations] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceSlots, setAttendanceSlots] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [slotForm, setSlotForm] = useState({ day_of_week: 1, slot_number: 1, start_time: "08:30", end_time: "09:30", subject_id: "", batch: "ALL", label: "" });
  const [holidayForm, setHolidayForm] = useState({ date: "", reason: "" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, text: false, confirm: false });

  // Broadcast States
  const [broadcastChannels, setBroadcastChannels] = useState({ email: true, telegram: true });
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastButtonText, setBroadcastButtonText] = useState("");
  const [broadcastButtonLink, setBroadcastButtonLink] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState(null);
  const [broadcastUserSearch, setBroadcastUserSearch] = useState("");
  const [broadcastSubSearch, setBroadcastSubSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [toast, setToast] = useState(null);

  // Whitelist state
  const [whitelist, setWhitelist] = useState([]);
  const [whitelistEmailInput, setWhitelistEmailInput] = useState("");
  const [whitelistSearch, setWhitelistSearch] = useState("");
  const [whitelistLoading, setWhitelistLoading] = useState(false);

  // Subscribers state
  const [subscribers, setSubscribers] = useState([]);
  const [subscribersSearch, setSubscribersSearch] = useState("");
  const [selectedSubscriberIds, setSelectedSubscriberIds] = useState([]);

  // Helpers
  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function reloadRegistrations() {
    api.get("/admin/registrations").then((r) => setRegistrations(r.data));
  }

  async function handleApproveRegistration(id) {
    if (!window.confirm("Approve this registration request?")) return;
    try {
      await api.post(`/admin/registrations/${id}/approve`);
      showToast("Registration approved! Welcome email sent.");
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

  function reloadTimetable() {
    api.get("/timetable").then((r) => { setWeek(r.data.week); setSubjects(r.data.subjects); });
  }
  function reloadHolidays() {
    api.get("/admin/holidays").then((r) => setHolidays(r.data));
  }
  function reloadUsers() {
    api.get("/admin/users").then((r) => {
      setUsers(r.data);
      const activeIds = r.data.filter(u => u.is_active).map(u => u.id);
      setSelectedUserIds(activeIds);
    });
  }
  function reloadWhitelist() {
    api.get("/admin/whitelist").then((r) => setWhitelist(r.data));
  }
  function reloadSubscribers() {
    api.get("/admin/subscribers").then((r) => {
      setSubscribers(r.data);
      const ids = r.data.map(s => s.id);
      setSelectedSubscriberIds(ids);
    });
  }
  async function removeSubscriber(id, email) {
    if (!window.confirm(`Remove ${email} from subscribers?`)) return;
    try {
      await api.delete(`/admin/subscribers/${id}`);
      reloadSubscribers();
      showToast("Subscriber removed.");
    } catch (err) {
      showToast("Failed to remove subscriber", false);
    }
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
      .catch((err) => console.error(err))
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
      showToast(r.data.is_hidden ? "Material hidden." : "Material visible.");
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

  async function handleApproveMaterial(id) {
    if (!window.confirm("Approve this contribution?")) return;
    try {
      await api.post(`/admin/materials/${id}/approve`);
      showToast("Material approved successfully!");
      reloadPendingMaterials();
    } catch (err) {
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
      showToast("Failed to reject material", false);
    }
  }

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
    if (!window.confirm(`Delete ${name}?`)) return;
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
      showToast("Email whitelisted!");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to whitelist email", false);
    } finally {
      setWhitelistLoading(false);
    }
  }

  async function removeWhitelistEmail(id, email) {
    if (!window.confirm(`Remove ${email} from whitelist?`)) return;
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

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setBroadcastMsg(null);
    if (!broadcastChannels.email && !broadcastChannels.telegram) {
      return setBroadcastMsg({ ok: false, text: "Please select at least one channel." });
    }
    const emailRecipientsCount = broadcastChannels.email ? selectedSubscriberIds.length : 0;
    const totalRecipients = selectedUserIds.length + emailRecipientsCount;

    if (selectedUserIds.length === 0 && emailRecipientsCount === 0) {
      return setBroadcastMsg({ ok: false, text: "Please select at least one recipient." });
    }

    const confirmSend = window.confirm(`Send broadcast to ${totalRecipients} recipients?`);
    if (!confirmSend) return;

    setBroadcastLoading(true);
    try {
      const { data } = await api.post("/admin/broadcast", {
        subject: broadcastChannels.email ? broadcastSubject : undefined,
        message: broadcastMessage,
        buttonText: broadcastButtonText || undefined,
        buttonLink: broadcastButtonLink || undefined,
        channels: Object.keys(broadcastChannels).filter(k => broadcastChannels[k]),
        userIds: selectedUserIds,
        subscriberIds: broadcastChannels.email ? selectedSubscriberIds : []
      });
      setBroadcastMsg({ ok: true, text: `✓ Broadcast successfully queued to ${data.sentCount} recipients.` });
      setBroadcastSubject("");
      setBroadcastMessage("");
      setBroadcastButtonText("");
      setBroadcastButtonLink("");
    } catch (err) {
      setBroadcastMsg({ ok: false, text: err.response?.data?.error || "Failed to send broadcast." });
    } finally {
      setBroadcastLoading(false);
    }
  };

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

  const renderSimpleMarkdown = (text) => {
    if (!text) return "";
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

  useEffect(() => {
    api.get("/admin/overview").then((r) => setOverview(r.data));
    reloadTimetable();
    reloadHolidays();
    reloadUsers();
    reloadWhitelist();
    reloadSubscribers();
    reloadPendingMaterials();
    reloadRegistrations();
  }, []);

  useEffect(() => {
    if (tab === "attendance") loadAttendance(attendanceDate);
    if (tab === "materials") {
      reloadPendingMaterials();
      reloadApprovedMaterials();
    }
    if (tab === "health") loadHealth();
    if (tab === "moderator-logs") reloadModeratorLogs();
    if (tab === "registrations") reloadRegistrations();
    if (tab === "subscribers") reloadSubscribers();
  }, [tab, attendanceDate, week]);

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

  const filteredSubscribers = subscribers.filter((s) =>
    subscribersSearch === "" ||
    s.email?.toLowerCase().includes(subscribersSearch.toLowerCase())
  );

  const todayPresent = overview?.todayMarks?.find((m) => m.status === "present")?.count ?? 0;
  const todayAbsent = overview?.todayMarks?.find((m) => m.status === "absent")?.count ?? 0;

  const countMap = {
    registrationsCount: registrations.length,
    pendingMaterialsCount: pendingMaterialsCount
  };

  const handleSignOut = () => {
    localStorage.clear();
    window.location.href = "/index.html#/login";
    window.location.reload();
  };

  const activeTabDetails = TAB_GROUPS.flatMap(g => g.items).find(i => i.key === tab);

  return (
    <div className="admin-dashboard-container font-sans flex min-h-screen text-[#1E293B]">
      
      {/* SCOPED GLOBAL ADMIN STYLES */}
      <style>{`
        .admin-dashboard-container {
          --sidebar-bg: #0F172A;
          --sidebar-hover: #1E293B;
          --sidebar-active: #4F46E5;
          --main-bg: #F8FAFC;
          --card-bg: #FFFFFF;
          --primary: #4F46E5;
          --primary-hover: #4338CA;
          --border: #E2E8F0;
          --input-focus: #4F46E533;
          background-color: var(--main-bg);
          width: 100%;
        }
        
        .admin-sidebar {
          width: 260px;
          background: var(--sidebar-bg);
          color: #94A3B8;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #1E293B;
          flex-shrink: 0;
        }

        .admin-sidebar-header {
          padding: 20px 24px;
          border-bottom: 1px solid #1E293B;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .admin-sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 16px 12px;
          scrollbar-width: thin;
        }

        .nav-group-title {
          font-size: 10px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 18px 0 6px 12px;
        }

        .nav-item-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          transition: all 0.2s ease;
          text-align: left;
          background: transparent;
          border: none;
          color: #94A3B8;
          cursor: pointer;
        }

        .nav-item-btn:hover {
          background: var(--sidebar-hover);
          color: #F1F5F9;
        }

        .nav-item-btn.active {
          background: var(--sidebar-active);
          color: #FFFFFF;
        }

        .nav-badge {
          background: #EF4444;
          color: #FFF;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 99px;
        }

        .admin-main-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .admin-topbar {
          height: 64px;
          background: #FFFFFF;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
        }

        .admin-content-area {
          flex: 1;
          overflow-y: auto;
          padding: 32px;
        }

        .modern-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          margin-bottom: 24px;
        }

        .modern-stat-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .modern-stat-card .icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .modern-stat-card .stat-label {
          font-size: 12px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .modern-stat-card .stat-value {
          font-size: 24px;
          font-weight: 800;
          line-height: 1.2;
          margin-top: 2px;
        }

        .modern-stat-card .stat-sub {
          font-size: 11px;
          color: #94A3B8;
          font-family: monospace;
          margin-top: 2px;
        }

        .modern-input {
          width: 100%;
          background: #FFFFFF;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          color: #1E293B;
          outline: none;
          transition: all 0.15s ease;
        }

        .modern-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--input-focus);
        }

        .modern-select {
          background: #FFFFFF;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          color: #1E293B;
          outline: none;
          cursor: pointer;
        }

        .modern-btn-primary {
          background: var(--primary);
          color: #FFFFFF;
          font-weight: 700;
          font-size: 13px;
          padding: 10px 18px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .modern-btn-primary:hover {
          background: var(--primary-hover);
        }

        .modern-btn-secondary {
          background: #F1F5F9;
          color: #475569;
          font-weight: 700;
          font-size: 13px;
          padding: 10px 18px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .modern-btn-secondary:hover {
          background: #E2E8F0;
          color: #1E293B;
        }

        .modern-btn-danger {
          background: #EF4444;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 11px;
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .modern-btn-danger:hover {
          background: #DC2626;
        }

        .toast-notification {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 100;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        /* Mobile Layout */
        .mobile-header {
          display: none;
        }

        @media (max-width: 900px) {
          .admin-sidebar {
            display: none;
          }
          .admin-sidebar.mobile-open {
            display: flex;
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            z-index: 1000;
            width: 260px;
            animation: slideInLeft 0.25s ease-out;
          }
          .sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            z-index: 999;
          }
          .admin-topbar {
            display: none;
          }
          .mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 60px;
            background: #FFFFFF;
            border-bottom: 1px solid var(--border);
            padding: 0 16px;
            position: sticky;
            top: 0;
            z-index: 10;
          }
          .admin-content-area {
            padding: 16px;
          }
        }

        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        /* Diagnostic health cards */
        .health-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .health-card {
          background: #FFFFFF;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `}</style>

      {/* Toast System */}
      {toast && (
        <div
          className="toast-notification"
          style={{
            background: toast.ok ? "#DCFCE7" : "#FEE2E2",
            color: toast.ok ? "#15803D" : "#DC2626",
            border: `1px solid ${toast.ok ? "#86EFAC" : "#FCA5A5"}`,
          }}
        >
          {toast.ok ? "🟢" : "🔴"} {toast.msg}
        </div>
      )}

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* 🧭 SIDEBAR NAVIGATION */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="admin-sidebar-header">
          <img src="/logo.png?v=3" alt="Logo" className="w-6 h-6 object-contain" />
          <div>
            <div className="font-bold text-slate-100 text-sm tracking-tight">Smart Learning</div>
            <div className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase font-bold">Admin Portal</div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {role === "admin" && (
            <button
              onClick={() => { setTab("overview"); setMobileMenuOpen(false); }}
              className={`nav-item-btn ${tab === "overview" ? "active" : ""}`}
            >
              <span className="flex items-center gap-2"><span>📊</span> Overview</span>
            </button>
          )}

          {TAB_GROUPS.map((group, gIdx) => {
            // Filter allowed tabs based on permissions
            const allowedItems = group.items.filter(item => {
              if (role === "admin") return true;
              if (role === "student" && isModeratorSession) {
                return ["whitelist", "materials"].includes(item.key);
              }
              return false;
            });

            if (allowedItems.length === 0) return null;

            return (
              <div key={gIdx}>
                <div className="nav-group-title">{group.title}</div>
                <div className="space-y-1">
                  {allowedItems.map((item) => {
                    const badgeVal = countMap[item.badgeKey];
                    return (
                      <button
                        key={item.key}
                        onClick={() => { setTab(item.key); setMobileMenuOpen(false); }}
                        className={`nav-item-btn ${tab === item.key ? "active" : ""}`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{item.icon}</span>
                          {item.label}
                        </span>
                        {badgeVal > 0 && <span className="nav-badge">{badgeVal}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-200 truncate">{userName}</div>
            <div className="text-[10px] text-slate-500 font-mono">Role: {role}</div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* 💻 MAIN WRAPPER */}
      <div className="admin-main-wrapper">
        
        {/* MOBILE HEADER */}
        <header className="mobile-header">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-slate-700 text-xl p-1"
            >
              ☰
            </button>
            <div className="font-bold text-sm">Smart Learning</div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
              Back
            </button>
          )}
        </header>

        {/* TOPBAR (DESKTOP) */}
        <header className="admin-topbar">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>{activeTabDetails?.icon}</span>
              {activeTabDetails?.label || "Admin Console"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="modern-btn-secondary text-xs !py-1.5 !px-3 hover:bg-slate-200"
              >
                ← Return to Student View
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
              {userName[0]?.toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* 📑 MAIN CONTENT SCROLL AREA */}
        <main className="admin-content-area">
          {onClose && (
            <div className="modern-card !bg-indigo-50/50 border-indigo-200 p-4 mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-indigo-900 text-sm">🛡️ Moderator Access Mode</h3>
                <p className="text-xs text-indigo-700 mt-0.5">Permissions: whitelist emails & approve student contributions.</p>
              </div>
            </div>
          )}

          {/* 📊 TABS: OVERVIEW */}
          {tab === "overview" && overview && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon="👥" label="Active Students" value={overview.activeUsers} color="#4F46E5" />
                <StatCard icon="✅" label="Present Today" value={todayPresent} color="#10B981" />
                <StatCard icon="❌" label="Absent Today" value={todayAbsent} color="#EF4444" />
                <StatCard icon="📚" label="Total Subjects" value={subjects.length} color="#06B6D4" />
              </div>

              <div className="modern-card">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span>⚠️</span> Lowest Attendance / At Risk Students
                </h3>
                {overview.lowAttendance.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center">All students maintain optimal attendance threshold! 🎉</div>
                ) : (
                  <div className="space-y-4">
                    {overview.lowAttendance.map((u, i) => {
                      const pct = u.percentage;
                      const barColor = pct >= 75 ? "#10B981" : pct >= 65 ? "#F59E0B" : "#EF4444";
                      return (
                        <div key={i} className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-700">{u.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{u.batch}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                            </div>
                          </div>
                          <div className="text-sm font-bold font-mono min-w-[45px] text-right" style={{ color: barColor }}>
                            {pct}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 📅 TABS: ATTENDANCE BROWSER */}
          {tab === "attendance" && (
            <div className="space-y-6">
              <div className="modern-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Browse Single Date Records</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select a date to check the scheduled slots and attendance rates.</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="modern-input !w-auto"
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </div>

              {attendanceLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-white border animate-pulse" />)}
                </div>
              ) : attendanceSlots.length === 0 ? (
                <div className="modern-card text-center py-12">
                  <span className="text-3xl block mb-2">🗓️</span>
                  <span className="text-xs text-slate-400 font-medium">No class slots scheduled on this date.</span>
                </div>
              ) : (
                <div className="modern-card !p-0 overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b">
                    <span className="text-xs font-bold text-slate-700">{attendanceSlots.length} Slots Scheduled</span>
                  </div>
                  <div className="divide-y">
                    {attendanceSlots.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color || "#4F46E5" }} />
                          <div>
                            <div className="text-xs font-bold text-slate-800">{s.label || s.subject_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)} {s.batch !== "ALL" && `| Batch ${s.batch}`}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Slot {s.slot_number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Student overview list */}
              <div className="modern-card">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Overall Student Attendance Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users.map((u) => {
                    const pct = u.percentage;
                    const barColor = pct >= 75 ? "#10B981" : pct >= 65 ? "#F59E0B" : "#EF4444";
                    return (
                      <div key={u.id} className="p-3 border border-slate-100 rounded-xl flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-800 truncate block">{u.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{u.batch} Batch</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold font-mono" style={{ color: pct !== null ? barColor : "#94A3B8" }}>
                            {pct !== null ? `${pct}%` : "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 👥 TABS: USERS LIST */}
          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <input
                  className="modern-input flex-1 max-w-md"
                  placeholder="Search students by name, batch, telegram handle..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <span className="text-xs text-slate-400 font-mono whitespace-nowrap self-center">{filteredUsers.length} Students Listed</span>
              </div>

              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="modern-card !p-4">
                    {editingUser?.id === u.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Student Name</label>
                            <input className="modern-input mt-1" value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Batch</label>
                            <select className="modern-select w-full mt-1" value={editingUser.batch} onChange={(e) => setEditingUser({ ...editingUser, batch: e.target.value })}>
                              <option value="ALL">ALL</option>
                              <option value="G1">G1</option>
                              <option value="G2">G2</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Section</label>
                            <input className="modern-input mt-1" value={editingUser.section || ""} onChange={(e) => setEditingUser({ ...editingUser, section: e.target.value })} />
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <input type="checkbox" checked={editingUser.is_active} onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })} /> Active Status
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <input type="checkbox" checked={editingUser.is_moderator || false} onChange={(e) => setEditingUser({ ...editingUser, is_moderator: e.target.checked })} /> Moderator Privileges
                          </label>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button onClick={() => saveUser(editingUser)} className="modern-btn-primary !py-1.5">Save Changes</button>
                          <button onClick={() => setEditingUser(null)} className="modern-btn-secondary !py-1.5">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                              {u.name[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-800">{u.name}</span>
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">{u.batch}</span>
                                {u.is_moderator && <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">🛡️ Moderator</span>}
                                {!u.is_active && <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold">Inactive</span>}
                              </div>
                              <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3">
                                <span>📧 {u.email}</span>
                                <span>🤖 @{u.telegram_username || "—"}{u.telegram_id && <span className="text-emerald-500 font-bold ml-1">✓ linked</span>}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <div className="text-xs font-mono font-bold text-slate-700">Attendance</div>
                              <div className="text-sm font-bold font-mono" style={{ color: u.percentage >= 75 ? "#10B981" : "#EF4444" }}>
                                {u.percentage !== null ? `${u.percentage}%` : "—"}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <button onClick={() => toggleUserStats(u.id)} className="modern-btn-secondary !py-1 !px-2.5 text-[11px]">Stats</button>
                              <div className="flex gap-1">
                                <button onClick={() => setEditingUser({ ...u })} className="text-[11px] text-indigo-600 font-bold hover:underline">Edit</button>
                                <button onClick={() => deleteUser(u.id, u.name)} className="text-[11px] text-rose-600 font-bold hover:underline">Delete</button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Collapsed stats view */}
                        {expandedUserId === u.id && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            {statsLoading ? (
                              <div className="text-xs text-slate-400">Loading breakdown stats...</div>
                            ) : expandedUserStats ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {expandedUserStats.perSubject.map((sub, sidx) => (
                                  <div key={sidx} className="p-3 bg-slate-50 border rounded-lg flex items-center justify-between">
                                    <div>
                                      <span className="text-xs font-bold text-slate-700 block">{sub.name}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">{sub.present} / {sub.total} classes</span>
                                    </div>
                                    <span className="text-xs font-bold font-mono" style={{ color: sub.percentage >= 75 ? "#10B981" : "#EF4444" }}>
                                      {sub.percentage}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-rose-500">Failed to load statistics.</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 📥 TABS: REGISTRATIONS */}
          {tab === "registrations" && (
            <div className="modern-card">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Pending Student Registration Requests</h3>
              {registrations.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-3xl block mb-2">🎉</span>
                  <span className="text-xs text-slate-400 font-medium">All registration requests are reviewed!</span>
                </div>
              ) : (
                <div className="divide-y">
                  {registrations.map(r => (
                    <div key={r.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{r.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Email: {r.email} | Batch: <span className="font-bold text-slate-700">{r.batch}</span></div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Requested on {new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveRegistration(r.id)} className="modern-btn-primary !py-1.5 !px-3 text-xs bg-emerald-600 hover:bg-emerald-700">Approve</button>
                        <button onClick={() => handleRejectRegistration(r.id)} className="modern-btn-danger !py-1.5 !px-3 text-xs">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 🛡️ TABS: EMAIL WHITELIST */}
          {tab === "whitelist" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="modern-card md:col-span-1">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Whitelist Email</h3>
                <p className="text-xs text-slate-400 mb-4">Add the student email addresses allowed to register on the site.</p>
                <form onSubmit={addWhitelistEmail} className="space-y-3">
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={whitelistEmailInput}
                    onChange={(e) => setWhitelistEmailInput(e.target.value)}
                    className="modern-input"
                    required
                  />
                  <button type="submit" className="modern-btn-primary w-full" disabled={whitelistLoading}>
                    {whitelistLoading ? "Adding..." : "+ Add Whitelist"}
                  </button>
                </form>
              </div>

              <div className="modern-card md:col-span-2">
                <div className="flex justify-between items-center gap-3 mb-4">
                  <h3 className="text-sm font-bold text-slate-800">Allowed Addresses ({whitelist.length})</h3>
                  <input
                    placeholder="Filter list..."
                    value={whitelistSearch}
                    onChange={(e) => setWhitelistSearch(e.target.value)}
                    className="modern-input !py-1.5 max-w-xs"
                  />
                </div>

                <div className="divide-y max-h-[400px] overflow-y-auto pr-1">
                  {filteredWhitelist.map((w) => (
                    <div key={w.id} className="py-2.5 flex justify-between items-center">
                      <span className="text-xs font-mono font-medium text-slate-700">{w.email}</span>
                      <button onClick={() => removeWhitelistEmail(w.id, w.email)} className="text-xs text-rose-500 hover:text-rose-700 font-bold">Remove</button>
                    </div>
                  ))}
                  {filteredWhitelist.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400">No whitelisted emails match your search.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 📧 TABS: NOTIFICATION SUBSCRIBERS */}
          {tab === "subscribers" && (
            <div className="modern-card">
              <div className="flex justify-between items-center gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Notification Subscribers ({subscribers.length})</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Non-registered users who signed up to receive updates via mail.</p>
                </div>
                <input
                  placeholder="Filter subscribers..."
                  value={subscribersSearch}
                  onChange={(e) => setSubscribersSearch(e.target.value)}
                  className="modern-input !py-1.5 max-w-xs"
                />
              </div>

              <div className="divide-y max-h-[400px] overflow-y-auto pr-1">
                {filteredSubscribers.map((s) => (
                  <div key={s.id} className="py-3 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-mono font-semibold text-slate-700">{s.email}</span>
                      <div className="text-[10px] text-slate-400 mt-0.5">Subscribed on {new Date(s.created_at).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => removeSubscriber(s.id, s.email)} className="text-xs text-rose-500 hover:text-rose-700 font-bold">Remove</button>
                  </div>
                ))}
                {filteredSubscribers.length === 0 && (
                  <div className="text-center py-10 text-xs text-slate-400">No subscribers found matching your search.</div>
                )}
              </div>
            </div>
          )}

          {/* 📚 TABS: APPROVALS VAULT */}
          {tab === "materials" && (
            <div className="space-y-6">
              <div className="modern-card flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Upload Approvals Vault</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Manage study materials contributed by student dashboard users.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMaterialsSubTab("pending")}
                    className={`modern-btn-secondary !py-1.5 !px-3.5 text-xs ${materialsSubTab === "pending" ? "bg-indigo-600 !text-white" : ""}`}
                  >
                    Pending Review ({pendingMaterialsCount})
                  </button>
                  <button
                    onClick={() => { setMaterialsSubTab("approved"); reloadApprovedMaterials(); }}
                    className={`modern-btn-secondary !py-1.5 !px-3.5 text-xs ${materialsSubTab === "approved" ? "bg-indigo-600 !text-white" : ""}`}
                  >
                    Approved ({approvedMaterials.length})
                  </button>
                </div>
              </div>

              {/* Sub-tab: Pending */}
              {materialsSubTab === "pending" && (
                <div className="space-y-4">
                  {pendingMaterials.length === 0 ? (
                    <div className="modern-card text-center py-12">
                      <span className="text-3xl block mb-2">🎉</span>
                      <span className="text-xs text-slate-400 font-medium">All student uploads reviewed!</span>
                    </div>
                  ) : (
                    pendingMaterials.map((item) => (
                      <div key={item.id} className="modern-card">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-800">{item.title}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono uppercase font-bold">{item.content_type}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Subject: <span className="font-bold text-slate-700">{item.subject_name}</span> | Type: <span className="font-bold text-slate-700">{item.section}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Submitted by {item.uploader_name} on {new Date(item.created_at).toLocaleDateString()}</div>
                          </div>

                          <div className="flex items-center gap-2 self-start">
                            <button
                              onClick={() => setPreviewMaterialId(previewMaterialId === item.id ? null : item.id)}
                              className="modern-btn-secondary !py-1.5 !px-3 text-xs"
                            >
                              {previewMaterialId === item.id ? "Close View" : "View"}
                            </button>
                            <button onClick={() => handleApproveMaterial(item.id)} className="modern-btn-primary !py-1.5 !px-3 text-xs bg-emerald-600 hover:bg-emerald-700">Approve</button>
                            <button
                              onClick={() => setRejectionInputId(rejectionInputId === item.id ? null : item.id)}
                              className="modern-btn-danger !py-1.5 !px-3 text-xs"
                            >
                              Reject
                            </button>
                          </div>
                        </div>

                        {rejectionInputId === item.id && (
                          <div className="mt-4 p-3 bg-rose-50/50 rounded-xl border border-rose-100 space-y-2">
                            <label className="text-[10px] font-bold text-rose-600 uppercase">Reason for Rejection</label>
                            <div className="flex gap-2">
                              <input
                                placeholder="E.g. Incomplete notes / blurry image"
                                value={rejectionReasonText}
                                onChange={(e) => setRejectionReasonText(e.target.value)}
                                className="modern-input"
                              />
                              <button onClick={() => handleRejectConfirm(item.id)} className="modern-btn-primary bg-rose-600 hover:bg-rose-700">Reject</button>
                            </div>
                          </div>
                        )}

                        {previewMaterialId === item.id && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            {item.content_type === "pdf" && <iframe src={item.file_url} className="w-full h-96 border rounded-lg bg-white" />}
                            {item.content_type === "image" && <img src={item.file_url} className="max-h-96 object-contain rounded-lg mx-auto border" />}
                            {item.content_type === "text" && (
                              <div className="bg-slate-50 p-4 rounded-lg text-xs prose text-slate-800 max-h-80 overflow-y-auto" dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(item.text_content) }} />
                            )}
                            {item.content_type === "html" && (
                              <iframe srcDoc={item.text_content} className="w-full h-80 border rounded-lg bg-white" />
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sub-tab: Approved */}
              {materialsSubTab === "approved" && (
                <div className="space-y-3">
                  {approvedMaterials.map((item) => (
                    <div key={item.id} className={`modern-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${item.is_hidden ? "opacity-60" : ""}`}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-800">{item.title}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-660 px-1.5 py-0.5 rounded font-mono uppercase">{item.content_type}</span>
                          {item.is_hidden && <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">HIDDEN</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{item.subject_code} | Uploaded by {item.uploader_name}</div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => handleToggleHidden(item.id)} className="modern-btn-secondary !py-1 !px-2.5 text-xs">
                          {item.is_hidden ? "👁️ Unhide" : "🙈 Hide"}
                        </button>
                        {deleteConfirmId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDeleteMaterial(item.id)} className="modern-btn-danger !py-1 !px-2.5 text-xs">Confirm</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="modern-btn-secondary !py-1 !px-2.5 text-xs">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(item.id)} className="modern-btn-danger !py-1 !px-2.5 text-xs">🗑️ Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {approvedMaterials.length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-400">No approved materials.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 🗓️ TABS: TIMETABLE PLANNER */}
          {tab === "timetable" && (
            <div className="space-y-6">
              <div className="modern-card">
                <TimetableGrid week={week} onDeleteSlot={handleDeleteSlot} />
              </div>

              <div className="modern-card">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Add Custom Class Slot</h3>
                <form onSubmit={addSlot} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Day</label>
                    <select className="modern-select w-full mt-1" value={slotForm.day_of_week} onChange={(e) => setSlotForm({ ...slotForm, day_of_week: Number(e.target.value) })}>
                      {DAYS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Slot Number</label>
                    <input type="number" min="1" className="modern-input mt-1" value={slotForm.slot_number} onChange={(e) => setSlotForm({ ...slotForm, slot_number: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Batch Target</label>
                    <select className="modern-select w-full mt-1" value={slotForm.batch} onChange={(e) => setSlotForm({ ...slotForm, batch: e.target.value })}>
                      <option value="ALL">All Batch</option>
                      <option value="G1">G1</option>
                      <option value="G2">G2</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Start Time</label>
                    <input type="time" className="modern-input mt-1" value={slotForm.start_time} onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">End Time</label>
                    <input type="time" className="modern-input mt-1" value={slotForm.end_time} onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Subject</label>
                    <select className="modern-select w-full mt-1" value={slotForm.subject_id} onChange={(e) => setSlotForm({ ...slotForm, subject_id: e.target.value })} required>
                      <option value="">Select subject...</option>
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Custom Label Override (Optional)</label>
                    <input className="modern-input mt-1" placeholder="e.g. CD - Bunk Day" value={slotForm.label} onChange={(e) => setSlotForm({ ...slotForm, label: e.target.value })} />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="modern-btn-primary w-full">Create Class Slot</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 🎉 TABS: HOLIDAY MANAGER */}
          {tab === "holidays" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="modern-card md:col-span-1">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Declare Holiday</h3>
                <p className="text-xs text-slate-400 mb-4">Cancels all lectures and practicals scheduled on the selected date.</p>
                <form onSubmit={addHoliday} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                    <input type="date" className="modern-input mt-1" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Reason</label>
                    <input className="modern-input mt-1" placeholder="e.g. Diwali / Mid-Term Break" value={holidayForm.reason} onChange={(e) => setHolidayForm({ ...holidayForm, reason: e.target.value })} />
                  </div>
                  <button type="submit" className="modern-btn-primary w-full">Mark Holiday</button>
                </form>
              </div>

              <div className="modern-card md:col-span-2">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Active Declared Holidays ({holidays.length})</h3>
                <div className="divide-y max-h-[400px] overflow-y-auto pr-1">
                  {holidays.map((h) => (
                    <div key={h.id} className="py-3 flex justify-between items-center gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-700">{new Date(h.date).toLocaleDateString()}</div>
                        {h.reason && <div className="text-[10px] text-slate-400">{h.reason}</div>}
                      </div>
                      <button onClick={() => removeHoliday(h.id)} className="text-xs text-rose-500 hover:text-rose-700 font-bold">Remove</button>
                    </div>
                  ))}
                  {holidays.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400">No holidays currently declared.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 📢 TABS: BROADCASTER */}
          {tab === "broadcast" && (
            <div className="modern-card max-w-2xl mx-auto">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Queue Global Announcement</h3>
              <p className="text-xs text-slate-400 mb-5">Broadcast notifications instantly via connected communication integrations.</p>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Select Delivery Integrations</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={broadcastChannels.email}
                        onChange={(e) => setBroadcastChannels({ ...broadcastChannels, email: e.target.checked })}
                      /> 📧 Email Notification
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={broadcastChannels.telegram}
                        onChange={(e) => setBroadcastChannels({ ...broadcastChannels, telegram: e.target.checked })}
                      /> 🤖 Telegram Message
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Recipients ({selectedUserIds.length} Selected)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      placeholder="Filter student list..."
                      value={broadcastUserSearch}
                      onChange={(e) => setBroadcastUserSearch(e.target.value)}
                      className="modern-input !py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const activeUsers = users.filter(u => u.is_active);
                        if (selectedUserIds.length === activeUsers.length) {
                          setSelectedUserIds([]);
                        } else {
                          setSelectedUserIds(activeUsers.map(u => u.id));
                        }
                      }}
                      className="modern-btn-secondary !py-1.5 !px-3 text-xs shrink-0"
                    >
                      Toggle All
                    </button>
                  </div>

                  <div className="border rounded-lg max-h-40 overflow-y-auto p-2 bg-slate-55 space-y-1">
                    {users.filter(u => u.is_active).filter(u =>
                      !broadcastUserSearch || u.name?.toLowerCase().includes(broadcastUserSearch.toLowerCase())
                    ).map((u) => {
                      const isChecked = selectedUserIds.includes(u.id);
                      return (
                        <label key={u.id} className="flex items-center justify-between p-1.5 hover:bg-white rounded cursor-pointer text-xs">
                          <span className="flex items-center gap-2 font-medium">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                                } else {
                                  setSelectedUserIds([...selectedUserIds, u.id]);
                                }
                              }}
                            />
                            {u.name} <span className="text-[10px] text-slate-400">({u.batch})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {broadcastChannels.email && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Notification Subscribers ({selectedSubscriberIds.length} Selected)</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        placeholder="Filter subscriber list..."
                        value={broadcastSubSearch}
                        onChange={(e) => setBroadcastSubSearch(e.target.value)}
                        className="modern-input !py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSubscriberIds.length === subscribers.length) {
                            setSelectedSubscriberIds([]);
                          } else {
                            setSelectedSubscriberIds(subscribers.map(s => s.id));
                          }
                        }}
                        className="modern-btn-secondary !py-1.5 !px-3 text-xs shrink-0"
                      >
                        Toggle All
                      </button>
                    </div>

                    <div className="border rounded-lg max-h-40 overflow-y-auto p-2 bg-slate-55 space-y-1">
                      {subscribers.filter(s =>
                        !broadcastSubSearch || s.email?.toLowerCase().includes(broadcastSubSearch.toLowerCase())
                      ).map((s) => {
                        const isChecked = selectedSubscriberIds.includes(s.id);
                        return (
                          <label key={s.id} className="flex items-center justify-between p-1.5 hover:bg-white rounded cursor-pointer text-xs">
                            <span className="flex items-center gap-2 font-medium">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedSubscriberIds(selectedSubscriberIds.filter(id => id !== s.id));
                                  } else {
                                    setSelectedSubscriberIds([...selectedSubscriberIds, s.id]);
                                  }
                                }}
                              />
                              {s.email}
                            </span>
                          </label>
                        );
                      })}
                      {subscribers.length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-400">No subscribers currently.</div>
                      )}
                    </div>
                  </div>
                )}

                {broadcastChannels.email && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Email Title / Subject</label>
                    <input
                      placeholder="e.g. Platform update: New PYQs loaded"
                      value={broadcastSubject}
                      onChange={(e) => setBroadcastSubject(e.target.value)}
                      className="modern-input mt-1"
                      required
                    />
                  </div>
                )}

                {(broadcastChannels.email || broadcastChannels.telegram) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Button / Link Text (Optional)</label>
                      <input
                        placeholder="e.g. Go to Dashboard"
                        value={broadcastButtonText}
                        onChange={(e) => setBroadcastButtonText(e.target.value)}
                        className="modern-input mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Button / Link URL (Optional)</label>
                      <input
                        placeholder="e.g. https://..."
                        value={broadcastButtonLink}
                        onChange={(e) => setBroadcastButtonLink(e.target.value)}
                        className="modern-input mt-1"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Broadcast Message Body</label>
                  <textarea
                    rows="5"
                    placeholder="Provide details about updates, syllabus releases, etc."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="modern-input mt-1"
                    required
                  />
                </div>

                {broadcastMsg && (
                  <div className={`p-3 rounded-lg text-xs font-semibold ${broadcastMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {broadcastMsg.text}
                  </div>
                )}

                <button type="submit" className="modern-btn-primary w-full" disabled={broadcastLoading || (!broadcastChannels.email && !broadcastChannels.telegram)}>
                  {broadcastLoading ? "Dispatching Broadcast..." : "🚀 Disperse Announcement"}
                </button>
              </form>
            </div>
          )}

          {/* 📣 TABS: LIVE ANNOUNCEMENT BAR */}
          {tab === "announcement" && (
            <div className="modern-card">
              <AnnouncementManager />
            </div>
          )}

          {/* 🕵️‍♂️ TABS: MODERATOR ACTIVITY LOGS */}
          {tab === "moderator-logs" && (
            <div className="modern-card">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Moderator Activity Logbook</h3>
                  <p className="text-xs text-slate-400">Audit logs recording content approvals, deletions and actions.</p>
                </div>
                <button onClick={reloadModeratorLogs} className="modern-btn-secondary !py-1.5 !px-3 text-xs" disabled={logsLoading}>
                  {logsLoading ? "Reloading..." : "🔄 Refresh"}
                </button>
              </div>

              {logsLoading && moderatorLogs.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">Loading audit history...</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Moderator</th>
                        <th className="p-3">Action Type</th>
                        <th className="p-3">Audit Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moderatorLogs.map(log => (
                        <tr key={log.id} className="border-b hover:bg-slate-55">
                          <td className="p-3 font-mono text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="p-3 font-semibold text-slate-700">{log.moderator_name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase text-[9px]">
                              {log.action.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{log.details}</td>
                        </tr>
                      ))}
                      {moderatorLogs.length === 0 && (
                        <tr><td colSpan="4" className="p-6 text-center text-slate-400">No logs found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ⚡ TABS: SYSTEM HEALTH */}
          {tab === "health" && (
            <div className="space-y-6">
              <div className="modern-card flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Diagnostics Monitor</h3>
                  <p className="text-xs text-slate-400">Check connection health statuses of connected nodes, APIs and mail engines.</p>
                </div>
                <button onClick={loadHealth} className="modern-btn-primary !py-1.5" disabled={healthLoading}>
                  {healthLoading ? "Refreshing..." : "🔄 Run Diagnostics"}
                </button>
              </div>

              {healthLoading && !health ? (
                <div className="text-center py-10 text-xs text-slate-400">Diagnosing system nodes, stand by...</div>
              ) : health ? (
                <div className="health-grid">
                  <div className="health-card">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-700">💾 Supabase Postgres</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${health.database.status === "online" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          {health.database.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Holds user accounts, timetables, and logged attendance states.</p>
                    </div>
                    <div className="border-t pt-2 mt-4 text-[10px] font-mono text-slate-500 flex justify-between">
                      <span>Response Latency:</span>
                      <span className="font-bold text-slate-700">{health.database.latency}</span>
                    </div>
                  </div>

                  <div className="health-card">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-700">🪣 Storage Engine</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${health.b2.status === "online" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          {health.b2.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Handles storage uploads, syllabus documentation files & student materials.</p>
                    </div>
                    <div className="border-t pt-2 mt-4 text-[10px] font-mono text-slate-500 flex justify-between">
                      <span>Status Message:</span>
                      <span className="font-bold text-slate-700 truncate max-w-[150px]">{health.b2.error || "Operational"}</span>
                    </div>
                  </div>

                  <div className="health-card">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-700">🤖 Telegram API Channel</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${health.telegram.status === "online" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                          {health.telegram.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Responsible for daily digests, bunk alerts & post-lecture attendance reminders.</p>
                    </div>
                    <div className="border-t pt-2 mt-4 text-[10px] font-mono text-slate-500 flex justify-between">
                      <span>Integration Method:</span>
                      <span className="font-bold text-slate-700">{health.telegram.type || "Not Set"}</span>
                    </div>
                  </div>

                  <div className="health-card">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-700">✉️ Mailer Dispatch Node</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${health.resend.status === "online" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          {health.resend.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Sends registration notifications, OTP verification, and account password resets.</p>
                    </div>
                    <div className="border-t pt-2 mt-4 text-[10px] font-mono text-slate-500 flex justify-between">
                      <span>Config Status:</span>
                      <span className="font-bold text-slate-700">{health.resend.error ? "Key Missing" : "Verified"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="modern-card text-center py-6 text-xs text-slate-400">Diagnostics failed to fetch. Ensure back-end node is active.</div>
              )}
            </div>
          )}

          {/* ⚙️ TABS: SECURITY SETTINGS */}
          {tab === "settings" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="modern-card md:col-span-2">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Update Administrator Password</h3>
                <form onSubmit={changePassword} className="space-y-4">
                  {[
                    { key: "current", label: "Current Password", ph: "Enter current credentials", ac: "current-password" },
                    { key: "next", label: "New Password", ph: "Minimum 8 characters", ac: "new-password" },
                    { key: "confirm", label: "Confirm Password", ph: "Repeat new credentials", ac: "new-password" },
                  ].map(({ key, label, ph, ac }) => (
                    <div key={key}>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">{label}</label>
                      <div className="relative mt-1">
                        <input
                          type={showPw[key] ? "text" : "password"}
                          placeholder={ph}
                          value={pwForm[key]}
                          onChange={(e) => { setPwForm({ ...pwForm, [key]: e.target.value }); setPwMsg(null); }}
                          className="modern-input pr-10"
                          required
                          autoComplete={ac}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw({ ...showPw, [key]: !showPw[key] })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
                        >
                          {showPw[key] ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>
                  ))}

                  {pwMsg && (
                    <div className={`p-2.5 rounded-lg text-xs font-semibold ${pwMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                      {pwMsg.text}
                    </div>
                  )}

                  <button type="submit" className="modern-btn-primary w-full" disabled={pwLoading}>
                    {pwLoading ? "Updating..." : "Change Security Password"}
                  </button>
                </form>
              </div>

              <div className="modern-card md:col-span-1">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Platform Parameters</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-400">Active Students</span>
                    <span className="font-bold text-slate-700">{users.length}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-400">Total Subjects</span>
                    <span className="font-bold text-slate-700">{subjects.length}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-400">Declared Holidays</span>
                    <span className="font-bold text-slate-700">{holidays.length}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-400">Attendance Threshold</span>
                    <span className="font-bold text-indigo-600">75%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
