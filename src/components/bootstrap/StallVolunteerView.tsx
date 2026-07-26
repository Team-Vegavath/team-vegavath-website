"use client";

import { useEffect, useState } from "react";

import type { BootstrapStall } from "@/lib/services/bootstrap";
import { BS, StallGrid, type VolunteerStallAction } from "./StallCard";

/**
 * Simplified UI for role="stall" volunteers (S32). They stand at one stall
 * all day: pick it once, then toggle OCCUPIED/FREE. No queue actions, no map,
 * no notifications - those belong to group leads. Reuses the existing
 * claim/release PATCH route; data arrives via the parent's 4s poll.
 */
export default function StallVolunteerView({
  displayName,
  username,
  stalls,
  connectionIssue,
  liveLabel,
  onAction,
  onSignOut,
}: {
  displayName: string;
  username: string;
  stalls: BootstrapStall[];
  connectionIssue: boolean;
  liveLabel: string;
  onAction: (stallId: string, action: VolunteerStallAction) => void;
  onSignOut: () => void;
}) {
  // "my stall" survives marking it FREE (release drops me from claimed_by,
  // so the DB alone can't remember which stall is mine while it sits free)
  const [myStallId, setMyStallId] = useState<string | null>(null);

  const claimedStall = stalls.find((s) => (s.claimed_by ?? []).includes(username));

  // re-sync after a reload while the stall was occupied by me
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local selection with server-derived claim
    if (claimedStall) setMyStallId(claimedStall.id);
  }, [claimedStall]);

  const myStall = stalls.find((s) => s.id === myStallId) ?? null;
  const iAmOnIt = myStall ? (myStall.claimed_by ?? []).includes(username) : false;

  function claim(stall: BootstrapStall) {
    setMyStallId(stall.id);
    onAction(stall.id, "claim");
  }

  function switchStall() {
    if (myStall && iAmOnIt) onAction(myStall.id, "release");
    setMyStallId(null);
  }

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
                {iAmOnIt ? "Mark free" : "Mark occupied"}
              </button>
            </div>
            <button
              onClick={switchStall}
              style={{
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
              }}
            >
              Switch stall
            </button>
          </>
        ) : (
          <>
            <p
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontSize: "1rem",
                color: BS.muted,
                margin: "0 0 16px",
              }}
            >
              Tap your stall to claim it.
            </p>
            <StallGrid>
              {stalls.map((stall) => {
                const claimed = stall.claimed_by ?? [];
                const joinable =
                  stall.status === "free" ||
                  (stall.status === "occupied" && claimed.length < stall.max_occupancy);
                return (
                  <button
                    key={stall.id}
                    onClick={() => joinable && claim(stall)}
                    disabled={!joinable}
                    style={{
                      background: BS.surface,
                      border: `1px solid ${BS.border}`,
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "left",
                      cursor: joinable ? "pointer" : "default",
                      opacity: joinable ? 1 : 0.45,
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
                      {stall.status === "free"
                        ? "FREE"
                        : `OCCUPIED${claimed.length ? ` · ${claimed.join(", ")}` : ""}`}
                    </div>
                  </button>
                );
              })}
            </StallGrid>
          </>
        )}
      </main>
    </div>
  );
}
