"use client";

import type { BootstrapStall } from "@/lib/services/bootstrap";

// Standalone Bootstrap palette (docs/bootstrap-spec + session 24) - deliberately
// separate from the main site's globals.css tokens. JS constants rather than CSS
// custom properties: every style here is inline anyway, and StallCard also
// renders inside /admin pages where a Bootstrap-layout cascade wouldn't reach.
export const BS = {
  bg: "#0a0a0a",
  surface: "#161616",
  elevated: "#1d1d1d",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.25)",
  text: "#f0f0f0",
  muted: "#888888",
  free: "#22c55e",
  occupied: "#f97316",
  queued: "#eab308",
  danger: "#ef4444",
  accent: "#EF5D08",
} as const;

const STATUS_META: Record<BootstrapStall["status"], { color: string; label: string }> = {
  free: { color: BS.free, label: "FREE" },
  occupied: { color: BS.occupied, label: "OCCUPIED" },
  queued: { color: BS.queued, label: "QUEUED" },
};

// Shared by the admin override form ("Apply override" button).
export const bootstrapBtnStyle: React.CSSProperties = {
  minHeight: "44px",
  width: "100%",
  background: "transparent",
  border: `1px solid ${BS.borderStrong}`,
  color: BS.text,
  fontFamily: "var(--font-chakra), sans-serif",
  fontWeight: 700,
  fontSize: "0.8rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "0.5rem 1rem",
  cursor: "pointer",
  transition: "border-color 150ms, background 150ms",
};

// Volunteer grid: 1 column on phones, 2 on tablets (≥600px). Scoped <style>
// tag with real media queries - Tailwind responsive prefixes are unreliable
// in this setup (see CLAUDE.md).
export function StallGrid({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .bs-stall-grid { display: grid; gap: 0.75rem; grid-template-columns: 1fr; }
        @media (min-width: 600px) { .bs-stall-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
      <div className="bs-stall-grid">{children}</div>
    </>
  );
}

export type VolunteerStallAction = "claim" | "release" | "mark_queued" | "unqueue";

// re-renders come from the 4s poll, so the count stays fresh without a ticker
function waitMinutes(queued_at: string | null): number {
  if (!queued_at) return 0;
  return Math.floor((Date.now() - new Date(queued_at).getTime()) / 60000);
}

const actionBtnBase: React.CSSProperties = {
  minHeight: "56px",
  width: "100%",
  fontFamily: "var(--font-chakra), sans-serif",
  fontWeight: 700,
  fontSize: "1rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRadius: "10px",
  cursor: "pointer",
  transition: "opacity 150ms, background 150ms",
};

const BTN_KINDS = {
  // accent fill - the primary CLAIM action
  accent: { ...actionBtnBase, background: BS.accent, color: "#ffffff", border: "none" },
  // outlines get a faint same-colour tint so they stay legible in sunlight
  "accent-outline": {
    ...actionBtnBase,
    background: `${BS.accent}14`,
    color: BS.accent,
    border: `1px solid ${BS.accent}`,
  },
  danger: {
    ...actionBtnBase,
    background: `${BS.danger}14`,
    color: BS.danger,
    border: `1px solid ${BS.danger}`,
  },
  queued: {
    ...actionBtnBase,
    background: `${BS.queued}14`,
    color: BS.queued,
    border: `1px solid ${BS.queued}`,
  },
  neutral: {
    ...actionBtnBase,
    background: "transparent",
    color: BS.text,
    border: `1px solid ${BS.borderStrong}`,
  },
} satisfies Record<string, React.CSSProperties>;

/**
 * Session 25 rules - MARK QUEUED stays open to anyone, but only the volunteer
 * who set the queue (queued_by) may clear it:
 *   free                     → CLAIM
 *   occupied, mine           → RELEASE + MARK QUEUED
 *   occupied, not mine       → MARK QUEUED (+ JOIN while max_occupancy has room)
 *   queued, I am queued_by   → BACK TO OCCUPIED (+ RELEASE if also in claimed_by)
 *   queued, in claimed_by    → RELEASE only
 *   queued, neither          → no actions, read-only
 */
function volunteerButtons(
  stall: BootstrapStall,
  username: string
): { label: string; action: VolunteerStallAction; kind: keyof typeof BTN_KINDS }[] {
  const claimed = stall.claimed_by ?? [];
  const mine = claimed.includes(username);

  if (stall.status === "free") {
    return [{ label: "Claim", action: "claim", kind: "accent" }];
  }
  if (stall.status === "occupied") {
    const buttons: ReturnType<typeof volunteerButtons> = [];
    if (mine) {
      buttons.push({ label: "Release", action: "release", kind: "danger" });
    } else if (claimed.length < stall.max_occupancy) {
      // shared-stall entry point (session 22) - kept alongside the new rules
      buttons.push({ label: "Join", action: "claim", kind: "accent-outline" });
    }
    buttons.push({ label: "Mark queued", action: "mark_queued", kind: "queued" });
    return buttons;
  }
  // queued
  const buttons: ReturnType<typeof volunteerButtons> = [];
  if (mine) buttons.push({ label: "Release", action: "release", kind: "danger" });
  if (stall.queued_by === username) {
    buttons.push({ label: "Back to occupied", action: "unqueue", kind: "neutral" });
  }
  return buttons;
}

/**
 * Two modes:
 *  - volunteer (username + onAction): rule-based buttons, always visible -
 *    no tap-to-expand between a volunteer and the action.
 *  - admin (expanded + onToggle + actions): header toggles the custom
 *    override form passed in via `actions`, as before.
 */
export default function StallCard({
  stall,
  username,
  onAction,
  expanded,
  onToggle,
  actions,
}: {
  stall: BootstrapStall;
  username?: string;
  onAction?: (action: VolunteerStallAction) => void;
  expanded?: boolean;
  onToggle?: () => void;
  actions?: React.ReactNode;
}) {
  const meta = STATUS_META[stall.status];
  const claimed = stall.claimed_by ?? [];
  const adminMode = typeof onToggle === "function";

  return (
    <div
      style={{
        background: BS.surface,
        border: `1px solid ${expanded ? BS.accent : BS.border}`,
        borderRadius: "12px",
        padding: "16px",
      }}
    >
      <div
        {...(adminMode
          ? {
              onClick: onToggle,
              role: "button",
              tabIndex: 0,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") onToggle?.();
              },
              style: { cursor: "pointer" },
            }
          : {})}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 700,
              fontSize: "1.25rem",
              textTransform: "uppercase",
              color: BS.text,
              lineHeight: 1.2,
            }}
          >
            {stall.stall_name}
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              flexShrink: 0,
              background: `${meta.color}20`,
              color: meta.color,
              borderRadius: "999px",
              padding: "6px 12px",
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 700,
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "999px",
                background: meta.color,
              }}
            />
            {meta.label}
          </span>
        </div>
        {/* S33 - informational stall leads from session creation */}
        {stall.lead_names && (
          <div
            style={{
              marginTop: "0.35rem",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.7rem",
              letterSpacing: "0.04em",
              color: BS.muted,
            }}
          >
            Leads: {stall.lead_names}
          </div>
        )}
        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.875rem",
            color: claimed.length > 0 ? BS.text : BS.muted,
          }}
        >
          {claimed.length > 0
            ? `${stall.status === "queued" ? "Presenting: " : ""}${claimed.join(", ")}`
            : "No one here"}
        </div>
        {stall.status === "queued" && stall.queued_by && (
          <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: BS.queued }}>
            Queued: {stall.queued_by}
            {stall.queued_at && (
              <span
                style={{
                  marginLeft: "0.4rem",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "0.7rem",
                  // yellow past 20 min - visual urgency signal
                  color: waitMinutes(stall.queued_at) > 20 ? BS.queued : BS.muted,
                }}
              >
                ({waitMinutes(stall.queued_at)} min)
              </span>
            )}
          </div>
        )}
      </div>

      {username && onAction && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" }}>
          {volunteerButtons(stall, username).map((btn) => (
            <button key={btn.action} style={BTN_KINDS[btn.kind]} onClick={() => onAction(btn.action)}>
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {adminMode && expanded && actions && (
        <div style={{ marginTop: "14px", borderTop: `1px solid ${BS.border}`, paddingTop: "14px" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
