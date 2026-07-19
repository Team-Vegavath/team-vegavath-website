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

// Visitor feedback form (S32): stall dropdown, 1-5 rating tiles, comment.
export default function BootstrapFeedback({
  hasSession,
  stalls,
}: {
  hasSession: boolean;
  stalls: { id: string; stall_name: string }[];
}) {
  const [stallId, setStallId] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bootstrap/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stall_id: stallId || undefined,
          rating,
          comment: comment.trim() || undefined,
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
                fontSize: "1.5rem",
                textTransform: "uppercase",
                margin: "0 0 1.5rem",
              }}
            >
              How was your experience?
            </h1>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label htmlFor="fb-stall" style={labelStyle}>
                  Which stall?
                </label>
                <select
                  id="fb-stall"
                  value={stallId}
                  onChange={(e) => setStallId(e.target.value)}
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

              <div>
                <span style={labelStyle}>Rating</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-pressed={rating === n}
                      aria-label={`Rate ${n} out of 5`}
                      style={{
                        flex: 1,
                        minHeight: "52px",
                        background: rating === n ? BS.accent : BS.surface,
                        color: rating === n ? "#ffffff" : BS.text,
                        border: `1px solid ${rating === n ? BS.accent : BS.borderStrong}`,
                        borderRadius: "8px",
                        fontFamily: "var(--font-chakra), sans-serif",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        cursor: "pointer",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="fb-comment" style={labelStyle}>
                  Comments (optional)
                </label>
                <textarea
                  id="fb-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={2000}
                  rows={4}
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
              disabled={busy || !rating}
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
                cursor: busy ? "wait" : rating ? "pointer" : "default",
                opacity: busy || !rating ? 0.6 : 1,
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
