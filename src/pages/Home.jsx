import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import Navbar from "../components/Navbar.jsx";
import AnnouncementBar from "../components/AnnouncementBar.jsx";
import AskAIWidget from "../components/AskAIWidget.jsx";
import ShareWidget from "../components/ShareWidget.jsx";

const SUBJECTS = [
  {
    code: "OS",
    name: "Operating Systems",
    lecturer: "AS",
    color: "#845EF7",
    icon: "💻",
    desc: "Process synchronization, CPU scheduling, virtual memory, paging, and deadlocks.",
    unitsUrl: "/os/index.html",
    units: [
      { num: "1", title: "Introduction & OS Structures", url: "/os/unit1.html" },
      { num: "2", title: "Processes & CPU Scheduling", url: "/os/unit2.html" },
      { num: "3", title: "Process Synchronization & Semaphores", url: "/os/unit3.html" },
      { num: "4", title: "Deadlocks & Prevention", url: "/os/unit4.html" },
      { num: "5", title: "Memory Management & Paging", url: "/os/unit5.html" },
      { num: "6", title: "Virtual Memory & File Systems", url: "/os/unit6.html" },
    ],
  },
  {
    code: "HCI",
    name: "Human Computer Interaction",
    lecturer: "PT",
    color: "#6D5EF5",
    icon: "🎨",
    desc: "Interaction models, usability engineering, heuristic evaluation, and GOMS.",
    unitsUrl: "/hci/index.html",
    units: [
      { num: "1", title: "Foundations & Human Capabilities", url: "/hci/unit1.html" },
      { num: "2", title: "Interaction Design & Paradigms", url: "/hci/unit2.html" },
      { num: "3", title: "HCI in the Software Process", url: "/hci/unit3.html" },
      { num: "4", title: "Design Rules & Usability Guidelines", url: "/hci/unit4.html" },
      { num: "5", title: "Evaluation Techniques & Heuristics", url: "/hci/unit5.html" },
      { num: "6", title: "Universal Design & Accessibility", url: "/hci/unit6.html" },
      { num: "7", title: "User Support & Help Systems", url: "/hci/unit7.html" },
    ],
  },
  {
    code: "CD",
    name: "Compiler Design",
    lecturer: "YP",
    color: "#FCC419",
    icon: "⚙️",
    desc: "Lexical analyzers, LL/LR parsing tables, syntax-directed translation, and code generation.",
    unitsUrl: "/cd/index.html",
    units: [
      { num: "1", title: "Introduction to Compilers & Lexical Analysis", url: "/cd/unit1.html" },
      { num: "2", title: "Syntax Analysis & Top-Down Parsers", url: "/cd/unit2.html" },
      { num: "3", title: "Bottom-Up Parsing & LR Parsers", url: "/cd/unit3.html" },
      { num: "4", title: "Syntax Directed Translation (SDT)", url: "/cd/unit4.html" },
      { num: "5", title: "Intermediate Code Generation (TAC)", url: "/cd/unit5.html" },
      { num: "6", title: "Code Optimization & Code Generation", url: "/cd/unit6.html" },
    ],
  },
  {
    code: "CGM",
    name: "Computer Graphics & Multimedia",
    lecturer: "CU",
    color: "#22B8CF",
    icon: "📐",
    desc: "Raster algorithms, 2D/3D geometric transformations, clipping, and rendering pipelines.",
    unitsUrl: "/cg/index.html",
    units: [
      { num: "1", title: "Graphics Hardware & Display Systems", url: "/cg/unit1.html" },
      { num: "2", title: "Line & Circle Drawing Algorithms", url: "/cg/unit2.html" },
      { num: "3", title: "2D Geometric Transformations", url: "/cg/unit3.html" },
      { num: "4", title: "2D Viewing & Cohen-Sutherland Clipping", url: "/cg/unit4.html" },
      { num: "5", title: "3D Transformations & Projections", url: "/cg/unit5.html" },
      { num: "6", title: "Visible Surface Detection (Z-Buffer)", url: "/cg/unit6.html" },
      { num: "7", title: "Color Models & Multimedia Systems", url: "/cg/unit7.html" },
    ],
  },
  {
    code: "AOA",
    name: "Analysis of Algorithms",
    lecturer: "MS",
    color: "#51CF66",
    icon: "⚡",
    desc: "Asymptotic notation, Divide & Conquer, Dynamic Programming, Greedy, and NP-completeness.",
    unitsUrl: "/aoa/index.html",
    units: [
      { num: "1", title: "Algorithm Analysis & Recurrences", url: "/aoa/unit1.html" },
      { num: "2", title: "Divide & Conquer Algorithms", url: "/aoa/unit2.html" },
      { num: "3", title: "Greedy Technique & Minimum Spanning Trees", url: "/aoa/unit3.html" },
      { num: "4", title: "Dynamic Programming (Knapsack, LCS)", url: "/aoa/unit4.html" },
      { num: "5", title: "Backtracking & Branch and Bound", url: "/aoa/unit5.html" },
      { num: "6", title: "Graph Algorithms & NP-Completeness", url: "/aoa/unit6.html" },
    ],
  },
  {
    code: "ITC",
    name: "Information Theory & Coding",
    lecturer: "DR. YZU",
    color: "#FF8787",
    icon: "📡",
    desc: "Entropy, Huffman coding, channel capacity theorem, linear block codes, and cyclic codes.",
    unitsUrl: "/itc/index.html",
    units: [
      { num: "1", title: "Information Measure & Shannon Entropy", url: "/itc/unit1.html" },
      { num: "2", title: "Source Coding & Huffman Algorithms", url: "/itc/unit2.html" },
      { num: "3", title: "Discrete Memoryless Channels & Capacity", url: "/itc/unit3.html" },
      { num: "4", title: "Continuous Channels & Shannon-Hartley", url: "/itc/unit4.html" },
      { num: "5", title: "Linear Block Codes & Syndrome Decoding", url: "/itc/unit5.html" },
      { num: "6", title: "Cyclic Codes & Convolutional Encoders", url: "/itc/unit6.html" },
    ],
  },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Email Subscription State
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeResult, setSubscribeResult] = useState(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  // Community Contribution Modal State
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contribTitle, setContribTitle] = useState("");
  const [contribSubjectId, setContribSubjectId] = useState("");
  const [contribSection, setContribSection] = useState("Unit 1");
  const [contribContentType, setContribContentType] = useState("pdf");
  const [contribFile, setContribFile] = useState(null);
  const [contribTextContent, setContribTextContent] = useState("");
  const [contribUploaderName, setContribUploaderName] = useState("");
  const [contribLoading, setContribLoading] = useState(false);
  const [contribMessage, setContribMessage] = useState(null);
  const [subjectsList, setSubjectsList] = useState([]);

  useEffect(() => {
    api.get("/materials/subjects")
      .then((r) => setSubjectsList(r.data))
      .catch((err) => console.error("Subjects fetch error:", err));
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subscribeEmail.trim()) return;
    setSubscribeLoading(true);
    setSubscribeResult(null);
    try {
      const { data } = await api.post("/auth/subscribe", { email: subscribeEmail.trim() });
      setSubscribeResult({ ok: true, text: data.message || "🎉 Subscribed successfully! You will receive study updates directly in your inbox." });
      setSubscribeEmail("");
    } catch (err) {
      setSubscribeResult({
        ok: false,
        text: err.response?.data?.error || "Failed to subscribe. Please try again.",
      });
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleContribSubmit = async (e) => {
    e.preventDefault();
    if (!contribTitle.trim()) return setContribMessage({ type: "error", text: "Title is required" });
    if (!contribSubjectId) return setContribMessage({ type: "error", text: "Please select a subject" });

    if (["pdf", "image"].includes(contribContentType) && !contribFile) {
      return setContribMessage({ type: "error", text: "Please select a file to upload" });
    }
    if (["text", "html"].includes(contribContentType) && !contribTextContent.trim()) {
      return setContribMessage({ type: "error", text: "Content text is required" });
    }

    setContribLoading(true);
    setContribMessage(null);

    try {
      const formData = new FormData();
      formData.append("title", contribTitle.trim());
      formData.append("subject_id", contribSubjectId);
      formData.append("section", contribSection);
      formData.append("content_type", contribContentType);
      formData.append("uploader_name", contribUploaderName.trim() || "Anonymous Contributor");

      if (["pdf", "image"].includes(contribContentType)) {
        formData.append("file", contribFile);
      } else {
        formData.append("text_content", contribTextContent);
      }

      const { data } = await api.post("/materials/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setContribMessage({
        type: "success",
        text: data.message || "Study material submitted! An administrator will review and publish it.",
      });
      setContribTitle("");
      setContribFile(null);
      setContribTextContent("");
    } catch (err) {
      setContribMessage({
        type: "error",
        text: err.response?.data?.error || "Failed to submit study material. Please try again.",
      });
    } finally {
      setContribLoading(false);
    }
  };

  const filteredSubjects = SUBJECTS.filter((s) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      s.name.toLowerCase().includes(query) ||
      s.code.toLowerCase().includes(query) ||
      s.desc.toLowerCase().includes(query) ||
      s.units.some((u) => u.title.toLowerCase().includes(query));
    if (activeFilter === "all") return matchesQuery;
    return matchesQuery && s.code.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-primary selection:text-white">
      {/* Top Scrolling Announcement Ticker */}
      <AnnouncementBar />

      {/* Navigation Header */}
      <Navbar
        onOpenSubscribe={() => setShowSubscribeModal(true)}
        onOpenContribute={() => setShowContributeModal(true)}
      />

      {/* HERO SECTION */}
      <header className="relative pt-12 pb-16 px-4 overflow-hidden border-b border-slate-800/80">
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute top-60 -left-40 w-96 h-96 rounded-full bg-indigo-600/15 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold tracking-wide uppercase">
            <span>🚀</span>
            <span>Open Engineering Study Resource Hub</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Master Engineering with{" "}
            <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Smart Notes &amp; Visual Maps
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Curated unit-by-unit syllabus notes, mnemonic memory tricks, exam cheat sheets, and essential study tools. 100% free and open for every learner.
          </p>

          {/* Quick Search Box */}
          <div className="max-w-xl mx-auto pt-2">
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-400 text-base">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g. Virtual Memory, LR Parsing, Entropy, Dijkstra)..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xl backdrop-blur-xl transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 text-xs text-slate-400 hover:text-white px-1.5 py-0.5"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#subjects"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 text-white text-xs sm:text-sm font-bold shadow-lg shadow-primary/25 transition-all hover:scale-105"
            >
              📚 Browse All Subjects
            </a>
            <Link
              to="/tools"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white text-xs sm:text-sm font-bold transition-all hover:scale-105"
            >
              ⚡ Study Tools Hub
            </Link>
            <button
              onClick={() => setShowSubscribeModal(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-bold transition-all"
            >
              📧 Get Email Updates
            </button>
          </div>
        </div>
      </header>

      {/* FEATURED EMAIL NOTIFICATION CARD */}
      <section className="max-w-5xl mx-auto px-4 -mt-6 relative z-20">
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
                <span>📬</span>
                <span>Email Newsletter &amp; Notifications</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Never Miss a Unit Cheat Sheet or Exam Update
              </h3>
              <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                Subscribe with your email to receive direct notifications when new theory notes, lab manuals, and one-shot videos are uploaded.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="w-full md:w-auto shrink-0 flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="email"
                required
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                placeholder="Enter your student email..."
                className="w-full sm:w-72 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                disabled={subscribeLoading}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary/25 disabled:opacity-50 transition-all shrink-0"
              >
                {subscribeLoading ? "Subscribing..." : "Subscribe Free"}
              </button>
            </form>
          </div>

          {subscribeResult && (
            <div
              className={`mt-4 p-3 rounded-xl text-xs font-semibold ${
                subscribeResult.ok
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {subscribeResult.text}
            </div>
          )}
        </div>
      </section>

      {/* MAIN SUBJECT MODULES SECTION */}
      <section id="subjects" className="max-w-6xl mx-auto px-4 py-16 space-y-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
              Curated Courseware
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Subject Modules &amp; Study Notes
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Click any subject to access full unit notes, visual architecture maps, and quick memory tricks.
            </p>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFilter === "all"
                  ? "bg-primary text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              All Subjects
            </button>
            {SUBJECTS.map((s) => (
              <button
                key={s.code}
                onClick={() => setActiveFilter(s.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeFilter === s.code
                    ? "bg-primary text-white"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {s.code}
              </button>
            ))}
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((s) => (
            <div
              key={s.code}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 p-6 flex flex-col justify-between transition-all hover:shadow-2xl hover:shadow-primary/5 group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: s.color + "18", color: s.color }}
                    >
                      {s.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">{s.code}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                          Faculty: {s.lecturer}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">
                        {s.name}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>

                {/* Unit Pills */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Units &amp; Chapters:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.units.map((u) => (
                      <a
                        key={u.num}
                        href={u.url}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-primary hover:text-white border border-slate-700/60 text-[11px] font-semibold text-slate-300 transition-colors"
                        title={u.title}
                      >
                        Unit {u.num}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-800/80 flex items-center justify-between">
                <a
                  href={s.unitsUrl}
                  className="text-xs font-bold text-primary hover:text-indigo-400 flex items-center gap-1 transition-colors"
                >
                  <span>Open {s.code} Hub</span>
                  <span>&rarr;</span>
                </a>
                <span className="text-[11px] text-slate-500 font-mono">
                  {s.units.length} Units Available
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TOOLS & UTILITIES HUB SPOTLIGHT */}
      <section className="border-t border-slate-800 bg-slate-900/30 py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              Student Toolkit
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Built-in Productivity Tools
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Handy tools crafted to make studying, code-sharing, and team decisions effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Tool 1: QuickPaste */}
            <Link
              to="/paste"
              className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-indigo-500/50 transition-all hover:scale-105 group text-decoration-none"
            >
              <div className="text-3xl mb-3">📋</div>
              <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">
                QuickPaste
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Instant anonymous code and text sharing with customizable custom URLs and expiration timers.
              </p>
              <div className="mt-4 text-xs font-bold text-primary flex items-center gap-1">
                <span>Create Paste</span>
                <span>&rarr;</span>
              </div>
            </Link>

            {/* Tool 2: Spin Wheel */}
            <Link
              to="/wheel"
              className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-emerald-500/50 transition-all hover:scale-105 group text-decoration-none"
            >
              <div className="text-3xl mb-3">🎡</div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                Spin Wheel Picker
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Interactive random wheel selector with physics, audio ticks, and shareable wheel links.
              </p>
              <div className="mt-4 text-xs font-bold text-emerald-400 flex items-center gap-1">
                <span>Launch Wheel</span>
                <span>&rarr;</span>
              </div>
            </Link>

            {/* Tool 3: Community Vault */}
            <div
              onClick={() => setShowContributeModal(true)}
              className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-cyan-500/50 transition-all hover:scale-105 group cursor-pointer"
            >
              <div className="text-3xl mb-3">📤</div>
              <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                Share Notes &amp; PDFs
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Contribute your own unit notes, lab codes, or handwritten cheat sheets to help other students.
              </p>
              <div className="mt-4 text-xs font-bold text-cyan-400 flex items-center gap-1">
                <span>Upload Material</span>
                <span>&rarr;</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SUBSCRIBE MODAL */}
      {showSubscribeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📬</span>
                <span>Subscribe to Study Notifications</span>
              </h3>
              <button
                onClick={() => setShowSubscribeModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your email address to receive immediate updates when new unit cheat sheets, notes, and platform features are released.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-3">
              <input
                type="email"
                required
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                placeholder="you@student.domain.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={subscribeLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white font-bold text-xs shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {subscribeLoading ? "Subscribing..." : "Confirm Subscription"}
              </button>
            </form>

            {subscribeResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  subscribeResult.ok
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {subscribeResult.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMMUNITY CONTRIBUTION MODAL */}
      {showContributeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📤</span>
                <span>Share Study Material with Peers</span>
              </h3>
              <button
                onClick={() => setShowContributeModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Submit your notes, cheat sheets, or lab solutions. Submissions will be verified by an administrator before appearing publicly.
            </p>

            {contribMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  contribMessage.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {contribMessage.text}
              </div>
            )}

            <form onSubmit={handleContribSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Material Title *
                </label>
                <input
                  type="text"
                  required
                  value={contribTitle}
                  onChange={(e) => setContribTitle(e.target.value)}
                  placeholder="e.g. Unit 3 Quick Cheat Sheet & Formulas"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Subject *
                  </label>
                  <select
                    required
                    value={contribSubjectId}
                    onChange={(e) => setContribSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Subject...</option>
                    {subjectsList.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Section / Unit *
                  </label>
                  <input
                    type="text"
                    required
                    value={contribSection}
                    onChange={(e) => setContribSection(e.target.value)}
                    placeholder="e.g. Unit 2 or Lab Code"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Format *
                  </label>
                  <select
                    value={contribContentType}
                    onChange={(e) => setContribContentType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="pdf">PDF Document (Max 100MB)</option>
                    <option value="image">Image (JPEG/PNG)</option>
                    <option value="text">Text / Markdown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={contribUploaderName}
                    onChange={(e) => setContribUploaderName(e.target.value)}
                    placeholder="e.g. Yash or Anonymous"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {["pdf", "image"].includes(contribContentType) ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Upload File *
                  </label>
                  <input
                    type="file"
                    required
                    accept={contribContentType === "pdf" ? ".pdf" : "image/*"}
                    onChange={(e) => setContribFile(e.target.files[0])}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Content Text *
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={contribTextContent}
                    onChange={(e) => setContribTextContent(e.target.value)}
                    placeholder="Type or paste your notes here..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={contribLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white font-bold text-xs shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {contribLoading ? "Submitting..." : "Submit for Verification"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating AI Platform Assistant Widget */}
      <AskAIWidget />

      {/* Floating Share / QR Widget */}
      <ShareWidget />

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10 px-4 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <img src="/logo.png?v=3" alt="Logo" className="w-5 h-5 object-contain" />
            <span className="font-bold text-white">Smart Learning+</span>
            <span>· Open Engineering Study Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link to="/tools" className="hover:text-white transition-colors">
              Tools Hub
            </Link>
            <Link to="/paste" className="hover:text-white transition-colors">
              QuickPaste
            </Link>
            <Link to="/disclaimer" className="hover:text-white transition-colors">
              Disclaimer
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
