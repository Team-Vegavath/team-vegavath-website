"use client";

import { useState, useEffect } from "react";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import CursorToggle from "./CursorToggle";

/* S61: SmoothCursor replaces RacingCursor here. RacingCursor.tsx is left in the
   tree on purpose -- this is a draft-branch swap, and reverting should be a
   two-line import change, not a file restore.
   RacingCursor took `enabled` as a prop and stayed mounted; SmoothCursor has no
   such prop, so the gate is a conditional mount. That is also what restores the
   real cursor: SmoothCursor's effect cleanup clears `body.style.cursor`, which
   only fires on unmount. */

export function CursorControls() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Touch devices are handled in CSS (@media (pointer: coarse) in globals.css)
  // to avoid the one-frame hydration flash JS detection had.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard + localStorage read, mount-only
    setMounted(true);
    try {
      const stored = localStorage.getItem("racing-cursor");
      setEnabled(stored !== null ? JSON.parse(stored) : false);
    } catch {
      setEnabled(false);
    }
  }, []);

  if (!mounted) return null;

  const handleToggle = (val: boolean) => {
    setEnabled(val);
    try {
      localStorage.setItem("racing-cursor", JSON.stringify(val));
    } catch {}
  };

  return (
    <>
      {enabled && <SmoothCursor />}
      <CursorToggle enabled={enabled} onToggle={handleToggle} />
    </>
  );
}
