"use client";

import { useState } from "react";

import { ConsentNotice } from "@/components/ui/ConsentNotice";
import { PHONE_PATTERN } from "@/lib/utils/phone";
import { PRN_PATTERN, SRN_PATTERN } from "@/lib/utils/srn";

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

// S35 self-registration - one component, now three variants. Stall volunteers
// pick the stall they will manage; group volunteers just leave their details and
// get a group number once the session activates.
//
// S74B: `pool` is the third variant. It used to be a MODE of the stall variant,
// reached whenever no session was active, which meant one route was serving two
// unrelated audiences and anyone pre-registering was silently recorded as a stall
// volunteer -- including people who meant to lead a group. The pool is now its own
// route and asks which role is intended; `stall` and `group` are both plain
// session-gated pages again.
export default function BootstrapRegister({
  variant,
  hasSession,
  stalls = [],
}: {
  variant: "stall" | "group" | "pool";
  hasSession: boolean;
  stalls?: { id: string; stall_name: string }[];
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [srn, setSrn] = useState("");
  const [stallId, setStallId] = useState("");
  const [preferredStall, setPreferredStall] = useState("");
  // Pool registrants declare intent; 'stall' matches the old behaviour, so it is
  // the default and nobody is forced to answer to get the previous outcome.
  const [poolRole, setPoolRole] = useState<"stall" | "lead">("stall");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    username: string;
    loginCode: string;
    pooled?: boolean;
  } | null>(null);

  // S49 pre-registration pool: register before any session exists. There are no
  // stalls to choose from, so a stall-bound registrant types a preference and the
  // session-creation sweep matches it; a group lead has nothing to match on and is
  // swept in by role (autoAssignPoolMembers).
  const poolMode = variant === "pool";
  // Only a pool registrant who intends to work a stall types a preference.
  const wantsStall = poolMode && poolRole === "stall";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/bootstrap/register/${variant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          poolMode
            ? {
                name,
                phone,
                srn,
                role: poolRole,
                // a lead has no stall preference to send
                preferred_stall_name: wantsStall ? preferredStall : "",
              }
            : variant === "group"
              ? { name, phone, srn }
              : { name, phone, srn, stall_id: stallId }
        ),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.error ?? "Registration failed").toUpperCase());
        return;
      }
      setResult(data as { username: string; loginCode: string; pooled?: boolean });
    } catch {
      setError("CONNECTION FAILED -- TRY AGAIN");
    } finally {
      setBusy(false);
    }
  }

  const title =
    variant === "pool"
      ? "Volunteer Pre-Registration"
      : variant === "stall"
        ? "Stall Volunteer Registration"
        : "Group Volunteer Registration";

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

        {!hasSession && !poolMode ? (
          // S74B: this block used to be the group variant's alone -- the stall
          // variant fell through to poolMode instead and quietly accepted the
          // submission. Both session-gated variants now land here, and both need
          // somewhere to go, so it points at the pool rather than dead-ending.
          // An inline pointer beats a redirect: the block already exists and is
          // already shared, so this is one edit that fixes both routes, and the
          // registrant keeps the URL they were given rather than being bounced to
          // a page they did not ask for.
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 600,
                fontSize: "1rem",
                letterSpacing: "0.04em",
                color: BS.muted,
                lineHeight: 1.6,
              }}
            >
              No live session right now.
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "12px",
                color: BS.muted,
                lineHeight: 1.7,
                marginTop: "12px",
              }}
            >
              Pre-register instead and you&apos;ll be assigned automatically when
              the next session opens.
            </p>
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
                marginTop: "1.5rem",
              }}
            >
              Pre-register
            </a>
          </div>
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
              Save these -- you&apos;ll need them to log in at /bootstrap.
              {/* S74B: a pooled registrant can now be a lead, so the group-number
                  line is keyed on the role that was actually chosen rather than on
                  the variant alone. */}
              {(variant === "group" || (poolMode && poolRole === "lead")) &&
                " Your group number will be shown on your dashboard after Bootstrap day starts."}
              {result.pooled &&
                (poolRole === "lead"
                  ? " You're pre-registered. You'll be added to the next session when it's created, and your login starts working then."
                  : " You're pre-registered. You'll be assigned to a stall when the next session is created, and your login starts working then.")}
            </p>
            {/* S72C (Section H): was 11px muted mono with no border and no
                min-height, sitting under a 20px-padded card - it read as a caption
                on that card rather than an action. This is the full-width bordered
                block BootstrapLogin.tsx uses for its two register links, applied
                verbatim: register -> login is the exact mirror of login -> register,
                so matching it beats inventing a third treatment. */}
            <a
              href="/bootstrap"
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
                marginTop: "1.5rem",
              }}
            >
              Back to login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {poolMode && (
              <p
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "12px",
                  lineHeight: 1.7,
                  color: BS.muted,
                  background: BS.elevated,
                  border: `1px solid ${BS.border}`,
                  borderRadius: "10px",
                  padding: "14px 16px",
                  marginBottom: "24px",
                }}
              >
                No session is running yet. Register now and you&apos;ll be
                assigned when the next one is created ∙ your login starts working
                then.
              </p>
            )}

            {poolMode && (
              <div style={{ marginBottom: "20px" }}>
                <span style={labelStyle}>What do you want to do?</span>
                {/* Two buttons rather than a <select>: there are exactly two
                    options and both need to be readable at a glance, since this
                    choice is the whole point of the page. */}
                <div style={{ display: "flex", gap: "10px" }}>
                  {(
                    [
                      ["stall", "Stall volunteer"],
                      ["lead", "Group lead"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPoolRole(value)}
                      style={{
                        flex: 1,
                        padding: "14px 10px",
                        fontFamily: "var(--font-chakra), sans-serif",
                        fontSize: "13px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        background: poolRole === value ? BS.accent : "transparent",
                        color: poolRole === value ? "#ffffff" : BS.muted,
                        border: `1px solid ${poolRole === value ? BS.accent : BS.border}`,
                        borderRadius: "10px",
                        cursor: "pointer",
                        transition: "background 150ms, color 150ms",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "10px",
                    letterSpacing: "0.06em",
                    color: BS.muted,
                    marginTop: "8px",
                    lineHeight: 1.7,
                  }}
                >
                  {poolRole === "stall"
                    ? "You'll be stationed at one stall for the day."
                    : "You'll walk a visitor group around the stalls and get a group number when the session starts."}
                </p>
              </div>
            )}

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
                Phone number (10 digits)
              </label>
              <input
                id="bs-reg-phone"
                className="bs-reg-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={10}
                pattern={PHONE_PATTERN}
                title="10 digits only -- no country code, no spaces"
                autoComplete="tel"
                placeholder="9876543210"
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
                10 digits only -- no country code, no spaces
              </p>
            </div>

            <div style={{ marginBottom: variant === "group" ? "28px" : "20px" }}>
              <label htmlFor="bs-reg-srn" style={labelStyle}>
                SRN / PRN
              </label>
              <input
                id="bs-reg-srn"
                className="bs-reg-input"
                type="text"
                value={srn}
                // uppercase into state: the SRN is the login username, and the
                // pattern below is case-sensitive
                onChange={(e) => setSrn(e.target.value.toUpperCase())}
                required
                maxLength={13}
                pattern={`(${SRN_PATTERN})|(${PRN_PATTERN})`}
                title="13 characters, like PES1UG21CS999 or PES1201912345"
                autoCapitalize="none"
                placeholder="PES1UG21CS999"
                style={inputStyle}
              />
            </div>

            {wantsStall && (
              <div style={{ marginBottom: "28px" }}>
                <label htmlFor="bs-reg-pref-stall" style={labelStyle}>
                  Which stall are you interested in?
                </label>
                <input
                  id="bs-reg-pref-stall"
                  className="bs-reg-input"
                  type="text"
                  value={preferredStall}
                  onChange={(e) => setPreferredStall(e.target.value)}
                  maxLength={60}
                  placeholder="e.g. Go-Kart, Robotics"
                  style={inputStyle}
                />
                {/* Tap to fill. The S50 fuzzy match strips punctuation on both
                    sides, so "Go-Kart" still lands on a "Go Kart" stall. */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {["Go-Kart", "Engine", "Bike", "Car 1", "Tyres", "Kuka", "Robotics"].map(
                    (stallName) => (
                      <button
                        key={stallName}
                        type="button"
                        onClick={() => setPreferredStall(stallName)}
                        style={{
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: "10px",
                          padding: "6px 10px",
                          border: `1px solid ${BS.borderStrong}`,
                          background:
                            preferredStall === stallName ? BS.accent : "transparent",
                          color: preferredStall === stallName ? BS.bg : BS.muted,
                          cursor: "pointer",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {stallName}
                      </button>
                    )
                  )}
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "10px",
                    letterSpacing: "0.06em",
                    color: BS.muted,
                    marginTop: "8px",
                  }}
                >
                  Optional -- if a stall with this name exists in the next
                  session, you&apos;ll be placed there automatically
                </p>
              </div>
            )}

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

            <ConsentNotice color={BS.muted} />

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
