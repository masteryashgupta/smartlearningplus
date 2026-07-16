import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, setSession, getSession } from "../api.js";
import { toggleTheme, getTheme } from "../theme.js";

export default function Login({ compact = false, adminOnly = false }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState(adminOnly ? "admin" : "student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState(null); // {ok, text}
  const [dark, setDark] = useState(getTheme() === "dark");

  function handleThemeToggle() {
    const newIsDark = toggleTheme();
    setDark(newIsDark);
  }
  const [resendVerifyMode, setResendVerifyMode] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMsg, setResendMsg] = useState(null); // {ok, text}
  const [registerSuccess, setRegisterSuccess] = useState(null); // string message

  // Student specific inputs
  const [studentAction, setStudentAction] = useState("login"); // login | register
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentBatch, setStudentBatch] = useState("G1");

  useEffect(() => {
    const session = getSession();
    if (session) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    setMode(adminOnly ? "admin" : "student");
  }, [adminOnly]);

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
      localStorage.setItem("is_moderator", data.user.is_moderator ? "true" : "false");
      window.location.href = "/index.html#/";
      window.location.reload();
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
      localStorage.setItem("is_moderator", data.user.is_moderator ? "true" : "false");
      window.location.href = "/index.html#/";
      window.location.reload();
    } catch (e) {
      setError(e.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleStudentRegister(e) {
    e.preventDefault();
    setError("");
    setRegisterSuccess(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/student/register", {
        name: studentName,
        email: studentEmail,
        password: studentPassword,
        batch: studentBatch,
      });
      setRegisterSuccess(data.message || "Registration request submitted! Please wait up to 24 hours for admin approval.");
      setStudentAction("login");
      setStudentPassword("");
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
      window.location.href = "/index.html#/";
      window.location.reload();
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

  async function handleResendVerification(e) {
    e.preventDefault();
    setResendMsg(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/resend-verification", { email: resendEmail });
      setResendMsg({ ok: true, text: data.message || "✓ Verification link has been resent! Please check your inbox." });
    } catch (err) {
      setResendMsg({ ok: false, text: err.response?.data?.error || "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const cardContent = (
    <div className="card p-6 bg-white border border-line rounded-xl shadow-soft">
      {!adminOnly && (
        <div className="flex gap-2 mb-6 bg-paper rounded-xl p-1 border border-line/40">
          <button
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${studentAction === "login" ? "bg-white shadow-soft text-primary" : "text-muted hover:text-ink"}`}
            onClick={() => { setStudentAction("login"); setError(""); setForgotMode(false); setForgotMsg(null); setResendVerifyMode(false); setResendMsg(null); setRegisterSuccess(null); }}
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${studentAction === "register" ? "bg-white shadow-soft text-primary" : "text-muted hover:text-ink"}`}
            onClick={() => { setStudentAction("register"); setError(""); setForgotMode(false); setForgotMsg(null); setResendVerifyMode(false); setResendMsg(null); setRegisterSuccess(null); }}
          >
            Register
          </button>
        </div>
      )}

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
          ) : resendVerifyMode ? (
            /* ── RESEND VERIFICATION FORM ── */
            <form onSubmit={handleResendVerification} className="space-y-3">
              <div className="text-sm font-semibold text-ink mb-1">Resend verification link</div>
              <p className="text-xs text-muted mb-3">Enter your registered email address and we'll send you a fresh verification link.</p>
              <input
                className="input"
                type="email"
                placeholder="Your email address"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
                autoFocus
              />
              {resendMsg && (
                <div className={`text-xs rounded-xl px-3 py-2.5 font-medium ${
                  resendMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
                }`}>{resendMsg.text}</div>
              )}
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Sending…" : "Send Verification Link"}
              </button>
              <div className="text-center">
                <button type="button" className="text-xs text-primary hover:underline"
                  onClick={() => { setResendVerifyMode(false); setResendMsg(null); setResendEmail(""); }}>
                  ← Back to sign in
                </button>
              </div>
            </form>
          ) : studentAction === "login" ? (
            <form onSubmit={handleStudentLogin} className="space-y-3">
              <div className="text-[11px] text-[#2563eb] text-center bg-[#eff6ff] py-1.5 px-3 rounded-lg border border-[#dbeafe] mb-3.5 font-semibold">
                ⚠️ Use student email only
              </div>
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
              {registerSuccess && (
                <div className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-xl px-3 py-2.5 font-medium">
                  {registerSuccess}
                </div>
              )}
              {error && (
                <div className="text-bad text-sm space-y-1">
                  <p>{error}</p>
                  {error.includes("verify your email") && (
                    <button
                      type="button"
                      className="text-xs text-primary font-medium hover:underline block"
                      onClick={() => {
                        setResendVerifyMode(true);
                        setResendMsg(null);
                        setResendEmail(studentEmail);
                        setError("");
                      }}
                    >
                      Didn't get the link? Click here to resend
                    </button>
                  )}
                </div>
              )}
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

              <div className="text-center mt-2.5">
                <button type="button" className="text-xs text-muted hover:text-primary hover:underline"
                  onClick={() => { setResendVerifyMode(true); setResendMsg(null); setResendEmail(studentEmail); }}>
                  Resend verification email?
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
              <div className="text-[11px] text-[#2563eb] text-center bg-[#eff6ff] py-1.5 px-3 rounded-lg border border-[#dbeafe] mb-3.5 font-semibold flex flex-col gap-1">
                <span>⚠️ Premium Platform</span>
                <span className="font-normal opacity-90">Access to premium features is manually approved by the admin. Kindly register below and wait for approval. Registration will be approved or rejected within 24 hours.</span>
              </div>
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
                  onClick={() => setStudentBatch("G1")}>Batch 1</button>
                <button type="button"
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors ${studentBatch === "G2" ? "bg-white shadow-soft text-primary" : "text-muted"}`}
                  onClick={() => setStudentBatch("G2")}>Batch 2</button>
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
  );

  return compact ? (
    <div className="w-full">
      {cardContent}
    </div>
  ) : (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={handleThemeToggle}
          className="p-2 rounded-xl bg-surface border border-line text-muted hover:text-ink shadow-soft hover:bg-paper transition-all flex items-center justify-center"
          title={dark ? "Switch to light theme" : "Switch to dark theme"}
          aria-label="Toggle theme"
        >
          {dark ? (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 2.293a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zm2.707 5.707a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-2.293 4a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM11 17a1 1 0 100-2v-1a1 1 0 100 2v1zm-4-2.293a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM3 11a1 1 0 100-2h1a1 1 0 100 2h-1zm2.293-4a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM10 5a5 5 0 100 10 5 5 0 000-10z" clipRule="evenodd"/></svg>
          ) : (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
          )}
        </button>
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo.png?v=3" alt="Logo" className="w-12 h-12 object-contain mb-3" />
          <div className="font-display text-2xl font-bold text-ink tracking-tight">Smart Learning Plus</div>
          <div className="text-muted text-sm font-mono">Study Smarter, Not Harder</div>
        </div>
        {cardContent}
      </div>
    </div>
  );
}
