"use client";

import { useState } from "react";

import { BS } from "./StallCard";

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
  borderRadius: "10px",
  color: BS.text,
  fontFamily: "var(--font-mono), monospace",
  fontSize: "1.125rem",
  padding: "0 16px",
  outline: "none",
  transition: "border-color 150ms",
};

export default function BootstrapLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bootstrap/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        // full reload so the server component re-checks the cookie
        window.location.href = "/bootstrap";
        return;
      }
      if (res.status === 409) {
        setError("ACCOUNT IN USE ∙ ASK ADMIN TO UNLOCK");
      } else {
        const data = await res.json().catch(() => null);
        setError(
          data?.error === "No active session"
            ? "NO ACTIVE SESSION ∙ ASK ADMIN"
            : "INVALID CREDENTIALS"
        );
      }
    } catch {
      setError("CONNECTION FAILED ∙ TRY AGAIN");
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
      <style>{`.bs-login-input:focus { border-color: ${BS.accent} !important; }`}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "26rem",
          background: BS.surface,
          border: `1px solid ${BS.border}`,
          borderRadius: "16px",
          padding: "40px 28px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          {/* inline club shield */}
          <svg
            width="40"
            height="44"
            viewBox="0 0 40 44"
            fill="none"
            aria-hidden="true"
            style={{ marginBottom: "12px" }}
          >
            <path
              d="M20 2 L38 9 V24 C38 33 30 40 20 42 C10 40 2 33 2 24 V9 Z"
              stroke={BS.accent}
              strokeWidth="2.5"
              fill={`${BS.accent}14`}
            />
            <path d="M13 15 L20 29 L27 15" stroke={BS.accent} strokeWidth="2.5" fill="none" />
          </svg>
          <div
            style={{
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 700,
              fontSize: "1.5rem",
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
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 700,
              fontSize: "1.5rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: BS.accent,
              lineHeight: 1.3,
            }}
          >
            Bootstrap
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="bs-username" style={labelStyle}>
              Username
            </label>
            <input
              id="bs-username"
              className="bs-login-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoCapitalize="none"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label htmlFor="bs-password" style={labelStyle}>
              Password
            </label>
            <input
              id="bs-password"
              className="bs-login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              height: "64px",
              background: BS.accent,
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 700,
              fontSize: "1.125rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.6 : 1,
              transition: "opacity 150ms",
            }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          {error && (
            <p
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 600,
                fontSize: "0.875rem",
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

        {/* S36 - first-time volunteers reach registration straight from login */}
        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.5rem",
            borderTop: `1px solid ${BS.border}`,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              color: BS.muted,
              textAlign: "center",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            First time? Register below.
          </p>
          <a
            href="/bootstrap/register/stall"
            style={{
              display: "block",
              width: "100%",
              padding: "14px",
              fontFamily: "var(--font-chakra), sans-serif",
              fontSize: "14px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textAlign: "center",
              textDecoration: "none",
              background: "transparent",
              border: `1px solid ${BS.border}`,
              borderRadius: "10px",
              color: BS.text,
            }}
          >
            Register as Stall Volunteer
          </a>
          <a
            href="/bootstrap/register/group"
            style={{
              display: "block",
              width: "100%",
              padding: "14px",
              fontFamily: "var(--font-chakra), sans-serif",
              fontSize: "14px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textAlign: "center",
              textDecoration: "none",
              background: "transparent",
              border: `1px solid ${BS.border}`,
              borderRadius: "10px",
              color: BS.text,
            }}
          >
            Register as Group Volunteer
          </a>
          {/* S74B: the two links above only work while a session is live. This is
              the one that always does, so it is the fallback for anyone who lands
              here between events -- which, off-season, is everyone. */}
          <a
            href="/bootstrap/register/pool"
            style={{
              display: "block",
              width: "100%",
              padding: "14px",
              fontFamily: "var(--font-chakra), sans-serif",
              fontSize: "14px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textAlign: "center",
              textDecoration: "none",
              background: "transparent",
              border: `1px solid ${BS.border}`,
              borderRadius: "10px",
              color: BS.text,
            }}
          >
            Pre-register for the next session
          </a>
        </div>
      </div>
    </div>
  );
}
