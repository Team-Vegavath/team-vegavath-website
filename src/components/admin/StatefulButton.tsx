"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export type ButtonState = "idle" | "loading" | "success" | "error";

interface StatefulButtonProps {
  children: ReactNode;
  /** Only used for type="button". Submit buttons are driven by the form's own handler. */
  onClick?: () => void | Promise<void>;
  /** Controlled state, derived from the form's existing saving/error/saved flags. */
  state?: ButtonState;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  type?: "button" | "submit";
}

/**
 * Save button that reports its own outcome: idle -> loading -> success/error.
 *
 * Deliberately composes .btn-primary rather than restating padding, font and
 * casing inline -- at rest it is byte-for-byte the button that shipped, so
 * swapping it into a form changes nothing visually until a save is in flight.
 * Only background/border are overridden, and only for success and error;
 * inline wins over .btn-primary:hover, so a finished save does not flash back
 * to accent under the cursor.
 */
export function StatefulButton({
  children,
  onClick,
  state: externalState,
  disabled,
  className = "btn-primary",
  style,
  type = "submit",
}: StatefulButtonProps) {
  const [internalState, setInternalState] = useState<ButtonState>("idle");
  const state = externalState ?? internalState;

  // Only meaningful for the uncontrolled (type="button") case. When state is
  // controlled the owner clears its own flag, so this write is a no-op.
  useEffect(() => {
    if (state !== "success" && state !== "error") return;
    const timer = setTimeout(() => setInternalState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  async function handleClick() {
    if (!onClick || state === "loading") return;
    setInternalState("loading");
    try {
      await onClick();
      setInternalState("success");
    } catch {
      setInternalState("error");
    }
  }

  const label = {
    idle: children,
    loading: "SAVING…",
    success: "SAVED ✓",
    error: "ERROR -- RETRY",
  }[state];

  const tone =
    state === "success" ? "var(--success)" : state === "error" ? "var(--error)" : undefined;

  return (
    <button
      type={type}
      disabled={disabled || state === "loading"}
      onClick={type === "button" ? handleClick : undefined}
      className={className}
      style={{
        ...(tone ? { backgroundColor: tone, borderColor: tone } : null),
        cursor: state === "loading" ? "not-allowed" : "pointer",
        opacity: state === "loading" ? 0.6 : 1,
        ...style,
      }}
    >
      {label}
    </button>
  );
}
