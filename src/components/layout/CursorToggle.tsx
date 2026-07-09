"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "racing-cursor";

interface CursorToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function CursorToggle({ enabled, onToggle }: CursorToggleProps) {
  const handleToggle = () => {
    const newState = !enabled;
    onToggle(newState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch {}
  };

  return (
    <div className="cursor-toggle-wrapper fixed bottom-5 right-5 z-[99999]">
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={enabled}
        aria-label={enabled ? "Disable racing cursor" : "Enable racing cursor"}
        className="flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EF5D08] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <span className="select-none text-xs font-medium text-gray-400">
          Cursor
        </span>
        <div
          className={`relative h-5 w-9 transition-all duration-300 ease-out ${
            enabled
              ? "bg-gradient-to-r from-[#EF5D08] to-[#F29C04] shadow-[0_0_12px_rgba(239,93,8,0.4)]"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 bg-white shadow-lg transition-all duration-300 ease-out ${
              enabled ? "left-[18px]" : "left-0.5"
            }`}
          />
        </div>
      </button>
    </div>
  );
}

export function useCursorPreference() {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setEnabled(JSON.parse(stored));
      }
    } catch {}
    setIsLoading(false);
  }, []);

  return { enabled, setEnabled, isLoading };
}