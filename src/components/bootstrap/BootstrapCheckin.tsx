"use client";

import { useState } from "react";

import { BS } from "./StallCard";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono), monospace",
  fontSize: "0.7rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: BS.muted,
  marginBottom: "0.5rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "52px",
  padding: "0 14px",
  background: BS.surface,
  border: `1px solid ${BS.borderStrong}`,
  borderRadius: "8px",
  color: BS.text,
  fontFamily: "var(--font-space), sans-serif",
  fontSize: "1rem",
};

// Visitor check-in form (S32, reworked S33 for per-lead QR links).
// sessionName === null means the token is unknown or no session is active.
// isFull is the server-rendered snapshot; the POST re-checks atomically.
export default function BootstrapCheckin({
  token,
  sessionName,
  groupName: assignedGroup,
  isFull,
}: {
  token: string;
  sessionName: string | null;
  groupName: string | null;
  isFull: boolean;
}) {
  const [name, setName] = useState("");
  const [prn, setPrn] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [groupName, setGroupName] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/bootstrap/checkin/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, prn, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Check-in failed. Please try again.");
        return;
      }
      setGroupName(data.groupName);
    } catch {
      setError("Request failed — check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100svh",
        background: BS.bg,
        color: BS.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "24rem" }}>
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.7rem",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: BS.accent,
            margin: 0,
          }}
        >
          Vegavath · Bootstrap
        </p>

        {groupName ? (
          <div style={{ marginTop: "1.5rem" }}>
            <h1
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 700,
                fontSize: "1.75rem",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Welcome!
            </h1>
            <div
              style={{
                marginTop: "1.25rem",
                background: BS.surface,
                border: `1px solid ${BS.accent}`,
                borderRadius: "8px",
                padding: "20px",
              }}
            >
              <div style={labelStyle}>You&apos;re in</div>
              <div
                style={{
                  fontFamily: "var(--font-chakra), sans-serif",
                  fontWeight: 700,
                  fontSize: "2rem",
                  textTransform: "uppercase",
                  color: BS.accent,
                }}
              >
                {groupName}
              </div>
            </div>
            <p style={{ marginTop: "1rem", color: BS.muted, fontSize: "0.9rem", lineHeight: 1.6 }}>
              Your team lead will find you shortly.
            </p>
          </div>
        ) : sessionName === null ? (
          <div style={{ marginTop: "1.5rem" }}>
            <h1
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 700,
                fontSize: "1.5rem",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Not started yet
            </h1>
            <p style={{ marginTop: "0.75rem", color: BS.muted, fontSize: "0.9rem", lineHeight: 1.6 }}>
              Bootstrap hasn&apos;t started yet, or this check-in link isn&apos;t valid.
              Check back later.
            </p>
          </div>
        ) : isFull ? (
          <div style={{ marginTop: "1.5rem" }}>
            <h1
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 700,
                fontSize: "1.5rem",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              This group is full!
            </h1>
            <p style={{ marginTop: "0.75rem", color: BS.muted, fontSize: "0.9rem", lineHeight: 1.6 }}>
              Ask a different group lead to scan you in.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: "1.5rem" }}>
            <h1
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 700,
                fontSize: "1.75rem",
                textTransform: "uppercase",
                margin: "0 0 0.5rem",
              }}
            >
              Check in
            </h1>
            {assignedGroup && (
              <p
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "0.75rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: BS.muted,
                  margin: "0 0 1.5rem",
                }}
              >
                Joining {assignedGroup}
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div>
                <label htmlFor="ci-name" style={labelStyle}>
                  Full name
                </label>
                <input
                  id="ci-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  autoComplete="name"
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="ci-prn" style={labelStyle}>
                  PRN/SRN
                </label>
                <input
                  id="ci-prn"
                  type="text"
                  value={prn}
                  onChange={(e) => setPrn(e.target.value)}
                  maxLength={30}
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="ci-phone" style={labelStyle}>
                  Phone
                </label>
                <input
                  id="ci-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                  autoComplete="tel"
                  style={inputStyle}
                />
              </div>
            </div>

            {error && (
              <p style={{ marginTop: "1rem", color: BS.danger, fontSize: "0.85rem" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={busy || !name.trim() || !prn.trim() || !phone.trim()}
              style={{
                marginTop: "1.5rem",
                minHeight: "56px",
                width: "100%",
                background: BS.accent,
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: busy ? "wait" : "pointer",
                opacity: busy || !name.trim() || !prn.trim() || !phone.trim() ? 0.6 : 1,
              }}
            >
              {busy ? "Checking in…" : "Check in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
