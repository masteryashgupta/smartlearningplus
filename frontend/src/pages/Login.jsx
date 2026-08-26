import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { session, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [session, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin/login", {
        email: email.trim(),
        password,
      });
      // Instantly update reactive auth context state & navigate to admin
      login(data.token, "admin", data.name);
      navigate("/admin", { replace: true });
    } catch (err) {
      console.error("Admin login error:", err);
      const msg =
        err.response?.data?.error ||
        (err.code === "ERR_NETWORK"
          ? "Network error: Unable to connect to backend server."
          : "Invalid credentials. Please verify your admin email and password.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--color-bg, #0B0F19)", color: "var(--color-ink, #F8FAFC)" }}>
      <div className="w-full max-w-md">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group text-decoration-none">
            <img
              src="/logo.png?v=4"
              alt="Logo"
              className="w-10 h-10 rounded-full object-cover shadow-lg shadow-primary/10 group-hover:scale-105 transition-transform shrink-0"
            />
            <span className="font-display font-extrabold text-xl tracking-tight text-white">
              Smart Learning<span className="text-primary font-bold text-xs ml-1 px-1.5 py-0.5 bg-primary/20 rounded-md border border-primary/30">+</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Admin Control Center</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to manage Emailer, subscribers, and platform updates</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/50">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@smartlearningplus.me"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Access Admin Panel &rarr;</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <Link
              to="/"
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
            >
              <span>&larr;</span>
              <span>Back to Smart Learning+ Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
