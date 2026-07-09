"use client";

interface ToggleSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  /** Accessible name for the control, e.g. "Registration open". */
  ariaLabel: string;
}

/**
 * Sharp segmented ON/OFF control; replaces the old pill slider divs.
 * Real <button>s so it's keyboard- and screen-reader-usable.
 */
export default function ToggleSwitch({ value, onChange, ariaLabel }: ToggleSwitchProps) {
  return (
    <div className="admin-toggle" role="group" aria-label={ariaLabel}>
      <button type="button" data-active={value} aria-pressed={value} onClick={() => onChange(true)}>
        ON
      </button>
      <button type="button" data-active={!value} aria-pressed={!value} onClick={() => onChange(false)}>
        OFF
      </button>
    </div>
  );
}
