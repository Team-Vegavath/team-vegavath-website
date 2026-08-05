"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { BootstrapStall } from "@/lib/services/bootstrap";
import BootstrapMapSVG from "./BootstrapMapSVG";
import CheckinQROverlay from "./CheckinQROverlay";
import StallCard, { BS, StallGrid, type VolunteerStallAction } from "./StallCard";
import StallVolunteerView from "./StallVolunteerView";

const POLL_MS = 4000;
const TOP_BAR_H = 64;

export default function BootstrapDashboard({
  displayName,
  username,
  initialRole = "stall",
}: {
  displayName: string;
  username: string;
  initialRole?: "stall" | "lead";
}) {
  const [stalls, setStalls] = useState<BootstrapStall[]>([]);
  const [mySuggestion, setMySuggestion] = useState<string | null>(null);
  // S72B - the assigned stall's id. The server enforces the ownership gate on
  // claim/release regardless; this is what lets the UI avoid offering a tap that
  // would only come back 403.
  const [mySuggestionId, setMySuggestionId] = useState<string | null>(null);
  // S72B - last rejected action, shown briefly. A silent 403 reads as a broken
  // app at a stall; these are permission answers and should say so.
  const [actionError, setActionError] = useState<string | null>(null);
  // server-rendered role avoids flashing the wrong view until the first poll;
  // the poll keeps it live so an admin role flip lands within 4s
  const [volunteerRole, setVolunteerRole] = useState<"stall" | "lead">(initialRole);
  // S33 - the lead's stable QR check-in token (rides the poll payload);
  // origin is set after mount because window doesn't exist during SSR
  const [checkinToken, setCheckinToken] = useState<string | null>(null);
  // S35 - group number, assigned FCFS once the session is active
  const [groupNumber, setGroupNumber] = useState<number | null>(null);
  // S36 - lead classroom mode: rides the poll payload so it survives re-login
  // and stays in sync if an admin ever flips it server-side
  const [inClassroom, setInClassroom] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const [showMap, setShowMap] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const failCount = useRef(0);
  const [connectionIssue, setConnectionIssue] = useState(false);

  // previous poll snapshot - freed-stall detection reads queued_by from here,
  // because release clears queued_by in the DB (the NEW row is always null)
  const prevStallsRef = useRef<BootstrapStall[]>([]);
  const [freedNotifications, setFreedNotifications] = useState<
    { id: string; name: string; forme: boolean }[]
  >([]);
  const [redirectSuggestions, setRedirectSuggestions] = useState<
    { id: string; name: string; dist: number }[]
  >([]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/bootstrap/stalls");
      if (res.status === 401) {
        // token cleared (admin unlock / session deactivated) - back to login
        window.location.href = "/bootstrap";
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const newStalls = data.stalls as BootstrapStall[];
      setStalls(newStalls);
      setMySuggestion(data.mySuggestion ?? null);
      setMySuggestionId(data.mySuggestionId ?? null);
      setVolunteerRole(data.volunteerRole ?? "stall");
      setCheckinToken(data.checkinToken ?? null);
      setGroupNumber(data.groupNumber ?? null);
      setInClassroom(data.inClassroom ?? false);
      setLastUpdated(Date.now());
      failCount.current = 0;
      setConnectionIssue(false);

      const prevStalls = prevStallsRef.current;
      const prevOf = (id: string) => prevStalls.find((p) => p.id === id);

      // 5a: any stall that just transitioned to free
      const justFreed = newStalls.filter((s) => {
        const prev = prevOf(s.id);
        return s.status === "free" && prev && prev.status !== "free";
      });

      if (justFreed.length > 0) {
        setFreedNotifications((prev) => [
          ...prev,
          ...justFreed.map((s) => ({
            id: s.id,
            name: s.stall_name,
            forme: prevOf(s.id)?.queued_by === username, // was I waiting on it?
          })),
        ]);
        setTimeout(() => {
          setFreedNotifications((prev) =>
            prev.filter((n) => !justFreed.find((j) => j.id === n.id))
          );
        }, 8000);
      }

      // 5b: redirect suggestions - stalls that freed with NO group waiting,
      // while I am queued somewhere else, ranked by map distance
      const genuinelyFreed = justFreed.filter((s) => prevOf(s.id)?.queued_by == null);
      const myQueuedStall = newStalls.find((s) => s.queued_by === username);

      // S36 - classroom mode suppresses redirect suggestions (read fresh from
      // the poll payload, not the possibly-stale state closure)
      if (!(data.inClassroom ?? false) && genuinelyFreed.length > 0 && myQueuedStall && myQueuedStall.map_x != null) {
        const ranked = genuinelyFreed
          .filter((s) => s.map_x != null && s.map_y != null)
          .map((s) => ({
            id: s.id,
            name: s.stall_name,
            // scale % deltas by the map's pixel dimensions (1024x419) so
            // distance is isotropic - raw % would overweight the y axis
            dist: Math.sqrt(
              Math.pow((s.map_x! - myQueuedStall.map_x!) * (1024 / 100), 2) +
                Math.pow((s.map_y! - myQueuedStall.map_y!) * (419 / 100), 2)
            ),
          }))
          .sort((a, b) => a.dist - b.dist);

        if (ranked.length > 0) {
          setRedirectSuggestions(ranked);
          // longer dismiss than 5a - this one asks for a decision
          setTimeout(() => setRedirectSuggestions([]), 12000);
        }
      }

      prevStallsRef.current = newStalls;
    } catch {
      failCount.current += 1;
      if (failCount.current >= 3) setConnectionIssue(true);
    }
  }, [username]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (intervalId === null) intervalId = setInterval(poll, POLL_MS);
    };
    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    poll();
    start();
    // pause while hidden - battery / Neon courtesy only, nothing depends on it
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        poll();
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  // 1s ticker so "LIVE · Xs ago" counts up
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function sendAction(stallId: string, action: VolunteerStallAction) {
    try {
      const res = await fetch(`/api/bootstrap/stalls/${stallId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.status === 401) {
        window.location.href = "/bootstrap";
        return;
      }
      if (res.ok) {
        const updated = (await res.json()) as BootstrapStall;
        setStalls((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        return;
      }
      // 403 from the S72B role/ownership gates, or 404 for a stall outside this
      // session. Surface the server's own message - it already explains why.
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setActionError(data?.error ?? "That action was not allowed.");
      setTimeout(() => setActionError(null), 5000);
    } catch {
      // next poll self-corrects
    }
  }

  async function signOut() {
    await fetch("/api/bootstrap/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/bootstrap";
  }

  const secondsAgo = lastUpdated ? Math.max(0, Math.round((now - lastUpdated) / 1000)) : null;

  // S32 role split - stall volunteers get the simple occupied/free toggle:
  // no MAP button, no queue, no freed/redirect notifications (lead-only).
  if (volunteerRole === "stall") {
    return (
      <StallVolunteerView
        displayName={displayName}
        username={username}
        stalls={stalls}
        assignedStallId={mySuggestionId}
        actionError={actionError}
        connectionIssue={connectionIssue}
        liveLabel={secondsAgo !== null ? `LIVE · ${secondsAgo}s ago` : "CONNECTING…"}
        onAction={(stallId, action) => void sendAction(stallId, action)}
        onSignOut={() => void signOut()}
      />
    );
  }

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
          height: `${TOP_BAR_H}px`,
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
              color: secondsAgo !== null ? BS.text : BS.muted,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "999px",
                background: connectionIssue ? BS.danger : BS.free,
                animation: "bs-pulse 2s ease-in-out infinite",
              }}
            />
            {secondsAgo !== null ? `LIVE · ${secondsAgo}s ago` : "CONNECTING…"}
          </span>
          {/* S36 - classroom mode: pause redirect suggestions + queue actions
              while a lead runs a classroom session */}
          <button
            onClick={async () => {
              const next = !inClassroom;
              setInClassroom(next);
              await fetch("/api/bootstrap/classroom", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ in_classroom: next }),
              }).catch(() => {});
            }}
            style={{
              minHeight: "48px",
              padding: "0 14px",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              background: inClassroom ? `${BS.accent}1f` : "transparent",
              border: `1px solid ${inClassroom ? BS.accent : BS.borderStrong}`,
              borderRadius: "8px",
              color: inClassroom ? BS.accent : BS.muted,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {inClassroom ? "IN CLASSROOM" : "CLASSROOM MODE"}
          </button>
          {/* SVG map is hardcoded, so the button no longer depends on a URL */}
          <button
            onClick={() => setShowMap(true)}
            style={{
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
            }}
          >
            Map
          </button>
          <button
            onClick={signOut}
            style={{
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
              transition: "border-color 150ms",
            }}
          >
            Sign out
          </button>
        </span>
      </header>

      {connectionIssue && (
        <div
          style={{
            position: "sticky",
            top: `${TOP_BAR_H}px`,
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

      {/* S72B - a rejected action (role or ownership gate) says why. Same sticky
          treatment as the connection banner so it cannot be missed on a phone. */}
      {actionError && (
        <div
          style={{
            position: "sticky",
            top: `${TOP_BAR_H}px`,
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

      <main className="mx-auto" style={{ maxWidth: "56rem", padding: "16px 16px 48px" }}>
        {/* S35 - the lead's group assignment, handed out FCFS at registration
            once the session is active */}
        <div
          style={{
            background: BS.surface,
            border: `1px solid ${BS.border}`,
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "baseline",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: BS.muted,
            }}
          >
            Your group
          </span>
          <span
            style={{
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 700,
              fontSize: "1.125rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: groupNumber ? BS.text : BS.muted,
            }}
          >
            {groupNumber ? `Group ${groupNumber}` : "Not assigned yet"}
          </span>
        </div>

        {/* S33 - each group lead carries their own check-in link; the token is
            stable (migration 015), so a printed/QR'd URL survives re-logins */}
        {checkinToken && (
          <div
            style={{
              background: BS.surface,
              border: `1px solid ${BS.border}`,
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: BS.muted,
                marginBottom: "8px",
              }}
            >
              Your group check-in link
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "12px",
                color: BS.muted,
                marginBottom: "10px",
              }}
            >
              Students scan this QR to register into your group.
            </div>
            <CheckinQROverlay checkinUrl={`${origin}/bootstrap/checkin/${checkinToken}`} />
          </div>
        )}

        {freedNotifications.map((n) => (
          <div
            key={n.id}
            style={{
              background: n.forme ? BS.occupied : BS.surface,
              border: `1px solid ${n.forme ? BS.occupied : BS.border}`,
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-chakra), sans-serif",
                fontSize: "15px",
                color: n.forme ? "#000" : BS.text,
              }}
            >
              {n.forme
                ? `${n.name} IS FREE - YOUR GROUP CAN HEAD OVER`
                : `${n.name} just opened up`}
            </span>
            <button
              onClick={() => setFreedNotifications((p) => p.filter((x) => x.id !== n.id))}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: n.forme ? "#000" : BS.muted,
                fontSize: "18px",
              }}
            >
              ×
            </button>
          </div>
        ))}

        {redirectSuggestions.map((s, i) => (
          <div
            key={s.id}
            style={{
              background: i === 0 ? BS.elevated : BS.surface,
              border: `1px solid ${i === 0 ? BS.free : BS.border}`,
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-chakra), sans-serif",
                  fontSize: "14px",
                  color: BS.text,
                }}
              >
                {i === 0 ? `→ ${s.name} is free and nearby` : `${s.name} also just opened`}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "11px",
                  color: BS.muted,
                }}
              >
                No group allocated yet
              </div>
            </div>
            <button
              onClick={() => setRedirectSuggestions((p) => p.filter((x) => x.id !== s.id))}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: BS.muted,
                fontSize: "18px",
              }}
            >
              ×
            </button>
          </div>
        ))}

        {/* Admin suggestion - cleared server-side on dismiss, so the banner
            stays gone across polls and devices */}
        {mySuggestion && (
          <div
            style={{
              background: "rgba(56,189,248,0.12)",
              border: "1px solid rgba(56,189,248,0.4)",
              borderRadius: "8px",
              padding: "14px 16px",
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-chakra), sans-serif",
                  fontSize: "14px",
                  color: "#7dd3fc",
                  letterSpacing: "0.04em",
                }}
              >
                ADMIN SUGGESTS
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "16px",
                  color: BS.text,
                  marginTop: "4px",
                }}
              >
                {"-> "}
                {mySuggestion}
              </div>
            </div>
            <button
              onClick={async () => {
                await fetch(`/api/bootstrap/suggestion/dismiss`, { method: "POST" }).catch(
                  () => {}
                );
                setMySuggestion(null);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: BS.muted,
                fontSize: "20px",
              }}
            >
              ×
            </button>
          </div>
        )}

        {inClassroom && (
          <div
            style={{
              background: `${BS.accent}14`,
              border: `1px solid ${BS.accent}`,
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "12px",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "12px",
              letterSpacing: "0.08em",
              color: BS.accent,
              textAlign: "center",
            }}
          >
            CLASSROOM MODE ACTIVE -- QUEUE ACTIONS PAUSED
          </div>
        )}

        <StallGrid>
          {stalls.map((stall) => (
            <StallCard
              key={stall.id}
              stall={stall}
              // S36 - in classroom mode the cards go read-only (no onAction),
              // so no CLAIM/QUEUE buttons render while the lead runs a session
              username={inClassroom ? undefined : username}
              // S72B - this branch only renders for volunteerRole "lead" (the
              // "stall" case returned StallVolunteerView above), so the card
              // offers queue actions only. Passed explicitly rather than relying
              // on the default, which is "stall".
              role="lead"
              onAction={inClassroom ? undefined : (action) => sendAction(stall.id, action)}
            />
          ))}
        </StallGrid>
      </main>

      {/* Full-screen map overlay - hardcoded SVG schematic (session 26) */}
      {showMap && <BootstrapMapSVG stalls={stalls} onClose={() => setShowMap(false)} />}
    </div>
  );
}
