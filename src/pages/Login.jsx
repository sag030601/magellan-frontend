import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/Magellan_Logo-removebg-preview.png";

const API = import.meta.env.VITE_API_URL || "";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showResetFlow, setShowResetFlow] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetForgotState = () => {
    setShowResetFlow(false);
    setCodeSent(false);
    setOtpVerified(false);
    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    setError("");
    setSuccess("");
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email or username first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send code");
      setShowResetFlow(true);
      setCodeSent(true);
      setOtpVerified(false);
      setResetToken("");
      setSuccess(data.message || "Verification code sent. Check your email.");
    } catch (err) {
      setError(err.message || "Could not send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmed = email.trim();
    const code = otp.replace(/\s/g, "");
    if (!trimmed || !code) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setResetToken(data.resetToken);
      setOtpVerified(true);
      setSuccess("Code confirmed. Set your new password below.");
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update password");
      resetForgotState();
      setPassword("");
      setSuccess(data.message || "Password updated. Sign in with your new password.");
    } catch (err) {
      setError(err.message || "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, var(--marine-900) 0%, var(--marine-700) 50%, var(--marine-500) 100%)" }}
    >
      <div className="w-full max-w-md">
        <div
          className="rounded-2xl p-8"
          style={{ background: "var(--bg-card)", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}
        >
          <div className="text-center mb-8">
            <img
              src={logo}
              alt="Magellan Crewing Management"
              className="max-w-[220px] w-full h-auto mx-auto mb-4 object-contain"
            />
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Welcome Back
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
              Magellan Crewing Management
            </p>
          </div>

          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--danger)" }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{
                background: "rgba(22,163,74,0.08)",
                border: "1px solid rgba(22,163,74,0.25)",
                color: "rgb(22, 163, 74)",
              }}
            >
              {success}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!showResetFlow && !otpVerified) handleSubmit(e);
            }}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Email or username
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                style={{ padding: "0.625rem 1rem" }}
                autoComplete="username"
              />
            </div>

            {!otpVerified && !showResetFlow && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Password
                </label>
                <input
                  type="password"
                  required={!showResetFlow}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  className="form-control"
                  style={{ padding: "0.625rem 1rem" }}
                  autoComplete="current-password"
                />
              </div>
            )}

            {!showResetFlow && (
              <>
                <div className="text-right -mt-2">
                  <button
                    type="button"
                    className="text-sm font-medium"
                    style={{ color: "var(--marine-500)", background: "none", border: "none", cursor: "pointer" }}
                    disabled={loading}
                    onClick={handleSendCode}
                  >
                    Forgot password?
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition"
                  style={{
                    background: `linear-gradient(135deg, var(--marine-600), var(--marine-800))`,
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? "wait" : "pointer",
                    border: "none",
                  }}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </>
            )}
          </form>

          {showResetFlow && !otpVerified && (
            <div className="mt-6 pt-6 border-t space-y-4" style={{ borderColor: "var(--border-subtle, rgba(0,0,0,0.08))" }}>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {codeSent
                  ? "Enter the 6-digit verification code sent to your email."
                  : "Request a verification code to reset your password."}
              </p>
              {!codeSent && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSendCode}
                  className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition"
                  style={{
                    background: `linear-gradient(135deg, var(--marine-600), var(--marine-800))`,
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? "wait" : "pointer",
                    border: "none",
                  }}
                >
                  {loading ? "Sending..." : "Send verification code"}
                </button>
              )}
              {codeSent && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      Verification code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="form-control text-center tracking-[0.4em] text-lg font-mono"
                      style={{ padding: "0.625rem 1rem" }}
                      autoComplete="one-time-code"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition"
                    style={{
                      background: `linear-gradient(135deg, var(--marine-600), var(--marine-800))`,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? "wait" : "pointer",
                      border: "none",
                    }}
                  >
                    {loading ? "Checking..." : "Verify code"}
                  </button>
                  <button
                    type="button"
                    className="w-full py-2 text-sm"
                    style={{ color: "var(--marine-500)", background: "none", border: "none", cursor: "pointer" }}
                    disabled={loading}
                    onClick={handleSendCode}
                  >
                    Resend code
                  </button>
                </form>
              )}
              <button
                type="button"
                className="w-full py-2 text-sm"
                style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => {
                  setError("");
                  setSuccess("");
                  resetForgotState();
                }}
              >
                Back to sign in
              </button>
            </div>
          )}

          {otpVerified && (
            <form onSubmit={handleCompleteReset} className="mt-6 pt-6 border-t space-y-4" style={{ borderColor: "var(--border-subtle, rgba(0,0,0,0.08))" }}>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Choose a new password (at least 6 characters).
              </p>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  New password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-control"
                  style={{ padding: "0.625rem 1rem" }}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-control"
                  style={{ padding: "0.625rem 1rem" }}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition"
                style={{
                  background: `linear-gradient(135deg, var(--marine-600), var(--marine-800))`,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? "wait" : "pointer",
                  border: "none",
                }}
              >
                {loading ? "Updating..." : "Update password"}
              </button>
              <button
                type="button"
                className="w-full py-2 text-sm"
                style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => {
                  setError("");
                  setSuccess("");
                  resetForgotState();
                }}
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
