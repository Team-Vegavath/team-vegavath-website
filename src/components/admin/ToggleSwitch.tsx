"use client";

interface ToggleSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  /** Accessible name for the control, e.g. "Registration open". */
  ariaLabel: string;
}

/**
 * Sharp sliding toggle. S66 replaced the ON/OFF button pair: a real checkbox is
 * now the only state, and the thumb slides on :checked in CSS, so the control
 * can never disagree with the input it reports. The .sr-only input keeps it
 * keyboard- and screen-reader-usable (focus ring is drawn on the track).
 */
export default function ToggleSwitch({ value, onChange, ariaLabel }: ToggleSwitchProps) {
  return (
    <label className="admin-toggle">
      <input
        type="checkbox"
        className="sr-only"
        checked={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="admin-toggle-track" aria-hidden="true">
        <span className="admin-toggle-thumb" />
      </span>
    </label>
  );
}
