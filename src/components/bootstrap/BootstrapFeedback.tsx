"use client";

import { useState } from "react";

import { BS } from "./StallCard";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono), monospace",
  fontSize: "0.7rem",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: BS.muted,
  marginBottom: "0.5rem",
};

const hintStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono), monospace",
  fontSize: "0.62rem",
  letterSpacing: "0.04em",
  color: BS.muted,
  marginTop: "0.4rem",
  lineHeight: 1.5,
};

function tileStyle(active: boolean): React.CSSProperties {
  return {
    minHeight: "48px",
    background: active ? BS.accent : BS.surface,
    color: active ? "#ffffff" : BS.text,
    border: `1px solid ${active ? BS.accent : BS.borderStrong}`,
    borderRadius: "8px",
    fontFamily: "var(--font-chakra), sans-serif",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
  };
}

// S36 visitor feedback: 5 quick questions, mostly taps. Only the overall
// rating (1-10) is required; everything else is optional.
export default function BootstrapFeedback({
  hasSession,
  stalls,
}: {
  hasSession: boolean;
  stalls: { id: string; stall_name: string }[];
}) {
  const [overall, setOverall] = useState<number | null>(null);
  const [stallId, setStallId] = useState("");
  const [stallRating, setStallRating] = useState<number | null>(null);
  const [joinLikelihood, setJoinLikelihood] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!overall) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bootstrap/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overall_rating: overall,
          stall_id: stallId || undefined,
          stall_rating: stallId && stallRating ? stallRating : undefined,
          join_likelihood: joinLikelihood || undefined,
          suggestions: suggestions.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Submission failed. Please try again.");
        return;
      }
      setDone(true);
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
      <div style={{ width: "100%", maxWidth: "26rem" }}>
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

        {done ? (
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
              Thank you!
            </h1>
            <p style={{ marginTop: "0.75rem", color: BS.muted, fontSize: "0.9rem", lineHeight: 1.6 }}>
              Your feedback helps us improve Bootstrap.
            </p>
          </div>
        ) : !hasSession ? (
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
              Not running
            </h1>
            <p style={{ marginTop: "0.75rem", color: BS.muted, fontSize: "0.9rem", lineHeight: 1.6 }}>
              Bootstrap isn&apos;t running right now. Check back later.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: "1.5rem" }}>
            <h1
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 700,
                fontSize: "1.4rem",
                textTransform: "uppercase",
                margin: "0 0 1.5rem",
                lineHeight: 1.3,
              }}
            >
              How was your Vegavath Bootstrap experience?
            </h1>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Q1 - overall, 1-10, required */}
              <div>
                <span style={labelStyle}>1. Overall experience *</span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "8px",
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setOverall(n)}
                      aria-pressed={overall === n}
                      aria-label={`Rate ${n} out of 10`}
                      style={tileStyle(overall === n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p style={hintStyle}>Tap to rate out of 10.</p>
              </div>

              {/* Q2 - which stall (optional) */}
              <div>
                <label htmlFor="fb-stall" style={labelStyle}>
                  2. Which stall stood out most?
                </label>
                <select
                  id="fb-stall"
                  value={stallId}
                  onChange={(e) => {
                    setStallId(e.target.value);
                    if (!e.target.value) setStallRating(null);
                  }}
                  style={{
                    width: "100%",
                    minHeight: "52px",
                    padding: "0 14px",
                    background: BS.surface,
                    border: `1px solid ${BS.borderStrong}`,
                    borderRadius: "8px",
                    color: BS.text,
                    fontFamily: "var(--font-space), sans-serif",
                    fontSize: "1rem",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Overall / not sure</option>
                  {stalls.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.stall_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Q3 - rate that stall, only when Q2 answered (optional) */}
              {stallId && (
                <div>
                  <span style={labelStyle}>3. Rate that stall</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setStallRating(n)}
                        aria-pressed={stallRating === n}
                        aria-label={`Rate stall ${n} out of 5`}
                        style={{ ...tileStyle(stallRating === n), flex: 1, minHeight: "52px" }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Q4 - likelihood to join, 1-5 (optional) */}
              <div>
                <span style={labelStyle}>4. Likelihood to join Vegavath</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setJoinLikelihood(n)}
                      aria-pressed={joinLikelihood === n}
                      aria-label={`Likelihood ${n} out of 5`}
                      style={{ ...tileStyle(joinLikelihood === n), flex: 1, minHeight: "52px" }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p style={hintStyle}>1 = definitely not · 5 = already filling the form</p>
              </div>

              {/* Q5 - suggestions (optional) */}
              <div>
                <label htmlFor="fb-suggestions" style={labelStyle}>
                  5. Any suggestions?
                </label>
                <textarea
                  id="fb-suggestions"
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="What could we do better next year?"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: BS.surface,
                    border: `1px solid ${BS.borderStrong}`,
                    borderRadius: "8px",
                    color: BS.text,
                    fontFamily: "var(--font-space), sans-serif",
                    fontSize: "1rem",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            {error && (
              <p style={{ marginTop: "1rem", color: BS.danger, fontSize: "0.85rem" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={busy || !overall}
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
                cursor: busy ? "wait" : overall ? "pointer" : "default",
                opacity: busy || !overall ? 0.6 : 1,
              }}
            >
              {busy ? "Submitting…" : "Submit feedback"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
