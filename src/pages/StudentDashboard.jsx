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
          .then((r) => { if (r.data.telegram_id) setProfile(r.data); })
          .catch((e) => console.error(e));
      }, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
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

  const overallPct = stats?.overall.percentage ?? null;
  const safeColor = overallPct === null ? "#6D5EF5" : overallPct >= 75 ? "#16A34A" : overallPct >= 65 ? "#F59E0B" : "#E11D48";

  return (
    <div className="min-h-screen">
      <Navbar tabs={TABS} active={tab} onTab={setTab} />
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">

        {tab === "overview" && (
          <>
            {/* Hero stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Overall attendance - spans full width on mobile, 2 cols on sm */}
              <div
                className="col-span-2 sm:col-span-2 rounded-2xl p-5 text-white relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${safeColor}dd, ${safeColor}99)` }}
              >
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                <div className="absolute left-1/3 bottom-0 w-20 h-20 bg-white/10 rounded-full blur-xl -mb-10 pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">Overall Attendance</div>
                  <div className="font-display font-bold flex items-baseline gap-1" style={{ fontSize: "clamp(2rem,8vw,3.5rem)" }}>
                    {overallPct ?? "—"}<span className="text-xl font-medium opacity-80">%</span>
                  </div>
                  <div className="text-white/70 text-xs font-mono mt-2">
                    {stats?.overall.present ?? 0} of {stats?.overall.total ?? 0} classes attended
                  </div>
                </div>
              </div>

              {/* Telegram card */}
              <div className="col-span-2 sm:col-span-1 card p-4 flex flex-col justify-between">
                <div>
                  <div className="text-muted text-xs font-semibold uppercase tracking-wider mb-2">Telegram</div>
                  {profile?.telegram_id ? (
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-green-700">Connected</div>
                        <div className="text-[11px] text-muted font-mono">
                          {profile.telegram_username ? `@${profile.telegram_username}` : `ID: ${profile.telegram_id}`}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-amber-700">Not linked</div>
                        <div className="text-[11px] text-muted">Connect for instant alerts</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                  {profile?.telegram_id ? (
                    <button
                      onClick={handleDisconnectTelegram}
                      disabled={loadingProfile}
                      className="text-xs text-red-500 hover:underline font-medium"
                    >
                      {loadingProfile ? "Disconnecting…" : "Disconnect"}
                    </button>
                  ) : (
                    profile?.telegram_connect_token && profile?.bot_username ? (
                      <a
                        href={`https://t.me/${profile.bot_username}?start=${profile.telegram_connect_token}`}
                        target="_blank" rel="noopener noreferrer"
                        className="btn-primary !py-1.5 !px-3 !text-xs"
                      >
                        Connect Bot →
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted">Loading…</span>
                    )
                  )}
                  <button onClick={fetchProfile} className="text-xs text-primary hover:underline font-medium">
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Per subject gauges */}
            {stats && stats.perSubject.length > 0 && (
              <div className="space-y-4">
                {stats.perSubject.some((s) => s.type === "theory") && (
                  <div>
                    <div className="font-display font-bold text-sm text-ink mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary rounded-full inline-block" />
                      Theory Subjects
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {stats.perSubject.filter((s) => s.type === "theory").map((s) => (
                        <SubjectGauge key={s.subject_id} subject={s} />
                      ))}
                    </div>
                  </div>
                )}
                {stats.perSubject.some((s) => s.type === "lab") && (
                  <div>
                    <div className="font-display font-bold text-sm text-ink mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-cyan-400 rounded-full inline-block" />
                      Labs
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {stats.perSubject.filter((s) => s.type === "lab").map((s) => (
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
          <div className="card p-0 overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-line bg-paper/50">
              <div className="font-display font-bold text-base text-ink">Friends Leaderboard</div>
              <div className="text-xs text-muted mt-0.5">{leaderboard.length} students ranked</div>
            </div>
            <div className="divide-y divide-line">
              {leaderboard.map((u, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                const pct = u.percentage;
                const barColor = pct >= 75 ? "#16A34A" : pct >= 65 ? "#F59E0B" : "#E11D48";
                return (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-paper/60 transition-colors">
                    <div className="w-7 text-center font-mono text-sm font-bold text-muted flex-shrink-0">
                      {medals[i] || `${i + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-ink truncate">{u.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-paper rounded-full text-muted font-mono flex-shrink-0">{u.batch}</span>
                      </div>
                      {/* Progress bar */}
                      {pct !== null && (
                        <div className="mt-1.5 h-1 rounded-full bg-line overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: barColor }}
                          />
                        </div>
                      )}
                    </div>
                    <div
                      className="font-bold text-sm font-mono flex-shrink-0"
                      style={{ color: pct !== null ? barColor : "#94A3B8" }}
                    >
                      {pct !== null ? `${pct}%` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
