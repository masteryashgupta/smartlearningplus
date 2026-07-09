import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null); // { ok: bool, text: string }

  useEffect(() => {
    if (!token) {
      setMsg({ ok: false, text: "Invalid verification link. Please check your email." });
      setLoading(false);
      return;
    }

    api.get(`/auth/verify-email?token=${token}`)
      .then((res) => {
        setMsg({ ok: true, text: res.data.message || "✓ Email verified successfully! Redirecting to login page…" });
        setTimeout(() => navigate("/login"), 3000);
      })
      .catch((err) => {
        setMsg({ ok: false, text: err.response?.data?.error || "Verification failed. The link may have expired or is invalid." });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-2xl font-bold text-ink">Smart Learning+</div>
          <div className="text-muted text-sm font-mono mt-1">Email Verification</div>
        </div>

        <div className="card p-6 bg-white border border-line rounded-xl shadow-soft text-center">
          {loading ? (
            <div className="py-6 space-y-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-sm text-muted font-medium">Verifying your email address…</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-4xl">{msg?.ok ? "✅" : "❌"}</div>
              <div className="font-display font-bold text-lg text-ink">
                {msg?.ok ? "Account Verified!" : "Verification Error"}
              </div>
              <p className={`text-sm font-medium ${msg?.ok ? "text-green-600" : "text-red-500"}`}>
                {msg?.text}
              </p>
              {!msg?.ok && (
                <button
                  onClick={() => navigate("/login")}
                  className="btn-secondary w-full text-xs font-semibold py-2"
                >
                  ← Go to login page
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
