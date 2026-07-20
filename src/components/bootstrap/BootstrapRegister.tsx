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
  fontSize: "1rem",
  padding: "0 16px",
  outline: "none",
  transition: "border-color 150ms",
};

// S35 self-registration - one component, two variants. Stall volunteers pick
// the stall they will manage; group volunteers just leave their details and
// get a group number once the session activates.
export default function BootstrapRegister({
  variant,
  hasSession,
  stalls = [],
}: {
  variant: "stall" | "group";
  hasSession: boolean;
  stalls?: { id: string; stall_name: string }[];
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [srn, setSrn] = useState("");
  const [stallId, setStallId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ username: string; loginCode: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/bootstrap/register/${variant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          variant === "stall" ? { name, phone, srn, stall_id: stallId } : { name, phone, srn }
        ),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.error ?? "Registration failed").toUpperCase());
        return;
      }
      setResult(data as { username: string; loginCode: string });
    } catch {
      setError("CONNECTION FAILED — TRY AGAIN");
    } finally {
      setBusy(false);
    }
  }

  const title = variant === "stall" ? "Stall Volunteer Registration" : "Group Volunteer Registration";

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
      <style>{`.bs-reg-input:focus { border-color: ${BS.accent} !important; }`}</style>

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
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: BS.muted,
              marginBottom: "10px",
            }}
          >
            Vegavath · Bootstrap
          </div>
          <div
            style={{
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 700,
              fontSize: "1.25rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: BS.text,
              lineHeight: 1.35,
            }}
          >
            {title}
          </div>
        </div>

        {!hasSession ? (
          <p
            style={{
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 600,
              fontSize: "1rem",
              letterSpacing: "0.04em",
              color: BS.muted,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Registration is not open yet.
          </p>
        ) : result ? (
          <div>
            <div
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 700,
                fontSize: "1.5rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: BS.free,
                textAlign: "center",
                marginBottom: "24px",
              }}
            >
              Registered!
            </div>
            <div
              style={{
                background: BS.elevated,
                border: `1px solid ${BS.border}`,
                borderRadius: "10px",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <div style={{ ...labelStyle, marginBottom: "4px" }}>Username (your SRN)</div>
              <code
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "1.125rem",
                  color: BS.text,
                  letterSpacing: "0.06em",
                  marginBottom: "16px",
                  userSelect: "all",
                }}
              >
                {result.username}
              </code>
              <div style={{ ...labelStyle, marginBottom: "4px" }}>Login code</div>
              <code
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "1.5rem",
                  color: BS.accent,
                  letterSpacing: "0.12em",
                  userSelect: "all",
                }}
              >
                {result.loginCode}
              </code>
            </div>
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "12px",
                color: BS.muted,
                lineHeight: 1.7,
              }}
            >
              Save these — you&apos;ll need them to log in at /bootstrap.
              {variant === "group" &&
                " Your group number will be shown on your dashboard after Bootstrap day starts."}
            </p>
            <a
              href="/bootstrap"
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "11px",
                letterSpacing: "0.1em",
                color: BS.muted,
                textDecoration: "none",
                display: "block",
                textAlign: "center",
                marginTop: "1.5rem",
              }}
            >
              ← Back to login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="bs-reg-name" style={labelStyle}>
                Full name
              </label>
              <input
                id="bs-reg-name"
                className="bs-reg-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                autoComplete="name"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="bs-reg-phone" style={labelStyle}>
                Phone number
              </label>
              <input
                id="bs-reg-phone"
                className="bs-reg-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={20}
                autoComplete="tel"
                placeholder="10-digit number"
                style={inputStyle}
              />
              <p
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "10px",
                  letterSpacing: "0.06em",
                  color: BS.muted,
                  marginTop: "8px",
                }}
              >
                +91 prefix is fine — it will be removed
              </p>
            </div>

            <div style={{ marginBottom: variant === "stall" ? "20px" : "28px" }}>
              <label htmlFor="bs-reg-srn" style={labelStyle}>
                SRN / PRN
              </label>
              <input
                id="bs-reg-srn"
                className="bs-reg-input"
                type="text"
                value={srn}
                onChange={(e) => setSrn(e.target.value)}
                required
                maxLength={30}
                autoCapitalize="none"
                placeholder="Your SRN or PRN"
                style={inputStyle}
              />
            </div>

            {variant === "stall" && (
              <div style={{ marginBottom: "28px" }}>
                <label htmlFor="bs-reg-stall" style={labelStyle}>
                  Your stall
                </label>
                <select
                  id="bs-reg-stall"
                  className="bs-reg-input"
                  value={stallId}
                  onChange={(e) => setStallId(e.target.value)}
                  required
                  style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                >
                  <option value="" disabled>
                    Select a stall…
                  </option>
                  {stalls.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.stall_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || (variant === "stall" && !stallId)}
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
                opacity: busy || (variant === "stall" && !stallId) ? 0.6 : 1,
                transition: "opacity 150ms",
              }}
            >
              {busy ? "Registering…" : "Register"}
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
                  lineHeight: 1.6,
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
