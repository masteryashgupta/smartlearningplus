import { useEffect, useState } from "react";
import { api } from "../api.js";
import Navbar from "../components/Navbar.jsx";
import SubjectGauge from "../components/SubjectGauge.jsx";
import TimetableGrid from "../components/TimetableGrid.jsx";
import Heatmap from "../components/Heatmap.jsx";
import DayEditor from "../components/DayEditor.jsx";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "timetable", label: "Timetable" },
  { key: "leaderboard", label: "Friends" },
];

export default function StudentDashboard() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [week, setWeek] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);

  // Profile and Telegram connection states
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const refreshData = () => {
    api.get("/attendance/stats").then((r) => setStats(r.data));
    api.get("/attendance/heatmap").then((r) => setHeatmap(r.data));
    api.get("/timetable").then((r) => setWeek(r.data.week));
    api.get("/attendance/leaderboard").then((r) => setLeaderboard(r.data));
  };

  useEffect(() => {
    refreshData();
    fetchProfile();
  }, []);

  useEffect(() => {
    let interval;
    if (profile && !profile.telegram_id) {
      interval = setInterval(() => {
        api.get("/auth/student/profile")
          .then((r) => {
            if (r.data.telegram_id) {
              setProfile(r.data);
            }
          })
          .catch((e) => console.error(e));
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [profile]);

  function fetchProfile() {
    setLoadingProfile(true);
    api.get("/auth/student/profile")
      .then((r) => setProfile(r.data))
      .catch((err) => console.error("Error fetching profile", err))
      .finally(() => setLoadingProfile(false));
  }

  async function handleDisconnectTelegram() {
    if (!window.confirm("Are you sure you want to disconnect your Telegram account?")) return;
    setLoadingProfile(true);
    try {
      await api.post("/auth/student/disconnect-telegram");
      fetchProfile();
    } catch (err) {
      console.error("Error disconnecting Telegram", err);
    } finally {
      setLoadingProfile(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar tabs={TABS} active={tab} onTab={setTab} />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6 md:col-span-2 bg-gradient-to-br from-[#6D5EF5] to-[#4F46E5] text-white shadow-lg shadow-primary/10 border-0 relative overflow-hidden flex items-center justify-between">
                <div className="relative z-10">
                  <div className="text-white/85 text-xs font-semibold uppercase tracking-wider">Overall attendance</div>
                  <div className="font-display font-bold text-5xl mt-2 flex items-baseline gap-0.5">
                    {stats?.overall.percentage ?? "—"}<span className="text-xl opacity-80">%</span>
                  </div>
                  <div className="text-xs text-white/70 font-mono mt-3">
                    {stats?.overall.present ?? 0} of {stats?.overall.total ?? 0} classes attended
                  </div>
                </div>
                {/* Modern subtle ambient glow shapes */}
                <div className="absolute right-0 top-0 w-36 h-36 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="absolute left-1/3 bottom-0 w-24 h-24 bg-white/5 rounded-full blur-xl -mb-10"></div>
              </div>

              <div className="card p-5 flex flex-col justify-between bg-white border border-line rounded-xl shadow-soft">
                <div>
                  <div className="text-muted text-sm font-medium">Telegram Connection</div>
                  {profile?.telegram_id ? (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-green-600 font-semibold text-sm">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
                        Connected
                      </div>
                      <div className="text-xs text-muted font-mono">
                        {profile.telegram_username ? `@${profile.telegram_username}` : `ID: ${profile.telegram_id}`}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-sm">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
                        Disconnected
                      </div>
                      <div className="text-xs text-muted leading-tight">
                        Receive instant alerts and mark class attendance.
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {profile?.telegram_id ? (
                    <button
                      onClick={handleDisconnectTelegram}
                      className="text-xs text-bad hover:underline font-medium text-red-500"
                      disabled={loadingProfile}
                    >
                      {loadingProfile ? "Disconnecting…" : "Disconnect account"}
                    </button>
                  ) : (
                    profile?.telegram_connect_token && profile?.bot_username ? (
                      <a
                        href={`https://t.me/${profile.bot_username}?start=${profile.telegram_connect_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary py-1.5 px-3 text-xs inline-block text-center"
                      >
                        Connect Bot
                      </a>
                    ) : (
                      <span className="text-xs text-muted">Loading connect token…</span>
                    )
                  )}
                  <button onClick={fetchProfile} className="text-xs text-primary hover:underline font-medium">
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {stats && stats.perSubject.length > 0 && (
              <div className="space-y-6">
                {stats.perSubject.some((s) => s.type === "theory") && (
                  <div>
                    <div className="font-display font-semibold mb-3 text-ink">Theory Subjects</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {stats.perSubject
                        .filter((s) => s.type === "theory")
                        .map((s) => (
                          <SubjectGauge key={s.subject_id} subject={s} />
                        ))}
                    </div>
                  </div>
                )}

                {stats.perSubject.some((s) => s.type === "lab") && (
                  <div>
                    <div className="font-display font-semibold mb-3 text-ink">Labs</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {stats.perSubject
                        .filter((s) => s.type === "lab")
                        .map((s) => (
                          <SubjectGauge key={s.subject_id} subject={s} />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DayEditor onAttendanceChange={refreshData} />
            <Heatmap data={heatmap} />
          </>
        )}

        {tab === "timetable" && <TimetableGrid week={week} />}

        {tab === "leaderboard" && (
          <div className="card p-4">
            <div className="font-display font-semibold mb-3">Friends Leaderboard</div>
            <div className="space-y-1.5">
              {leaderboard.map((u, i) => (
                <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-paper">
                  <div className="flex items-center gap-3">
                    <span className="text-muted text-sm font-mono w-5">{i + 1}</span>
                    <span className="font-medium text-sm">{u.name}</span>
                    <span className="text-xs text-muted">{u.batch}</span>
                  </div>
                  <span className="font-mono text-sm">
                    {u.percentage !== null ? `${u.percentage}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
