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
  // S73C - groupId names which group arrived or left. Omitted for the
  // "unlisted group" escape and for releasing a stall with no group logged.
  onAction: (stallId: string, action: VolunteerStallAction, groupId?: string) => void;
  onRequestSwitch: (stallId: string) => void;
  onSignOut: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // S73C - the mandatory group picker. "arrive" lists groups that have not been
  // here yet (fetched); "leave" lists the ones currently here (already on the
  // stall row, so no fetch).
  const [groupMode, setGroupMode] = useState<"arrive" | "leave" | null>(null);
  const [candidates, setCandidates] = useState<
    { id: string; name: string; is_queued: boolean }[]
  >([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

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

  // S73C: groups AT the stall now. Distinct from iAmOnIt, which is about the
  // VOLUNTEER being on it - a stall claimed through the unlisted-group escape has
  // a claim and no occupants, which is a legitimate state.
  const occupants = myStall?.occupants ?? [];
  const hasRoom = myStall ? occupants.length < myStall.max_groups : false;

  async function openArrivePicker(stallId: string) {
    setGroupMode("arrive");
    setLoadingGroups(true);
    setCandidates([]);
    try {
      const res = await fetch(`/api/bootstrap/stalls/${stallId}/groups`);
      const data = res.ok ? await res.json() : null;
      setCandidates(data?.groups ?? []);
    } catch {
      setCandidates([]);
    } finally {
      setLoadingGroups(false);
    }
  }

  function chooseGroup(stallId: string, action: VolunteerStallAction, groupId?: string) {
    setGroupMode(null);
    onAction(stallId, action, groupId);
  }

  // the full-width action button this view has always used, now shared by the
  // two or three controls that replaced the single toggle
  const actionBtn: React.CSSProperties = {
    minHeight: "56px",
    width: "100%",
    fontFamily: "var(--font-chakra), sans-serif",
    fontWeight: 700,
    fontSize: "1rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderRadius: "10px",
    cursor: "pointer",
  };
  const dangerBtn: React.CSSProperties = {
    ...actionBtn,
    background: `${BS.danger}14`,
    color: BS.danger,
    border: `1px solid ${BS.danger}`,
  };

  // shared look for a row in either picker
  const groupTileStyle: React.CSSProperties = {
    width: "100%",
    minHeight: "56px",
    marginTop: "8px",
    padding: "12px 16px",
    background: BS.surface,
    border: `1px solid ${BS.border}`,
    borderRadius: "10px",
    color: BS.text,
    fontFamily: "var(--font-chakra), sans-serif",
    fontWeight: 700,
    fontSize: "1rem",
    letterSpacing: "0.04em",
    textAlign: "left",
    cursor: "pointer",
  };

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
              {/* S73C: who is actually here. The status pill above is about the
                  stall; this is about the groups, and on a max_groups > 1 stall
                  they are genuinely different facts. */}
              {occupants.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "0.75rem",
                    letterSpacing: "0.06em",
                    color: BS.muted,
                  }}
                >
                  HERE NOW: {occupants.map((o) => o.group_name).join(", ")}
                </div>
              )}

              {/* S73C (F2): the single claim/release toggle is gone. Occupying is
                  now "which group arrived", because an occupancy with no group
                  named records nothing and the visit table is what the whole
                  checklist is built on. */}
              {groupMode === "arrive" ? (
                <div style={{ marginTop: "20px" }}>
                  <p
                    style={{
                      fontFamily: "var(--font-chakra), sans-serif",
                      fontSize: "0.95rem",
                      color: BS.muted,
                      margin: 0,
                    }}
                  >
                    Which group just arrived?
                  </p>
                  {loadingGroups ? (
                    <p style={{ marginTop: "12px", color: BS.muted, fontSize: "0.9rem" }}>
                      Loading groups...
                    </p>
                  ) : candidates.length > 0 ? (
                    candidates.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => chooseGroup(myStall.id, "claim", g.id)}
                        style={groupTileStyle}
                      >
                        {g.name}
                        {/* queued groups sort first; the tag says why, without
                            implying a turn order the queue does not enforce */}
                        {g.is_queued && (
                          <span
                            style={{
                              marginLeft: "0.5rem",
                              fontFamily: "var(--font-mono), monospace",
                              fontSize: "0.7rem",
                              letterSpacing: "0.08em",
                              color: BS.queued,
                            }}
                          >
                            WAITING
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    /* S73C: the empty-picker escape. Every group in the session
                       has already been through this stall, so the mandatory
                       naming has nobody left to name. Occupy without a group -
                       no visit row is written, so the revisit ban stays intact
                       and nobody gets a second visit logged. */
                    <>
                      <p
                        style={{
                          marginTop: "12px",
                          fontSize: "0.9rem",
                          color: BS.muted,
                          lineHeight: 1.6,
                        }}
                      >
                        Every group has already been here. You can still mark the
                        stall occupied, but the visit will not be recorded.
                      </p>
                      <button
                        onClick={() => chooseGroup(myStall.id, "claim")}
                        style={groupTileStyle}
                      >
                        Mark occupied (group not listed)
                      </button>
                    </>
                  )}
                  <button onClick={() => setGroupMode(null)} style={textLink}>
                    Cancel
                  </button>
                </div>
              ) : groupMode === "leave" ? (
                <div style={{ marginTop: "20px" }}>
                  <p
                    style={{
                      fontFamily: "var(--font-chakra), sans-serif",
                      fontSize: "0.95rem",
                      color: BS.muted,
                      margin: 0,
                    }}
                  >
                    Which group is leaving?
                  </p>
                  {occupants.map((o) => (
                    <button
                      key={o.group_id}
                      onClick={() => chooseGroup(myStall.id, "release", o.group_id)}
                      style={groupTileStyle}
                    >
                      {o.group_name}
                    </button>
                  ))}
                  <button onClick={() => setGroupMode(null)} style={textLink}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {hasRoom && (
                    <button
                      onClick={() => void openArrivePicker(myStall.id)}
                      style={{ ...actionBtn, background: BS.accent, color: "#ffffff", border: "none" }}
                    >
                      Group arrived
                    </button>
                  )}
                  {/* G2: per-group release ONLY when more than one group is here.
                      One group keeps the single unambiguous tap it has always
                      had - the picker would be a modal over a list of one. */}
                  {occupants.length === 1 && (
                    <button
                      onClick={() => onAction(myStall.id, "release", occupants[0]!.group_id)}
                      style={dangerBtn}
                    >
                      Group left
                    </button>
                  )}
                  {occupants.length > 1 && (
                    <button onClick={() => setGroupMode("leave")} style={dangerBtn}>
                      Group left
                    </button>
                  )}
                  {/* No groups logged but still holding the stall - the unlisted
                      group escape, or a leftover claim. "Release" is the honest
                      label: it only removes this volunteer. */}
                  {occupants.length === 0 && iAmOnIt && (
                    <button onClick={() => onAction(myStall.id, "release")} style={dangerBtn}>
                      Release
                    </button>
                  )}
                </div>
              )}
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
