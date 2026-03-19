"use client";

import { useEffect, useState } from "react";

export function CursorToggle() {
  const [mounted, setMounted] = useState(false);
  const [isTouch, setIsTouch] = useState(true);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
    setEnabled(localStorage.getItem("racing-cursor") !== "false");
  }, []);

  if (!mounted || isTouch) return null;

  const toggle = () => {
    localStorage.setItem("racing-cursor", String(!enabled));
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