import Link from "next/link";

import type { VisitorChecklistContext } from "@/lib/services/bootstrap";
import { BS } from "./StallCard";

/**
 * S73D (J2/J5). Server component: it renders resolved data and has no state, no
 * timers and no polling. A reload is the refresh, which is the whole point of
 * the page being force-dynamic.
 */
export default function BootstrapChecklist({
  ctx,
}: {
  ctx: VisitorChecklistContext | null;
}) {
  if (!ctx) {
    return (
      <div
        style={{
          minHeight: "100svh",
          background: BS.bg,
          color: BS.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 700,
              fontSize: "1.25rem",
              textTransform: "uppercase",
            }}
          >
            Link not found
          </div>
          <p style={{ marginTop: "12px", color: BS.muted, lineHeight: 1.6 }}>
            This progress link is not valid. Ask your group lead to scan you in
            again, and save the link from the confirmation screen.
          </p>
        </div>
      </div>
    );
  }

  const done = ctx.stalls.filter((s) => s.visited).length;
  const total = ctx.stalls.length;
  // J5's gate. `visited` is left_at IS NOT NULL, so a stall the group is standing
  // at right now does not count yet.
  const allDone = total > 0 && done === total;

  return (
    <div style={{ minHeight: "100svh", background: BS.bg, color: BS.text }}>
      <main className="mx-auto" style={{ maxWidth: "36rem", padding: "32px 16px 48px" }}>
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: BS.muted,
          }}
        >
          {ctx.session_name}
        </p>
        <h1
          style={{
            marginTop: "8px",
            fontFamily: "var(--font-chakra), sans-serif",
            fontWeight: 700,
            fontSize: "1.75rem",
            textTransform: "uppercase",
            lineHeight: 1.15,
          }}
        >
          {ctx.group_number ? `Group ${ctx.group_number}` : "Your group"}
        </h1>
        <p style={{ marginTop: "6px", color: BS.muted, fontSize: "0.9rem" }}>
          {ctx.visitor_name} · {ctx.visitor_prn}
        </p>

        {ctx.lead_name && (
          <p style={{ marginTop: "4px", color: BS.muted, fontSize: "0.85rem" }}>
            Lead: {ctx.lead_name}
            {ctx.lead_phone && (
              <>
                {" · "}
                <a href={`tel:${ctx.lead_phone}`} style={{ color: BS.accent }}>
                  {ctx.lead_phone}
                </a>
              </>
            )}
          </p>
        )}

        <div
          style={{
            marginTop: "24px",
            marginBottom: "12px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "12px",
            letterSpacing: "0.1em",
            color: BS.muted,
          }}
        >
          {done} OF {total} STALLS DONE
        </div>

        <div style={{ border: `1px solid ${BS.border}` }}>
          {ctx.stalls.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 16px",
                background: BS.surface,
                borderTop: i === 0 ? "none" : `1px solid ${BS.border}`,
              }}
            >
              {/* filled square = done, hollow = not yet. Same visual language as
                  the status dots on the volunteer dashboards; no emoji. */}
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  flexShrink: 0,
                  background: s.visited ? BS.free : "transparent",
                  border: `1px solid ${s.visited ? BS.free : BS.borderStrong}`,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontFamily: "var(--font-chakra), sans-serif",
                  fontSize: "1rem",
                  color: s.visited ? BS.text : BS.muted,
                }}
              >
                {s.stall_name}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  color: s.visited ? BS.free : BS.muted,
                }}
              >
                {s.visited ? "DONE" : s.arrived_at ? "HERE NOW" : "NOT YET"}
              </span>
            </div>
          ))}
        </div>

        {/* J5. A view-logic gate and nothing more: /bootstrap/feedback is
            unchanged and still completely anonymous, and nothing stops anyone
            reaching it directly at any time. The copy says "required" because
            that is what the club is asking of them, not because anything
            enforces it. */}
        {allDone ? (
          <div
            style={{
              marginTop: "24px",
              padding: "20px 16px",
              background: `${BS.accent}14`,
              border: `1px solid ${BS.accent}`,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 700,
                fontSize: "1.05rem",
                textTransform: "uppercase",
                color: BS.accent,
              }}
            >
              One last thing
            </div>
            <p style={{ marginTop: "8px", color: BS.text, lineHeight: 1.6, fontSize: "0.95rem" }}>
              You have been to every stall. Please fill in the feedback form
              before you go -- it is anonymous and takes a minute.
            </p>
            <Link
              href="/bootstrap/feedback"
              style={{
                display: "block",
                marginTop: "16px",
                minHeight: "56px",
                lineHeight: "56px",
                textAlign: "center",
                background: BS.accent,
                color: "#ffffff",
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Give feedback
            </Link>
          </div>
        ) : (
          <p
            style={{
              marginTop: "24px",
              color: BS.muted,
              fontSize: "0.85rem",
              lineHeight: 1.6,
            }}
          >
            A stall ticks off once your group has finished there and the volunteer
            marks you as moved on. Reload this page to see the latest.
          </p>
        )}
      </main>
    </div>
  );
}
