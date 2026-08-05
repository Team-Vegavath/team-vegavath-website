"use client";

import { useState } from "react";

import type { BootstrapStall } from "@/lib/services/bootstrap";
import { BS, StallGrid, type VolunteerStallAction } from "./StallCard";

/**
 * Simplified UI for role="stall" volunteers (S32). They stand at ONE stall all
 * day - their assigned one - and toggle it OCCUPIED/FREE. No queue actions, no
 * map, no notifications: those belong to group leads. Data arrives via the
 * parent's 4s poll.
 *
 * S72C (Section B1) finished the lock-in S72B started. There is no longer a
 * picker over every stall anywhere in this component: an assigned volunteer sees
 * only their own stall's card, and an unassigned one sees a dead end telling them
 * to find an admin. The one remaining multi-stall list is the switch-request
 * picker, which chooses what to ASK for and controls nothing directly.
 */
export default function StallVolunteerView({
  displayName,
  username,
  stalls,
  assignedStallId,
  switchRequestStallName,
  hasSwitchRequest,
  actionError,
  connectionIssue,
  liveLabel,
  onAction,
  onRequestSwitch,
  onSignOut,
}: {
  displayName: string;
  username: string;
  stalls: BootstrapStall[];
  // S72B - suggested_stall_id, i.e. the stall this volunteer picked at
  // registration or was moved to by an admin. Null means genuinely unassigned
  // (an unmatched pre-registration pool member, or someone whose stall was
  // deleted). The server 403s claim/release on any other stall when this is set.
  assignedStallId: string | null;
  // S72C - the pending switch request. hasSwitchRequest is driven by the stall
  // id, never the timestamp: migration 025's FK nulls the id alone when the
  // target stall is deleted, so switch_requested_at can outlive a dead request.
  switchRequestStallName: string | null;
  hasSwitchRequest: boolean;
  actionError: string | null;
  connectionIssue: boolean;
  liveLabel: string;
  onAction: (stallId: string, action: VolunteerStallAction) => void;
  onRequestSwitch: (stallId: string) => void;
  onSignOut: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Derived, not state. S72B had to seed a myStallId useState from assignedStallId
  // and then hide "Switch stall" because the effect re-seeded it one render after
  // the button cleared it. With the picker gone there is nothing left that sets
  // "my stall" locally, so the state, the effect and its eslint-disable all go:
  // the server owns which stall is mine. An active claim still wins over the
  // assignment, so a volunteer standing at a different stall sees the real one.
  const claimedStall = stalls.find((s) => (s.claimed_by ?? []).includes(username));
  const myStall =
    claimedStall ?? (assignedStallId ? stalls.find((s) => s.id === assignedStallId) : null) ?? null;
  const iAmOnIt = myStall ? (myStall.claimed_by ?? []).includes(username) : false;

  // Requesting a switch needs a real assignment to switch AWAY from - the service
  // enforces that too (suggested_stall_id IS NOT NULL), so offering it without one
  // would only ever 400.
  const canRequestSwitch = assignedStallId !== null;
  const otherStalls = stalls.filter((s) => s.id !== myStall?.id);

  const headerBtn: React.CSSProperties = {
    minHeight: "48px",
    padding: "0 14px",
    background: "transparent",
    border: `1px solid ${BS.borderStrong}`,
    borderRadius: "8px",
    color: BS.text,
    fontFamily: "var(--font-chakra), sans-serif",
    fontWeight: 700,
    fontSize: "0.8rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
  };

  // the underlined-muted treatment the removed "Switch stall" link used; shared
  // by "Request switch" and the picker's "Cancel" so they read as one control
  const textLink: React.CSSProperties = {
    marginTop: "16px",
    background: "none",
    border: "none",
    color: BS.muted,
    fontFamily: "var(--font-mono), monospace",
    fontSize: "0.8rem",
    letterSpacing: "0.06em",
    textDecoration: "underline",
    cursor: "pointer",
    padding: "8px 0",
  };

  return (
    <div style={{ minHeight: "100svh", background: BS.bg, color: BS.text }}>
      <style>{`
        @keyframes bs-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
      `}</style>

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "0 16px",
          background: BS.bg,
          borderBottom: `1px solid ${BS.border}`,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-chakra), sans-serif",
            fontWeight: 700,
            fontSize: "1.125rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {displayName}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.875rem",
              color: BS.muted,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                background: connectionIssue ? BS.danger : BS.free,
                animation: "bs-pulse 2s ease-in-out infinite",
              }}
            />
            {liveLabel}
          </span>
          <button onClick={onSignOut} style={headerBtn}>
            Sign out
          </button>
        </span>
      </header>

      {connectionIssue && (
        <div
          style={{
            position: "sticky",
            top: "64px",
            zIndex: 9,
            background: BS.danger,
            color: "#ffffff",
            fontFamily: "var(--font-chakra), sans-serif",
            fontWeight: 700,
            fontSize: "0.875rem",
            letterSpacing: "0.08em",
            textAlign: "center",
            padding: "12px 16px",
          }}
        >
          CONNECTION ISSUES - RETRYING...
        </div>
      )}

      {/* S72B - a rejected action explains itself rather than doing nothing. */}
      {actionError && (
        <div
          style={{
            position: "sticky",
            top: "64px",
            zIndex: 9,
            background: BS.elevated,
            borderBottom: `1px solid ${BS.danger}`,
            color: BS.danger,
            fontFamily: "var(--font-chakra), sans-serif",
            fontWeight: 700,
            fontSize: "0.85rem",
            letterSpacing: "0.04em",
            textAlign: "center",
            padding: "12px 16px",
          }}
        >
          {actionError}
        </div>
      )}

      <main className="mx-auto" style={{ maxWidth: "36rem", padding: "24px 16px 48px" }}>
        {myStall ? (
          <>
            <div
              style={{
                background: BS.surface,
                border: `1px solid ${BS.border}`,
                borderRadius: "12px",
                padding: "24px 20px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-chakra), sans-serif",
                  fontWeight: 700,
                  fontSize: "1.5rem",
                  textTransform: "uppercase",
                  lineHeight: 1.2,
                }}
              >
                {myStall.stall_name}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginTop: "12px",
                  fontFamily: "var(--font-chakra), sans-serif",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  letterSpacing: "0.08em",
                  color: myStall.status === "free" ? BS.free : BS.occupied,
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    background: myStall.status === "free" ? BS.free : BS.occupied,
                  }}
                />
                {myStall.status === "free" ? "FREE" : "OCCUPIED"}
              </div>
              <button
                onClick={() => onAction(myStall.id, iAmOnIt ? "release" : "claim")}
                style={{
                  marginTop: "20px",
                  minHeight: "56px",
                  width: "100%",
                  fontFamily: "var(--font-chakra), sans-serif",
                  fontWeight: 700,
                  fontSize: "1rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  borderRadius: "10px",
                  cursor: "pointer",
                  background: iAmOnIt ? `${BS.danger}14` : BS.accent,
                  color: iAmOnIt ? BS.danger : "#ffffff",
                  border: iAmOnIt ? `1px solid ${BS.danger}` : "none",
                }}
              >
                {/* S72C (Section D3): was "Mark free". "Release" and "Mark free"
                    were the same action under two labels (this file vs StallCard),
                    and "Mark free" over-promises - release only removes the caller
                    from claimed_by, so the stall stays OCCUPIED if anyone else is
                    still on it. "Release" is the one that is always true. */}
                {iAmOnIt ? "Release" : "Mark occupied"}
              </button>
            </div>

            {/* S72C (Section B3): the sanctioned replacement for S72B's removed
                "Switch stall" self-serve button. The volunteer asks, an admin
                approves. Requires an assignment to switch away from. */}
            {canRequestSwitch &&
              (hasSwitchRequest ? (
                // same accent-tint block the lead dashboard's classroom-mode
                // banner uses - "this state is active, actions paused" is exactly
                // what it signals there too
                <div
                  style={{
                    marginTop: "16px",
                    background: `${BS.accent}14`,
                    border: `1px solid ${BS.accent}`,
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "12px",
                    letterSpacing: "0.08em",
                    color: BS.accent,
                    textAlign: "center",
                    lineHeight: 1.6,
                  }}
                >
                  SWITCH REQUEST PENDING
                  {switchRequestStallName ? ` -- ${switchRequestStallName}` : ""}
                  <br />
                  WAITING FOR AN ADMIN TO APPROVE
                </div>
              ) : pickerOpen ? (
                <div style={{ marginTop: "20px" }}>
                  <p
                    style={{
                      fontFamily: "var(--font-chakra), sans-serif",
                      fontSize: "0.95rem",
                      color: BS.muted,
                      margin: "0 0 12px",
                    }}
                  >
                    Which stall do you want to move to? An admin has to approve it.
                  </p>
                  <StallGrid>
                    {otherStalls.map((stall) => (
                      <button
                        key={stall.id}
                        onClick={() => {
                          setPickerOpen(false);
                          onRequestSwitch(stall.id);
                        }}
                        style={{
                          background: BS.surface,
                          border: `1px solid ${BS.border}`,
                          borderRadius: "12px",
                          padding: "16px",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--font-chakra), sans-serif",
                            fontWeight: 700,
                            fontSize: "1.1rem",
                            textTransform: "uppercase",
                            color: BS.text,
                          }}
                        >
                          {stall.stall_name}
                        </div>
                        <div
                          style={{
                            marginTop: "6px",
                            fontFamily: "var(--font-mono), monospace",
                            fontSize: "0.75rem",
                            letterSpacing: "0.08em",
                            color: stall.status === "free" ? BS.free : BS.occupied,
                          }}
                        >
                          {stall.status === "free" ? "FREE" : "OCCUPIED"}
                        </div>
                      </button>
                    ))}
                  </StallGrid>
                  <button onClick={() => setPickerOpen(false)} style={textLink}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setPickerOpen(true)} style={textLink}>
                  Request switch
                </button>
              ))}
          </>
        ) : (
          /* S72C (Section B1): this used to be a picker over EVERY stall in the
             session, with per-stall dimming that S72B added and that was already
             dead code - the branch is only reachable with no assignment, so
             `assignedStallId === null` was always true and every stall always
             tappable. Offering it also meant an unassigned volunteer's first tap
             wrote status='occupied' on a stall that was not theirs, which is the
             exact write Section G existed to remove.
             A dead end is the honest state: there is nothing they can correctly
             do here, and the fix is an admin using MOVE STALL. */
          <div
            style={{
              background: BS.surface,
              border: `1px solid ${BS.border}`,
              borderRadius: "12px",
              padding: "24px 20px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontWeight: 700,
                fontSize: "1.25rem",
                textTransform: "uppercase",
                lineHeight: 1.2,
              }}
            >
              No stall assigned
            </div>
            <p
              style={{
                marginTop: "12px",
                marginBottom: 0,
                fontFamily: "var(--font-chakra), sans-serif",
                fontSize: "0.95rem",
                color: BS.muted,
                lineHeight: 1.6,
              }}
            >
              You have not been assigned a stall yet. Ask an admin to assign you
              one -- your dashboard will show it here within a few seconds.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
