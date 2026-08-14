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
export function waitMinutes(queued_at: string | null): number {
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
 * S73B rules. The queue is a GROUP waiting at a stall (migration 027), not a
 * username on the stall row, so every queue button is keyed on myGroupId:
 *   role 'stall'                 → CLAIM / RELEASE / JOIN only, never a queue button
 *   lead, nobody at the stall    → LEAVE QUEUE if my group is in it, else nothing
 *   lead, someone at the stall   → my group queued ? LEAVE QUEUE : MARK QUEUED
 *
 * The behaviour change from S72: MARK QUEUED used to be open to ANY volunteer of
 * either role, because queued_by was one username and "who is waiting" was
 * whoever tapped last. A stall volunteer has no group, so there is now nothing
 * for them to enqueue - the route 403s it, and this stops offering a button that
 * could only fail. In practice a stall volunteer never saw these anyway: their
 * dashboard is StallVolunteerView, which renders its own single toggle and never
 * mounts StallCard at all.
 *
 * S72B (Section A5): claim/release stay role-gated to 'stall'. The server 403s
 * them for leads (see /api/bootstrap/stalls/[id]).
 *
 * Note the free-stall case: a lead whose group is queued at a stall that just
 * went FREE still gets LEAVE QUEUE, because S73B stopped release from clearing
 * the queue. That row surviving is what makes the "head over" banner possible,
 * and the lead needs a way to stand down once their group has been.
 */
function volunteerButtons(
  stall: BootstrapStall,
  username: string,
  role: "stall" | "lead",
  myGroupId: string | null
): { label: string; action: VolunteerStallAction; kind: keyof typeof BTN_KINDS }[] {
  const claimed = stall.claimed_by ?? [];
  const mine = claimed.includes(username);
  const mayClaim = role === "stall";
  const iAmQueued = myGroupId
    ? (stall.queue ?? []).some((e) => e.group_id === myGroupId)
    : false;
  const somebodyHere = claimed.length > 0;

  const buttons: ReturnType<typeof volunteerButtons> = [];

  if (mayClaim) {
    if (!somebodyHere) {
      buttons.push({ label: "Claim", action: "claim", kind: "accent" });
    } else if (mine) {
      buttons.push({ label: "Release", action: "release", kind: "danger" });
    } else if (claimed.length < stall.max_occupancy) {
      // shared-stall entry point (session 22) - kept alongside the new rules
      buttons.push({ label: "Join", action: "claim", kind: "accent-outline" });
    }
    // stall volunteers get no queue buttons at all, by construction
    return buttons;
  }

  // role 'lead' from here down
  if (iAmQueued) {
    buttons.push({ label: "Leave queue", action: "unqueue", kind: "neutral" });
  } else if (somebodyHere) {
    buttons.push({ label: "Mark queued", action: "mark_queued", kind: "queued" });
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
  role = "stall",
  myGroupId = null,
  onAction,
  expanded,
  onToggle,
  actions,
}: {
  stall: BootstrapStall;
  username?: string;
  // S72B: decides which actions are offered. Defaults to "stall" so the admin
  // mode (which passes neither username nor role) is unaffected.
  role?: "stall" | "lead";
  // S73B: the viewing lead's own group, resolved server-side and passed down
  // from the poll payload. Null for stall volunteers and for the admin view,
  // both of which get no queue buttons anyway.
  myGroupId?: string | null;
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
        {/* S73C: which GROUPS are at the stall, as opposed to which volunteers
            are manning it. A lead deciding where to walk needs this more than
            claimed_by, which is why it renders even though the line above
            already says the stall is busy. */}
        {(stall.occupants ?? []).length > 0 && (
          <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: BS.occupied }}>
            Here now: {(stall.occupants ?? []).map((o) => o.group_name).join(", ")}
          </div>
        )}
        {/* S73B: the whole queue, not one name. Gated on the array rather than on
            status, because a FREE stall can now have groups still waiting - that
            is the release fix, and hiding the list there would hide exactly the
            case the volunteer needs to see. Rendered in queued_at order as a
            HINT only: no position numbers, because the waiting set is unordered
            and an ordinal would promise a turn nobody is enforcing. */}
        {(stall.queue ?? []).length > 0 && (
          <div style={{ marginTop: "0.35rem", fontSize: "0.8rem", color: BS.queued }}>
            {(stall.queue ?? []).map((entry) => {
              const mins = waitMinutes(entry.queued_at);
              return (
                <div key={entry.group_id} style={{ marginTop: "0.15rem" }}>
                  Waiting: {entry.group_name}
                  {entry.lead_name ? ` (${entry.lead_name})` : ""}
                  <span
                    style={{
                      marginLeft: "0.4rem",
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "0.7rem",
                      // yellow past 20 min - visual urgency signal
                      color: mins > 20 ? BS.queued : BS.muted,
                    }}
                  >
                    ({mins} min)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {username &&
        onAction &&
        (() => {
          // A lead on a free stall now has no actions at all, so skip the
          // wrapper entirely rather than leaving an empty 14px gap under the card.
          const buttons = volunteerButtons(stall, username, role, myGroupId);
          if (buttons.length === 0) return null;
          return (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" }}
            >
              {buttons.map((btn) => (
                <button
                  key={btn.action}
                  style={BTN_KINDS[btn.kind]}
                  onClick={() => onAction(btn.action)}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          );
        })()}

      {adminMode && expanded && actions && (
        <div style={{ marginTop: "14px", borderTop: `1px solid ${BS.border}`, paddingTop: "14px" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
