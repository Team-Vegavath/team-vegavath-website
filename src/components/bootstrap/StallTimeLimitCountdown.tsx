"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BS } from "./StallCard";

// S77: a short beep, inlined as a data URI so no binary lands in git (R2 is for
// assets, but a 3KB cue is not worth an upload + immutable-cache dance) and no
// dependency is added. Played through the dashboard's hidden <audio>, which is
// primed on the volunteer's first tap (see BootstrapDashboard, decision 6).
export const CHIME_SRC =
  "data:audio/wav;base64,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";

function fmt(totalSeconds: number): string {
  const s = Math.abs(totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * S77: the group lead's per-stall countdown. Renders ONLY for a lead with an open
 * visit at a stall that has a time limit (decision 3 -- stall volunteers never see
 * it). The parent keys this on arrived_at, so a move to a new stall remounts it and
 * the fired-reminder refs reset (decision 6 / D6).
 *
 * remainingSeconds is recomputed from Date.now() against the stored arrived_at on
 * EVERY tick and on every return-to-foreground -- never inferred from the interval's
 * tick count, which is exactly what breaks after iOS Safari pauses a backgrounded
 * tab (decision 4). The interval only asks for a re-render; the arithmetic is
 * always against the real clock. So the DISPLAY is always correct on return, even
 * though the one-shot chime that fired while the tab was hidden was missed.
 */
export default function StallTimeLimitCountdown({
  stallName,
  arrivedAt,
  timeLimitMinutes,
  playChime,
}: {
  stallName: string;
  arrivedAt: string;
  timeLimitMinutes: number;
  playChime: () => void;
}) {
  const arrivedMs = new Date(arrivedAt).getTime();
  const totalSec = timeLimitMinutes * 60;

  // one-shot reminder guards; reset on remount (new visit)
  const fired4 = useRef(false);
  const fired2 = useRef(false);
  // The live remaining seconds. Held in state and only ever written by check(),
  // which runs from the interval and on return-to-foreground -- never during
  // render, so Date.now() stays out of the render body (react purity rule). The
  // lazy initializer seeds the correct value once at mount (so a reload mid-visit
  // shows the right number immediately), after which the interval keeps it live.
  const [remaining, setRemaining] = useState(
    () => totalSec - Math.floor((Date.now() - arrivedMs) / 1000)
  );

  const check = useCallback(() => {
    const rem = totalSec - Math.floor((Date.now() - arrivedMs) / 1000);
    // Reminders only while the tab is actually in front (decision 4). A threshold
    // is marked fired the moment it is crossed even if hidden, so it never fires
    // stale on return; the chime only sounds if the crossing is still meaningful.
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      // skip the 4-min cue entirely on a timer that never had 4 minutes (decision 7)
      if (!fired4.current && totalSec > 240 && rem <= 240) {
        fired4.current = true;
        if (rem > 120) playChime();
      }
      if (!fired2.current && totalSec > 120 && rem <= 120) {
        fired2.current = true;
        if (rem > 0) playChime();
      }
    }
    setRemaining(rem);
  }, [arrivedMs, totalSec, playChime]);

  useEffect(() => {
    const id = setInterval(check, 1000);
    // visibilitychange + focus both recompute against the real clock, which is
    // what self-corrects the display after any background pause.
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, [check]);

  const over = remaining < 0;
  const warning = !over && remaining <= 240;

  const color = over || remaining <= 120 ? BS.danger : warning ? BS.occupied : BS.text;

  return (
    <div
      style={{
        background: over || warning ? `${color}14` : BS.surface,
        border: `1px solid ${over || warning ? color : BS.border}`,
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
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
        Time at {stallName}
      </span>
      <span
        aria-live="polite"
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontWeight: 700,
          fontSize: "1.5rem",
          letterSpacing: "0.04em",
          color,
          marginLeft: "auto",
        }}
      >
        {over ? `+${fmt(remaining)} OVER` : fmt(remaining)}
      </span>
      {(over || warning) && (
        <p
          style={{
            flexBasis: "100%",
            margin: 0,
            fontFamily: "var(--font-mono), monospace",
            fontSize: "12px",
            letterSpacing: "0.04em",
            color,
          }}
        >
          {over
            ? `TIME'S UP AT ${stallName} -- PLEASE MOVE THE GROUP ON`
            : `${Math.max(1, Math.ceil(remaining / 60))} MINUTE${
                Math.max(1, Math.ceil(remaining / 60)) === 1 ? "" : "S"
              } LEFT AT ${stallName} -- ASK THEM TO WRAP UP`}
        </p>
      )}
    </div>
  );
}
