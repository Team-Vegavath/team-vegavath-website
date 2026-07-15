"use client";

import { useState } from "react";

import { BS } from "@/components/bootstrap/StallCard";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono), monospace",
  fontSize: "11px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: BS.muted,
  marginBottom: "8px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "56px",
  background: BS.elevated,
  border: `1px solid ${BS.border}`,
  color: BS.text,
  fontFamily: "var(--font-mono), monospace",
  fontSize: "1rem",
  padding: "0 16px",
  outline: "none",
  transition: "border-color 150ms",
};

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("ALL FIELDS ARE REQUIRED");
      return;
    }
    if (password !== confirmPassword) {
      setError("PASSWORDS DO NOT MATCH");
      return;
    }
    if (password.length < 8) {
      setError("PASSWORD MUST BE AT LEAST 8 CHARACTERS");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/credentials/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setDone(true);
      } else {
        setError((data?.error as string | undefined)?.toUpperCase() ?? "RESET FAILED");
      }
    } catch {
      setError("CONNECTION FAILED - TRY AGAIN");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: BS.bg,
      }}
    >
      {/* stylesheet :focus needs !important to beat the inline border */}
      <style>{`.admin-reg-input:focus { border-color: ${BS.accent} !important; }`}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "28rem",
          background: BS.surface,
          border: `1px solid ${BS.border}`,
          padding: "40px 28px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 700,
              fontSize: "1.4rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: BS.text,
              lineHeight: 1.3,
            }}
          >
            Vegavath
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.7rem",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: BS.accent,
              marginTop: "4px",
            }}
          >
            Password reset
          </div>
        </div>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 700,
                fontSize: "1.1rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: BS.free,
                marginBottom: "12px",
              }}
            >
              Password updated
            </div>
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.8rem",
                lineHeight: 1.7,
                color: BS.muted,
              }}
            >
              You can now sign in with your new password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="reset-password" style={labelStyle}>
                New password
              </label>
              <input
                id="reset-password"
                className="admin-reg-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="reset-confirm" style={labelStyle}>
                Confirm password
              </label>
              <input
                id="reset-confirm"
                className="admin-reg-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%",
                height: "64px",
                marginTop: "8px",
                background: BS.accent,
                color: "#ffffff",
                border: "none",
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.6 : 1,
                transition: "opacity 150ms",
              }}
            >
              {busy ? "Saving…" : "Set new password"}
            </button>

            {error && (
              <p
                style={{
                  fontFamily: "var(--font-chakra), sans-serif",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  letterSpacing: "0.06em",
                  color: BS.danger,
                  textAlign: "center",
                  marginTop: "20px",
                }}
              >
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
