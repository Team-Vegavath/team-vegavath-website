"use client";

import { useEffect, useRef, useState } from "react";

export function RacingCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isTouch, setIsTouch] = useState(true);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
    setEnabled(localStorage.getItem("racing-cursor") !== "false");
  }, []);

  useEffect(() => {
    if (!mounted || isTouch || !enabled) return;

    const cursor = cursorRef.current;
    const trail = trailRef.current;
    if (!cursor || !trail) return;

    let trailX = 0;
    let trailY = 0;
    let curX = 0;
    let curY = 0;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      curX = e.clientX;
      curY = e.clientY;
      cursor.style.transform = `translate(${curX}px, ${curY}px)`;
    };

    const animate = () => {
      trailX += (curX - trailX) * 0.15;
      trailY += (curY - trailY) * 0.15;
      trail.style.transform = `translate(${trailX}px, ${trailY}px)`;
      rafId = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(animate);
    document.body.style.cursor = "none";

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
      document.body.style.cursor = "";
    };
  }, [mounted, isTouch, enabled]);

  if (!mounted || isTouch) return null;

  return (
    <>
      <div
        ref={cursorRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] -translate-x-1/2 -translate-y-1/2"
        style={{ display: enabled ? "block" : "none" }}
      >
        <div className="h-3 w-3 rounded-full bg-orange-500" />
      </div>

      <div
        ref={trailRef}
        className="pointer-events-none fixed left-0 top-0 z-[9998] -translate-x-1/2 -translate-y-1/2"
        style={{ display: enabled ? "block" : "none" }}
      >
        <div className="h-6 w-6 rounded-full border border-orange-500 opacity-50" />
      </div>
    </>
  );
}