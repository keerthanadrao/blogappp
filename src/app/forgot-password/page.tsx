"use client";

import { FormEvent, useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "admin" ? "admin" : "reader";

  const [role, setRole] = useState<"reader" | "admin">(initialRole);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP & New Password, 3: Success
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Server-synced Timers & Limits State
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
  const [expiresInSeconds, setExpiresInSeconds] = useState<number>(600);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);
  const [codeInvalidated, setCodeInvalidated] = useState<boolean>(false);
  const [hourlyLimitReached, setHourlyLimitReached] = useState<boolean>(false);

  useEffect(() => {
    if (searchParams.get("role") === "admin") {
      setRole("admin");
    }
  }, [searchParams]);

  // Synchronize state with server on mount or reload if email was previously submitted
  const syncServerStatus = useCallback(async (targetEmail: string) => {
    if (!targetEmail) return;
    try {
      const res = await fetch(
        `/api/auth/forgot-password/status?email=${encodeURIComponent(targetEmail)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.hasActiveCode && data.expiresAt) {
          setExpiresAt(data.expiresAt);
          setExpiresInSeconds(data.expiresInSeconds);
          setCodeInvalidated(data.codeInvalidated || data.isExpired);
          setAttemptsRemaining(data.attemptsRemaining ?? 5);
        }
        if (data.resendAvailableAt) {
          setResendAvailableAt(data.resendAvailableAt);
          setCooldownSeconds(data.cooldownSeconds);
        } else {
          setCooldownSeconds(0);
        }
        setHourlyLimitReached(data.hourlyLimitReached || false);
      }
    } catch (e) {
      console.error("Status sync error:", e);
    }
  }, []);

  // Check query params / session on reload to restore step 2 if active
  useEffect(() => {
    const savedEmail = sessionStorage.getItem("recovery_email");
    const savedExpiresAt = sessionStorage.getItem("recovery_expires_at");
    const savedResendAt = sessionStorage.getItem("recovery_resend_at");

    if (savedEmail) {
      setEmail(savedEmail);
      if (savedExpiresAt) setExpiresAt(savedExpiresAt);
      if (savedResendAt) setResendAvailableAt(savedResendAt);
      setStep(2);
      syncServerStatus(savedEmail);
    }
  }, [syncServerStatus]);

  // Real-time ticking effect based on exact server timestamp comparison
  useEffect(() => {
    if (step !== 2) return;

    const interval = setInterval(() => {
      // 1. Expiration Timer Calculation
      if (expiresAt) {
        const diffMs = new Date(expiresAt).getTime() - Date.now();
        const remSec = Math.max(0, Math.floor(diffMs / 1000));
        setExpiresInSeconds(remSec);
        if (remSec === 0) {
          setCodeInvalidated(true);
        }
      }

      // 2. Cooldown Timer Calculation
      if (resendAvailableAt) {
        const diffCooldownMs = new Date(resendAvailableAt).getTime() - Date.now();
        const remCooldownSec = Math.max(0, Math.ceil(diffCooldownMs / 1000));
        setCooldownSeconds(remCooldownSec);
      } else {
        setCooldownSeconds(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, expiresAt, resendAvailableAt]);

  // Format seconds to MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Handle Step 1: Send OTP
  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address format.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP.");
        if (data.cooldownSeconds) {
          setCooldownSeconds(data.cooldownSeconds);
        }
        if (data.hourlyLimitReached) {
          setHourlyLimitReached(true);
        }
        setLoading(false);
        return;
      }

      setSuccessMessage(data.message || "OTP sent successfully!");
      if (data.expiresAt) {
        setExpiresAt(data.expiresAt);
        setExpiresInSeconds(data.expiresInSeconds || 600);
        sessionStorage.setItem("recovery_expires_at", data.expiresAt);
      }
      if (data.resendAvailableAt) {
        setResendAvailableAt(data.resendAvailableAt);
        setCooldownSeconds(data.cooldownSeconds || 60);
        sessionStorage.setItem("recovery_resend_at", data.resendAvailableAt);
      }
      sessionStorage.setItem("recovery_email", email.trim());
      setCodeInvalidated(false);
      setAttemptsRemaining(5);
      setOtp("");
      setStep(2);
    } catch (err: any) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Resend OTP button click
  async function handleResendOtp() {
    if (isResending || cooldownSeconds > 0 || hourlyLimitReached) return;

    setError("");
    setSuccessMessage("");
    setIsResending(true);

    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend code.");
        if (data.cooldownSeconds) {
          setCooldownSeconds(data.cooldownSeconds);
        }
        if (data.hourlyLimitReached) {
          setHourlyLimitReached(true);
        }
        return;
      }

      setSuccessMessage("New verification code sent to your email!");
      if (data.expiresAt) {
        setExpiresAt(data.expiresAt);
        setExpiresInSeconds(data.expiresInSeconds || 600);
        sessionStorage.setItem("recovery_expires_at", data.expiresAt);
      }
      if (data.resendAvailableAt) {
        setResendAvailableAt(data.resendAvailableAt);
        setCooldownSeconds(data.cooldownSeconds || 60);
        sessionStorage.setItem("recovery_resend_at", data.resendAvailableAt);
      }
      setCodeInvalidated(false);
      setAttemptsRemaining(5);
      setOtp("");
    } catch (err: any) {
      setError("Network error while resending verification code.");
    } finally {
      setIsResending(false);
    }
  }

  // Handle Step 2: Verify OTP & Reset Password
  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (expiresInSeconds === 0) {
      setError("Verification code expired. Please request a new code.");
      return;
    }

    if (codeInvalidated) {
      setError("Maximum attempts exceeded. This verification code has been invalidated. Please request a new code.");
      return;
    }

    if (!otp.trim()) {
      setError("OTP is required.");
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("OTP must be a 6-digit number.");
      return;
    }

    if (!newPassword) {
      setError("New password is required.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
        if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining);
        }
        if (data.codeInvalidated || data.expired) {
          setCodeInvalidated(true);
        }
        setLoading(false);
        return;
      }

      sessionStorage.removeItem("recovery_email");
      sessionStorage.removeItem("recovery_expires_at");
      sessionStorage.removeItem("recovery_resend_at");

      setSuccessMessage(data.message);
      setStep(3);
    } catch (err: any) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = role === "admin";
  const accentColor = isAdmin ? "var(--danger)" : "var(--primary)";
  const isCodeExpired = expiresInSeconds === 0;

  return (
    <div
      className="card"
      style={{
        width: "100%",
        maxWidth: "460px",
        padding: "clamp(var(--space-4), 5vw, var(--space-6))",
        border: isAdmin
          ? "1px solid rgba(239, 68, 68, 0.4)"
          : "1px solid var(--border-color)",
        boxShadow: isAdmin
          ? "0 8px 32px rgba(239, 68, 68, 0.15)"
          : "0 8px 32px rgba(0, 0, 0, 0.5)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "var(--space-5)" }}>
        <Link
          href={isAdmin ? "/login?role=admin" : "/login"}
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            textDecoration: "none",
          }}
        >
          ← Back to Sign In
        </Link>

        <h1
          style={{
            fontSize: "clamp(1.6rem, 4.5vw, 2rem)",
            marginTop: "var(--space-2)",
            background: isAdmin
              ? "linear-gradient(to right, #ef4444, #f97316)"
              : "linear-gradient(to right, var(--primary), #a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.2
          }}
        >
          {isAdmin ? "Admin Password Recovery" : "Reset Your Password"}
        </h1>

        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            marginTop: "var(--space-1)",
          }}
        >
          {step === 1 &&
            "Enter your registered email to receive a 6-digit verification code."}
          {step === 2 && `Enter the OTP sent to ${email} and choose a new password.`}
          {step === 3 && "Password updated successfully!"}
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          id="recovery-error-banner"
          style={{
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid var(--danger)",
            borderRadius: "var(--radius-md)",
            color: "#fca5a5",
            fontSize: "0.9rem",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      {/* Success Notification */}
      {successMessage && step !== 3 && (
        <div
          id="recovery-success-banner"
          style={{
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
            backgroundColor: "rgba(34, 197, 94, 0.15)",
            border: "1px solid #22c55e",
            borderRadius: "var(--radius-md)",
            color: "#86efac",
            fontSize: "0.9rem",
            textAlign: "center",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Step 1: Request OTP Form */}
      {step === 1 && (
        <form
          onSubmit={handleSendOtp}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <div>
            <label
              htmlFor="recovery-email"
              style={{
                display: "block",
                marginBottom: "var(--space-1)",
                fontWeight: 500,
              }}
            >
              Registered Email Address
            </label>
            <input
              id="recovery-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={isAdmin ? "admin@example.com" : "you@example.com"}
            />
          </div>

          <button
            id="send-otp-btn"
            type="submit"
            disabled={loading}
            className={isAdmin ? "btn btn-danger" : "btn btn-primary"}
            style={{
              width: "100%",
              padding: "12px",
              fontWeight: 600,
              fontSize: "1rem",
              marginTop: "var(--space-2)",
            }}
          >
            {loading ? "Sending OTP..." : "Send Verification OTP"}
          </button>
        </form>
      )}

      {/* Step 2: OTP Verification & Countdown UI */}
      {step === 2 && (
        <form
          onSubmit={handleResetPassword}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {/* ⏱️ Server-Synced Validity Countdown Banner */}
          <div
            id="countdown-container"
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              backgroundColor: isCodeExpired || codeInvalidated
                ? "rgba(239, 68, 68, 0.12)"
                : "rgba(99, 102, 241, 0.12)",
              border: isCodeExpired || codeInvalidated
                ? "1px solid rgba(239, 68, 68, 0.3)"
                : "1px solid rgba(99, 102, 241, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.1rem" }}>
                {isCodeExpired || codeInvalidated ? "⚠️" : "⏱️"}
              </span>
              <span
                id="countdown-timer"
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: isCodeExpired || codeInvalidated ? "#f87171" : "#a5b4fc",
                }}
              >
                {isCodeExpired
                  ? "Verification code expired. Please request a new code."
                  : codeInvalidated
                  ? "Code invalidated. Please request a new code."
                  : `Verification code expires in: ${formatTimer(expiresInSeconds)}`}
              </span>
            </div>

            {/* Resend Code Button with 60s Cooldown Countdown */}
            <button
              id="resend-code-btn"
              type="button"
              disabled={isResending || cooldownSeconds > 0 || hourlyLimitReached}
              onClick={handleResendOtp}
              style={{
                background: "none",
                border: "none",
                color:
                  cooldownSeconds > 0 || hourlyLimitReached
                    ? "var(--text-secondary)"
                    : accentColor,
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor:
                  cooldownSeconds > 0 || hourlyLimitReached
                    ? "not-allowed"
                    : "pointer",
                textDecoration:
                  cooldownSeconds > 0 || hourlyLimitReached
                    ? "none"
                    : "underline",
                padding: "4px 8px",
              }}
            >
              {isResending
                ? "Sending..."
                : cooldownSeconds > 0
                ? `Resend code in ${cooldownSeconds}s`
                : hourlyLimitReached
                ? "Limit Reached"
                : "Resend Code"}
            </button>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-1)",
              }}
            >
              <label htmlFor="otp-input" style={{ fontWeight: 500 }}>
                6-Digit OTP Code
              </label>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem("recovery_email");
                  sessionStorage.removeItem("recovery_expires_at");
                  sessionStorage.removeItem("recovery_resend_at");
                  setStep(1);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: accentColor,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Change Email
              </button>
            </div>
            <input
              id="otp-input"
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={isCodeExpired || codeInvalidated}
              required
              placeholder="123456"
              style={{
                textAlign: "center",
                letterSpacing: "4px",
                fontSize: "1.25rem",
                fontWeight: "bold",
                opacity: isCodeExpired || codeInvalidated ? 0.6 : 1,
              }}
            />
            {attemptsRemaining < 5 && attemptsRemaining > 0 && !isCodeExpired && (
              <span
                id="attempts-remaining-notice"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  color: "#f59e0b",
                  marginTop: "4px",
                  textAlign: "center",
                }}
              >
                ⚠️ {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining
              </span>
            )}
          </div>

          <div>
            <label
              htmlFor="new-password"
              style={{
                display: "block",
                marginBottom: "var(--space-1)",
                fontWeight: 500,
              }}
            >
              New Password (min. 6 characters)
            </label>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isCodeExpired || codeInvalidated}
                placeholder="Enter new password"
                style={{
                  paddingRight: "42px",
                  width: "100%",
                  opacity: isCodeExpired || codeInvalidated ? 0.6 : 1,
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={
                  showNewPassword ? "Hide new password" : "Show new password"
                }
                title={
                  showNewPassword ? "Hide new password" : "Show new password"
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                }}
              >
                {showNewPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              style={{
                display: "block",
                marginBottom: "var(--space-1)",
                fontWeight: 500,
              }}
            >
              Confirm New Password
            </label>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isCodeExpired || codeInvalidated}
                placeholder="Re-enter new password"
                style={{
                  paddingRight: "42px",
                  width: "100%",
                  opacity: isCodeExpired || codeInvalidated ? 0.6 : 1,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                title={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                }}
              >
                {showConfirmPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            id="reset-password-btn"
            type="submit"
            disabled={loading || isCodeExpired || codeInvalidated}
            className={isAdmin ? "btn btn-danger" : "btn btn-primary"}
            style={{
              width: "100%",
              padding: "12px",
              fontWeight: 600,
              fontSize: "1rem",
              marginTop: "var(--space-2)",
              opacity: loading || isCodeExpired || codeInvalidated ? 0.6 : 1,
              cursor:
                loading || isCodeExpired || codeInvalidated
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "Updating Password..."
              : isCodeExpired
              ? "Verification Code Expired"
              : codeInvalidated
              ? "Code Invalidate - Resend New Code"
              : "Reset Password"}
          </button>
        </form>
      )}

      {/* Step 3: Success Confirmation */}
      {step === 3 && (
        <div style={{ textAlign: "center", padding: "var(--space-4) 0" }}>
          <div
            style={{
              fontSize: "3rem",
              marginBottom: "var(--space-3)",
            }}
          >
            ✅
          </div>
          <h2
            style={{
              fontSize: "1.4rem",
              color: "#ffffff",
              marginBottom: "var(--space-2)",
            }}
          >
            Password Reset Complete!
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.95rem",
              marginBottom: "var(--space-6)",
            }}
          >
            Your password has been successfully updated. You can now sign in with
            your new credentials.
          </p>
          <Link
            id="proceed-login-btn"
            href={isAdmin ? "/login?role=admin" : "/login"}
            className={isAdmin ? "btn btn-danger" : "btn btn-primary"}
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              textAlign: "center",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Proceed to Sign In
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
        background:
          "radial-gradient(ellipse at top, #1e1b4b 0%, #09090b 70%)",
      }}
    >
      <Suspense
        fallback={
          <div style={{ color: "var(--text-secondary)" }}>
            Loading recovery flow...
          </div>
        }
      >
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
