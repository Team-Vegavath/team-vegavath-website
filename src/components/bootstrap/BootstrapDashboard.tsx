"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { BootstrapStall } from "@/lib/services/bootstrap";
import BootstrapMapSVG from "./BootstrapMapSVG";
import StallCard, { BS, StallGrid, type VolunteerStallAction } from "./StallCard";

const POLL_MS = 4000;
const TOP_BAR_H = 64;

export default function BootstrapDashboard({
  displayName,
  username,
}: {
  displayName: string;
  username: string;
}) {
  const [stalls, setStalls] = useState<BootstrapStall[]>([]);
  const [mySuggestion, setMySuggestion] = useState<string | null>(null);
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

      if (genuinelyFreed.length > 0 && myQueuedStall && myQueuedStall.map_x != null) {
        const ranked = genuinelyFreed
          .filter((s) => s.map_x != null && s.map_y != null)
          .map((s) => ({
            id: s.id,
            name: s.stall_name,
            dist: Math.sqrt(
              Math.pow(s.map_x! - myQueuedStall.map_x!, 2) +
                Math.pow(s.map_y! - myQueuedStall.map_y!, 2)
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
      }
    } catch {
      // next poll self-corrects
    }
  }

  async function signOut() {
    await fetch("/api/bootstrap/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/bootstrap";
  }

  const secondsAgo = lastUpdated ? Math.max(0, Math.round((now - lastUpdated) / 1000)) : null;

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

      <main style={{ maxWidth: "56rem", margin: "0 auto", padding: "16px 16px 48px" }}>
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

        <StallGrid>
          {stalls.map((stall) => (
            <StallCard
              key={stall.id}
              stall={stall}
              username={username}
              onAction={(action) => sendAction(stall.id, action)}
            />
          ))}
        </StallGrid>
      </main>

      {/* Full-screen map overlay - hardcoded SVG schematic (session 26) */}
      {showMap && <BootstrapMapSVG stalls={stalls} onClose={() => setShowMap(false)} />}
    </div>
  );
}
