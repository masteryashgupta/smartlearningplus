import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, setSession } from "../api.js";

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState(null); // {ok, text}

  // Student specific inputs
  const [studentAction, setStudentAction] = useState("login"); // login | register
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentBatch, setStudentBatch] = useState("G1");

  useEffect(() => {
    const token = params.get("token");
    if (token) exchangeToken(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exchangeToken(token) {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/student/exchange", { token });
      setSession(data.token, "student", data.user.name);
      navigate("/dashboard");
    } catch (e) {
      setError(e.response?.data?.error || "Link expired. Get a new one via /dashboard in Telegram.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStudentLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/student/login", { email: studentEmail, password: studentPassword });
      setSession(data.token, "student", data.user.name);
      navigate("/dashboard");
    } catch (e) {
      setError(e.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleStudentRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/student/register", {
        name: studentName,
        email: studentEmail,
        password: studentPassword,
        batch: studentBatch,
      });
      setSession(data.token, "student", data.user.name);
      navigate("/dashboard");
    } catch (e) {
      setError(e.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin/login", { email, password });
      setSession(data.token, "admin", data.name);
      navigate("/admin");
    } catch (e) {
      setError(e.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setForgotMsg(null);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail, role: mode });
      setForgotMsg({ ok: true, text: "✓ If that email is registered, a reset link has been sent. Check your inbox (and spam folder)!" });
    } catch (err) {
      setForgotMsg({ ok: false, text: err.response?.data?.error || "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-2xl font-bold text-ink">Attendance</div>
          <div className="text-muted text-sm font-mono">Track With Silence</div>
        </div>

        <div className="card p-6 bg-white border border-line rounded-xl shadow-soft">
        <div className="flex gap-2 mb-6 bg-paper rounded-xl p-1 border border-line/40">
            <button
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === "student" ? "bg-white shadow-soft text-primary" : "text-muted hover:text-ink"}`}
              onClick={() => { setMode("student"); setError(""); setForgotMode(false); setForgotMsg(null); }}
            >
              Student
            </button>
            <button
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === "admin" ? "bg-white shadow-soft text-primary" : "text-muted hover:text-ink"}`}
              onClick={() => { setMode("admin"); setError(""); setForgotMode(false); setForgotMsg(null); }}
            >
              Admin
            </button>
          </div>

          {mode === "student" ? (
            <div>
              {forgotMode ? (
                /* ── FORGOT PASSWORD FORM ── */
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <div className="text-sm font-semibold text-ink mb-1">Reset your password</div>
                  <p className="text-xs text-muted mb-3">Enter your registered email and we'll send you a reset link valid for 1 hour.</p>
                  <input
                    className="input"
                    type="email"
                    placeholder="Your email address"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  {forgotMsg && (
                    <div className={`text-xs rounded-xl px-3 py-2.5 font-medium ${
                      forgotMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
                    }`}>{forgotMsg.text}</div>
                  )}
                  <button className="btn-primary w-full" disabled={loading}>
                    {loading ? "Sending…" : "Send Reset Link"}
                  </button>
                  <div className="text-center">
                    <button type="button" className="text-xs text-primary hover:underline"
                      onClick={() => { setForgotMode(false); setForgotMsg(null); setForgotEmail(""); }}>
                      ← Back to sign in
                    </button>
                  </div>
                </form>
              ) : studentAction === "login" ? (
                <form onSubmit={handleStudentLogin} className="space-y-3">
                  <input
                    className="input"
                    type="email"
                    placeholder="Student email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    required
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="Password"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    required
                  />
                  {error && <p className="text-bad text-sm">{error}</p>}
                  <button className="btn-primary w-full" disabled={loading}>
                    {loading ? "Signing in…" : "Sign in"}
                  </button>

                  <div className="flex items-center justify-between mt-1">
                    <button type="button" className="text-xs text-primary hover:underline"
                      onClick={() => { setStudentAction("register"); setError(""); }}>
                      Don't have an account? Sign up
                    </button>
                    <button type="button" className="text-xs text-muted hover:text-primary hover:underline"
                      onClick={() => { setForgotMode(true); setForgotMsg(null); setForgotEmail(studentEmail); }}>
                      Forgot password?
                    </button>
                  </div>

                  <div className="border-t border-line/60 mt-4 pt-4 text-center">
                    <p className="text-xs text-muted leading-relaxed">
                      Or log in instantly via Telegram:<br />
                      Open Telegram, send <span className="font-mono text-ink">/dashboard</span> to the bot,
                      and tap the link.
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleStudentRegister} className="space-y-3">
                  <input className="input" type="text" placeholder="Full name" value={studentName}
                    onChange={(e) => setStudentName(e.target.value)} required />
                  <input className="input" type="email" placeholder="Email address" value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)} required />
                  <input className="input" type="password" placeholder="Password (min. 8 chars)" value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)} required />

                  <div className="flex gap-2 items-center bg-paper p-1 rounded-xl border border-line">
                    <span className="text-xs text-muted pl-2 pr-1 font-medium">Batch:</span>
                    <button type="button"
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors ${studentBatch === "G1" ? "bg-white shadow-soft text-primary" : "text-muted"}`}
                      onClick={() => setStudentBatch("G1")}>G1 (Lab)</button>
                    <button type="button"
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors ${studentBatch === "G2" ? "bg-white shadow-soft text-primary" : "text-muted"}`}
                      onClick={() => setStudentBatch("G2")}>G2 (Lab)</button>
                  </div>

                  {error && <p className="text-bad text-sm">{error}</p>}
                  <button className="btn-primary w-full" disabled={loading}>
                    {loading ? "Creating account…" : "Sign up"}
                  </button>

                  <div className="text-center mt-3">
                    <button type="button" className="text-xs text-primary hover:underline"
                      onClick={() => { setStudentAction("login"); setError(""); }}>
                      Already have an account? Sign in
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : forgotMode ? (
            /* ── ADMIN FORGOT PASSWORD ── */
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="text-sm font-semibold text-ink mb-1">Reset admin password</div>
              <p className="text-xs text-muted mb-3">Enter your admin email. A reset link will be sent if the address is registered.</p>
              <input className="input" type="email" placeholder="Admin email" value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)} required autoFocus />
              {forgotMsg && (
                <div className={`text-xs rounded-xl px-3 py-2.5 font-medium ${
                  forgotMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
                }`}>{forgotMsg.text}</div>
              )}
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
              <div className="text-center">
                <button type="button" className="text-xs text-primary hover:underline"
                  onClick={() => { setForgotMode(false); setForgotMsg(null); setForgotEmail(""); }}>
                  ← Back to sign in
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <input className="input" type="email" placeholder="Admin email" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
              <input className="input" type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
              {error && <p className="text-bad text-sm">{error}</p>}
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
              <div className="text-right mt-1">
                <button type="button" className="text-xs text-muted hover:text-primary hover:underline"
                  onClick={() => { setForgotMode(true); setForgotMsg(null); setForgotEmail(email); }}>
                  Forgot password?
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
