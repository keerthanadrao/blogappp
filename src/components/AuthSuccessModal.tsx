"use client";

import React from "react";

interface AuthSuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  redirectingTo?: string;
}

export default function AuthSuccessModal({
  isOpen,
  title,
  message,
  redirectingTo,
}: AuthSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div
      id="auth-success-modal"
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "var(--space-4)",
        animation: "fadeIn 0.25s ease-out forwards",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
          padding: "var(--space-6)",
          background: "linear-gradient(145deg, #18181b, #09090b)",
          border: "1px solid rgba(34, 197, 94, 0.4)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 12px 40px rgba(34, 197, 94, 0.2), 0 0 0 1px rgba(34, 197, 94, 0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle Top Accent Glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #22c55e, #10b981, #06b6d4)",
          }}
        />

        {/* Animated Checkmark Circle */}
        <div
          style={{
            width: "68px",
            height: "68px",
            margin: "0 auto var(--space-4) auto",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 70%)",
            border: "2px solid #22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(34, 197, 94, 0.4)",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Modal Title */}
        <h2
          id="auth-success-title"
          style={{
            fontSize: "1.45rem",
            fontWeight: 700,
            color: "#ffffff",
            marginBottom: "var(--space-2)",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h2>

        {/* Modal Message */}
        <p
          id="auth-success-message"
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.95rem",
            lineHeight: 1.5,
            marginBottom: redirectingTo ? "var(--space-4)" : "0",
          }}
        >
          {message}
        </p>

        {/* Redirecting indicator */}
        {redirectingTo && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              background: "rgba(34, 197, 94, 0.1)",
              borderRadius: "var(--radius-full)",
              border: "1px solid rgba(34, 197, 94, 0.25)",
              color: "#86efac",
              fontSize: "0.82rem",
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#22c55e",
                display: "inline-block",
                boxShadow: "0 0 8px #22c55e",
              }}
            />
            Redirecting to {redirectingTo}...
          </div>
        )}
      </div>
    </div>
  );
}
