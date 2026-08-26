import { useEffect, useState, useRef } from "react";
import { api, clearSession } from "../api.js";
import AnnouncementManager from "../components/AnnouncementManager.jsx";
import { Link } from "react-router-dom";

const TABS = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "broadcast", label: "Emailer / Broadcaster", icon: "📢" },
  { key: "subscribers", label: "Email Subscribers", icon: "📧" },
  { key: "materials", label: "Approvals Vault", icon: "📚", badgeKey: "pendingMaterialsCount" },
  { key: "announcement", label: "Announcement Bar", icon: "📣" },
  { key: "pastes", label: "QuickPaste Manager", icon: "📋" },
  { key: "moderator-logs", label: "Activity Logs", icon: "🕵️‍♂️" },
  { key: "health", label: "System Health", icon: "⚡" },
  { key: "settings", label: "Security Settings", icon: "⚙️" },
];

function StatCard({ icon, label, value, sub, color = "#10B981" }) {
  return (
    <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-start gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: color + "18", color }}
      >
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold mt-0.5" style={{ color }}>{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Subscribers
  const [subscribers, setSubscribers] = useState([]);
  const [subSearch, setSubSearch] = useState("");
  const [newSubEmail, setNewSubEmail] = useState("");
  const [subAdding, setSubAdding] = useState(false);
  const [subMessage, setSubMessage] = useState(null);

  // Email Broadcaster
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastBtnText, setBroadcastBtnText] = useState("Visit Smart Learning+");
  const [broadcastBtnLink, setBroadcastBtnLink] = useState("https://smartlearningplus.me");
  const [customEmails, setCustomEmails] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);

  // Approvals Vault
  const [pendingMaterials, setPendingMaterials] = useState([]);
  const [approvedMaterials, setApprovedMaterials] = useState([]);
  const [materialsSubTab, setMaterialsSubTab] = useState("pending");
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionTargetId, setRejectionTargetId] = useState(null);

  // Pastes
  const [pastes, setPastes] = useState([]);

  // Logs & Health
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState(null);

  const fetchOverview = async () => {
    try {
      const { data } = await api.get("/admin/overview");
      setOverview(data);
    } catch (err) {
      console.error("Overview error:", err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const { data } = await api.get("/admin/subscribers");
      setSubscribers(data);
    } catch (err) {
      console.error("Subscribers error:", err);
    }
  };

  const fetchMaterials = async () => {
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        api.get("/admin/materials/pending"),
        api.get("/admin/materials/approved"),
      ]);
      setPendingMaterials(pendingRes.data);
      setApprovedMaterials(approvedRes.data);
    } catch (err) {
      console.error("Materials error:", err);
    }
  };

  const fetchPastes = async () => {
    try {
      const { data } = await api.get("/admin/pastes");
      setPastes(data);
    } catch (err) {
      console.error("Pastes error:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data } = await api.get("/admin/moderator-logs");
      setLogs(data);
    } catch (err) {
      console.error("Logs error:", err);
    }
  };

  const fetchHealth = async () => {
    try {
      const { data } = await api.get("/admin/health");
      setHealth(data);
    } catch (err) {
      console.error("Health error:", err);
    }
  };

  useEffect(() => {
    fetchOverview();
    if (tab === "subscribers") fetchSubscribers();
    if (tab === "materials") fetchMaterials();
    if (tab === "pastes") fetchPastes();
    if (tab === "moderator-logs") fetchLogs();
    if (tab === "health") fetchHealth();
  }, [tab]);

  // Handle Add Subscriber
  const handleAddSubscriber = async (e) => {
    e.preventDefault();
    if (!newSubEmail.trim()) return;
    setSubAdding(true);
    setSubMessage(null);
    try {
      await api.post("/admin/subscribers/add", { email: newSubEmail.trim() });
      setSubMessage({ type: "success", text: `Successfully subscribed ${newSubEmail.trim()}` });
      setNewSubEmail("");
      fetchSubscribers();
      fetchOverview();
    } catch (err) {
      setSubMessage({ type: "error", text: err.response?.data?.error || "Failed to add subscriber" });
    } finally {
      setSubAdding(false);
    }
  };

  // Handle Delete Subscriber
  const handleDeleteSubscriber = async (id, email) => {
    if (!window.confirm(`Are you sure you want to remove "${email}" from subscribers?`)) return;
    try {
      await api.delete(`/admin/subscribers/${id}`);
      fetchSubscribers();
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to remove subscriber");
    }
  };

  // Handle Broadcast Dispatch
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastMsg.trim()) {
      alert("Subject and message are required.");
      return;
    }
    const count = overview?.subscribersCount || 0;
    const confirmMsg = `Send email broadcast to ${count} active subscriber(s)?`;
    if (!window.confirm(confirmMsg)) return;

    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const { data } = await api.post("/admin/broadcast", {
        subject: broadcastSubject.trim(),
        message: broadcastMsg.trim(),
        buttonText: broadcastBtnText.trim(),
        buttonLink: broadcastBtnLink.trim(),
        customEmails: customEmails.trim(),
      });
      setBroadcastResult({
        ok: true,
        text: `🚀 Broadcast dispatched successfully to ${data.sentCount} recipient(s)!`,
      });
      setBroadcastSubject("");
      setBroadcastMsg("");
    } catch (err) {
      setBroadcastResult({
        ok: false,
        text: err.response?.data?.error || "Broadcast failed. Check Resend configuration.",
      });
    } finally {
      setBroadcasting(false);
    }
  };

  // Handle Material Approve / Reject
  const handleApproveMaterial = async (id) => {
    try {
      await api.post(`/admin/materials/${id}/approve`);
      fetchMaterials();
      fetchOverview();
    } catch (err) {
      alert("Failed to approve material");
    }
  };

  const handleRejectMaterial = async (id) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    try {
      await api.post(`/admin/materials/${id}/reject`, { reason: rejectionReason.trim() });
      setRejectionTargetId(null);
      setRejectionReason("");
      fetchMaterials();
      fetchOverview();
    } catch (err) {
      alert("Failed to reject material");
    }
  };

  const handleToggleMaterialVisibility = async (id) => {
    try {
      await api.patch(`/admin/materials/${id}/toggle-visibility`);
      fetchMaterials();
    } catch (err) {
      alert("Failed to toggle visibility");
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm("Permanently delete this material?")) return;
    try {
      await api.delete(`/admin/materials/${id}`);
      fetchMaterials();
      fetchOverview();
    } catch (err) {
      alert("Failed to delete material");
    }
  };

  // Handle Delete Paste
  const handleDeletePaste = async (id, slug) => {
    if (!window.confirm(`Delete paste "/${slug}"?`)) return;
    try {
      await api.delete(`/admin/pastes/${id}`);
      fetchPastes();
      fetchOverview();
    } catch (err) {
      alert("Failed to delete paste");
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    try {
      const { data } = await api.post("/admin/settings/password", {
        currentPassword,
        newPassword,
      });
      setPasswordMsg({ type: "success", text: data.message });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordMsg({
        type: "error",
        text: err.response?.data?.error || "Failed to update password",
      });
    }
  };

  function signOut() {
    clearSession();
    window.location.href = "/login";
  }

  const filteredSubscribers = subscribers.filter((s) =>
    s.email.toLowerCase().includes(subSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900/90 border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-6 px-2">
          <Link to="/" className="flex items-center gap-2.5 text-decoration-none">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center shadow-md">
              <img src="/logo.png?v=3" alt="Logo" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white">Smart Learning+</div>
              <div className="text-[10px] text-slate-400 font-mono">Admin Portal</div>
            </div>
          </Link>
          <Link to="/" className="text-xs text-slate-400 hover:text-white transition-colors">
            Exit &rarr;
          </Link>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            const badge = t.badgeKey && overview ? overview[t.badgeKey] : null;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </div>
                {badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-800 mt-4">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-6xl">
        {/* TAB 1: OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Platform Dashboard</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Overview of subscribers, study materials vault, and communication status
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon="📧"
                label="Email Subscribers"
                value={overview?.subscribersCount ?? 0}
                sub="Notification recipients"
                color="#6366F1"
              />
              <StatCard
                icon="📚"
                label="Approved Materials"
                value={overview?.approvedMaterialsCount ?? 0}
                sub="Live in study vaults"
                color="#10B981"
              />
              <StatCard
                icon="📥"
                label="Pending Submissions"
                value={overview?.pendingMaterialsCount ?? 0}
                sub="Awaiting admin approval"
                color="#F59E0B"
              />
              <StatCard
                icon="📋"
                label="Active QuickPastes"
                value={overview?.pastesCount ?? 0}
                sub="Temporary code/notes"
                color="#06B6D4"
              />
            </div>

            {/* Quick Actions Card */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⚡</span>
                <span>Quick Admin Actions</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setTab("broadcast")}
                  className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-all"
                >
                  <div className="text-lg mb-1">📢</div>
                  <div className="text-xs font-bold text-white">Send Email Broadcast</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Send updates to all subscribers</div>
                </button>
                <button
                  onClick={() => setTab("subscribers")}
                  className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-all"
                >
                  <div className="text-lg mb-1">👥</div>
                  <div className="text-xs font-bold text-white">Manage Subscribers</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">View and export email list</div>
                </button>
                <button
                  onClick={() => setTab("materials")}
                  className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-all"
                >
                  <div className="text-lg mb-1">📥</div>
                  <div className="text-xs font-bold text-white">Review Submissions</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{overview?.pendingMaterialsCount || 0} pending in vault</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BROADCASTER / EMAILER */}
        {tab === "broadcast" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📢</span>
                <span>Email Broadcaster (Newsletter &amp; Alerts)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispatch branded email newsletters, unit note alerts, and announcements to all {overview?.subscribersCount || 0} subscribers via Resend.
              </p>
            </div>

            {broadcastResult && (
              <div
                className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  broadcastResult.ok
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                }`}
              >
                <span>{broadcastResult.ok ? "✅" : "⚠️"}</span>
                <span>{broadcastResult.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Compose Form */}
              <form onSubmit={handleSendBroadcast} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
                <h3 className="text-sm font-bold text-white mb-2">Compose Email Broadcast</h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    placeholder="e.g. New Unit 2 Notes & Cheat Sheet Published!"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Message Content (Markdown supported) *
                  </label>
                  <textarea
                    rows={8}
                    required
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    placeholder="Hi there,\n\nWe have updated the Operating Systems unit 2 study notes with new memory management diagrams and exam cheat sheets.\n\n- Topic 1: Virtual Memory\n- Topic 2: Page Replacement Algorithms\n\nCheck them out on the platform!"
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-primary resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Button Text (Optional)
                    </label>
                    <input
                      type="text"
                      value={broadcastBtnText}
                      onChange={(e) => setBroadcastBtnText(e.target.value)}
                      placeholder="Visit Smart Learning+"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Button Link (Optional)
                    </label>
                    <input
                      type="text"
                      value={broadcastBtnLink}
                      onChange={(e) => setBroadcastBtnLink(e.target.value)}
                      placeholder="https://smartlearningplus.me"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Custom Extra Emails (Optional, comma-separated)
                  </label>
                  <input
                    type="text"
                    value={customEmails}
                    onChange={(e) => setCustomEmails(e.target.value)}
                    placeholder="test@domain.com, student@domain.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={broadcasting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 text-white font-bold text-xs shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {broadcasting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Dispatching Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Send Email Broadcast Now</span>
                    </>
                  )}
                </button>
              </form>

              {/* Preview Card */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
                <h3 className="text-sm font-bold text-slate-300">Live Email Layout Preview</h3>
                <div className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden shadow-xl text-left">
                  <div className="bg-gradient-to-r from-primary to-indigo-600 p-5 text-white">
                    <div className="text-lg font-extrabold">Smart Learning+</div>
                    <div className="text-[11px] opacity-80 uppercase tracking-wider mt-0.5">Study Update &amp; Notification</div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="text-xs font-bold text-white">
                      Subject: {broadcastSubject || "Announcement from Smart Learning+"}
                    </div>
                    <div className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {broadcastMsg || "Your announcement message will render here in clean, styled typography with Markdown support."}
                    </div>
                    {broadcastBtnText && (
                      <div className="pt-2">
                        <span className="inline-block px-4 py-2 rounded-lg bg-primary text-white font-bold text-xs shadow-sm">
                          {broadcastBtnText} &rarr;
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-400">
                    Smart Learning+ · Open Engineering Study Hub
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUBSCRIBERS */}
        {tab === "subscribers" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>📧</span>
                  <span>Notification Subscribers ({subscribers.length})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Users who opted in to receive study updates, exam tips, and feature announcements.
                </p>
              </div>

              {/* Add Subscriber Inline Form */}
              <form onSubmit={handleAddSubscriber} className="flex items-center gap-2">
                <input
                  type="email"
                  required
                  value={newSubEmail}
                  onChange={(e) => setNewSubEmail(e.target.value)}
                  placeholder="Add subscriber email..."
                  className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary w-48 sm:w-60"
                />
                <button
                  type="submit"
                  disabled={subAdding}
                  className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors shrink-0"
                >
                  {subAdding ? "Adding..." : "+ Add"}
                </button>
              </form>
            </div>

            {subMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  subMessage.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {subMessage.text}
              </div>
            )}

            {/* Search & Table */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="🔍 Search subscribers..."
                  className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs w-full max-w-xs focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => {
                    const emails = subscribers.map((s) => s.email).join("\n");
                    navigator.clipboard.writeText(emails);
                    alert("Copied all subscriber emails to clipboard!");
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors shrink-0"
                >
                  📋 Copy All ({subscribers.length})
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="pb-3 px-3">#</th>
                      <th className="pb-3 px-3">Subscriber Email</th>
                      <th className="pb-3 px-3">Subscribed Date</th>
                      <th className="pb-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredSubscribers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          No subscribers found.
                        </td>
                      </tr>
                    ) : (
                      filteredSubscribers.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-3 px-3 font-semibold text-slate-200">{s.email}</td>
                          <td className="py-3 px-3 text-slate-400 font-mono">
                            {new Date(s.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleDeleteSubscriber(s.id, s.email)}
                              className="text-rose-400 hover:text-rose-300 text-xs font-medium px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: APPROVALS VAULT */}
        {tab === "materials" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>📚</span>
                  <span>Study Materials Approvals Vault</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review and moderate community-submitted study notes and cheat sheets.
                </p>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setMaterialsSubTab("pending")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    materialsSubTab === "pending"
                      ? "bg-primary text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pending ({pendingMaterials.length})
                </button>
                <button
                  onClick={() => setMaterialsSubTab("approved")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    materialsSubTab === "approved"
                      ? "bg-primary text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Approved ({approvedMaterials.length})
                </button>
              </div>
            </div>

            {materialsSubTab === "pending" ? (
              <div className="space-y-3">
                {pendingMaterials.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
                    🎉 All pending community materials have been reviewed!
                  </div>
                ) : (
                  pendingMaterials.map((m) => (
                    <div
                      key={m.id}
                      className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                              {m.subject_name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                              {m.section}
                            </span>
                            <span className="text-[10px] uppercase font-mono text-slate-400">
                              {m.content_type}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white mt-1.5">{m.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Uploaded by <strong className="text-slate-200">{m.uploader_name || "Anonymous"}</strong> ·{" "}
                            {new Date(m.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {m.file_url && (
                            <a
                              href={m.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                            >
                              View File ↗
                            </a>
                          )}
                          <button
                            onClick={() => handleApproveMaterial(m.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => setRejectionTargetId(m.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>

                      {rejectionTargetId === m.id && (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                          <input
                            type="text"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Reason for rejection..."
                            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                          />
                          <button
                            onClick={() => handleRejectMaterial(m.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
                          >
                            Confirm Reject
                          </button>
                          <button
                            onClick={() => setRejectionTargetId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {approvedMaterials.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
                    No approved materials yet.
                  </div>
                ) : (
                  approvedMaterials.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{m.title}</span>
                          <span className="text-[10px] text-slate-400">({m.subject_name} · {m.section})</span>
                          {m.is_hidden && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Hidden
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          By {m.uploader_name || "Community"} · {new Date(m.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.file_url && (
                          <a
                            href={m.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline px-2"
                          >
                            View
                          </a>
                        )}
                        <button
                          onClick={() => handleToggleMaterialVisibility(m.id)}
                          className="text-xs text-slate-400 hover:text-white px-2 py-1"
                        >
                          {m.is_hidden ? "Unhide" : "Hide"}
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ANNOUNCEMENT BAR */}
        {tab === "announcement" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📣</span>
                <span>Announcement Bar Manager</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure the dynamic scrolling ticker across the top of all pages.
              </p>
            </div>
            <AnnouncementManager />
          </div>
        )}

        {/* TAB 6: QUICKPASTE MANAGER */}
        {tab === "pastes" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📋</span>
                <span>QuickPaste Items ({pastes.length})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage temporary public pastes and custom slugs created on QuickPaste.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 px-3">Slug</th>
                    <th className="pb-3 px-3">Length</th>
                    <th className="pb-3 px-3">Created</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {pastes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No active pastes.
                      </td>
                    </tr>
                  ) : (
                    pastes.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3">
                          <Link to={`/${p.slug}`} target="_blank" className="font-mono text-primary hover:underline">
                            /{p.slug}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-slate-400">{p.char_count} chars</td>
                        <td className="py-3 px-3 text-slate-400 font-mono">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeletePaste(p.id, p.slug)}
                            className="text-rose-400 hover:text-rose-300 text-xs font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: MODERATOR LOGS */}
        {tab === "moderator-logs" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🕵️‍♂️</span>
                <span>Moderator &amp; Admin Activity Logs</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit trail of platform broadcasts, material moderation, and configuration updates.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 px-3">Timestamp</th>
                    <th className="pb-3 px-3">Admin / Actor</th>
                    <th className="pb-3 px-3">Action</th>
                    <th className="pb-3 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No activity recorded yet.
                      </td>
                    </tr>
                  ) : (
                    logs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 text-slate-400 font-mono whitespace-nowrap">
                          {new Date(l.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-200">{l.moderator_name}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                            {l.action}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{l.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: SYSTEM HEALTH */}
        {tab === "health" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>⚡</span>
                <span>System Infrastructure Health</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time connection status of database, Resend email service, and backend APIs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PostgreSQL DB</div>
                <div className="flex items-center gap-2 text-lg font-bold text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{health?.database?.status === "online" ? "Connected" : "Offline"}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Latency: {health?.database?.latencyMs ?? 0} ms
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resend Mailer</div>
                <div className="flex items-center gap-2 text-lg font-bold text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{health?.resendMailer?.status === "online" ? "Online & Configured" : "Unconfigured"}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Service: Resend HTTPS API (Broadcasts &amp; Alerts)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: SECURITY SETTINGS */}
        {tab === "settings" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>⚙️</span>
                <span>Security Settings</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Update administrator password and security credentials.
              </p>
            </div>

            {passwordMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium ${
                  passwordMsg.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 max-w-md space-y-4">
              <h3 className="text-sm font-bold text-white">Change Admin Password</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  New Password (Min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-colors"
              >
                Update Password
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
