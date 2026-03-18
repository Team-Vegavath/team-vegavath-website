"use client";

import { useEffect, useState } from "react";

export function CursorToggle() {
  const [enabled, setEnabled] = useState(false);
  const [isTouch, setIsTouch] = useState(true);

  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    setIsTouch(touch);
    if (touch) return;
    const pref = localStorage.getItem("racing-cursor");
    setEnabled(pref !== "false");
  }, []);

  if (isTouch) return null;

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("racing-cursor", String(next));
    window.location.reload();
  };

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur border border-gray-200 hover:border-orange-400 transition-colors"
    >
      <span
        className={`h-2 w-2 rounded-full ${enabled ? "bg-orange-500" : "bg-gray-300"}`}
      />
      Cursor
    </button>
  );
}