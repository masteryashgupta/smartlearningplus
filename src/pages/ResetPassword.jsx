import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || new URLSearchParams(window.location.hash.split("?")[1] || "").get("token");
  const role  = params.get("role") || new URLSearchParams(window.location.hash.split("?")[1] || "").get("role") || "student";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [done, setDone] = useState(false);

  // Validate token exists
  useEffect(() => {
    if (!token) setMsg({ ok: false, text: "Invalid reset link. Please request a new one." });
  }, [token]);

  async function handleReset(e) {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirm) {
      setMsg({ ok: false, text: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setMsg({ ok: false, text: "Password must be at least 8 characters." });
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword, role });
      setDone(true);
      setMsg({ ok: true, text: "✓ Password reset successfully! Redirecting to login…" });
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || "Reset failed. The link may have expired." });
    } finally {
      setLoading(false);
    }
  }

  const strength = newPassword.length === 0 ? 0
    : newPassword.length < 8 ? 1
    : newPassword.length < 12 ? 2
    : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 4
    : 3;
  const strengthLabels = ["", "Too short", "Weak", "Good", "Strong"];
  const strengthColors = ["", "#E11D48", "#F59E0B", "#16A34A", "#0891B2"];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="font-display text-2xl font-bold text-ink">Attendance OS</div>
          <div className="text-muted text-sm font-mono mt-1">Password Reset</div>
        </div>

        <div className="card p-6 bg-white border border-line rounded-xl shadow-soft">
          {done ? (
            <div className="text-center py-4 space-y-3">
              <div className="text-4xl">✅</div>
              <div className="font-semibold text-ink">Password Updated!</div>
              <div className="text-sm text-muted">Redirecting you to the login page…</div>
            </div>
          ) : (
            <>
              <div className="font-display font-bold text-lg text-ink mb-1">Set New Password</div>
              <p className="text-xs text-muted mb-5">
                Choose a strong new password for your{" "}
                <span className="font-semibold text-ink capitalize">{role}</span> account.
              </p>

              <form onSubmit={handleReset} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">New password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="input"
                      style={{ paddingRight: "2.75rem" }}
                      type={showPw ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoFocus
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--muted)", lineHeight: 1 }}
                      tabIndex={-1}
                    >
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {newPassword.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((lvl) => (
                          <div key={lvl} className="h-1 flex-1 rounded-full transition-all"
                            style={{ background: lvl <= strength ? strengthColors[strength] : "#E5E2DB" }} />
                        ))}
                      </div>
                      <div className="text-[10px] font-semibold mt-1" style={{ color: strengthColors[strength] }}>
                        {strengthLabels[strength]}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Confirm password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Repeat new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  {confirm && newPassword !== confirm && (
                    <div className="text-[11px] text-red-500 font-medium mt-1">Passwords don't match</div>
                  )}
                  {confirm && newPassword === confirm && confirm.length >= 8 && (
                    <div className="text-[11px] text-green-600 font-medium mt-1">✓ Passwords match</div>
                  )}
                </div>

                {/* Message */}
                {msg && (
                  <div className={`text-xs rounded-xl px-3 py-2.5 font-medium border ${
                    msg.ok
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-600 border-red-200"
                  }`}>
                    {msg.text}
                  </div>
                )}

                <button
                  className="btn-primary w-full"
                  type="submit"
                  disabled={loading || !token}
                  style={{ opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? "Resetting…" : "Reset Password"}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-primary hover:underline"
                    onClick={() => navigate("/login")}
                  >
                    ← Back to sign in
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
