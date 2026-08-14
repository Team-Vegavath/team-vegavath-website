"use client";

/**
 * S73B: the 1/2/3 segmented number tiles, extracted.
 *
 * There were two byte-for-byte copies of this (session creation and the admin
 * add-stall row, both for max_occupancy) differing only in their state variable
 * and 0.05rem of padding. Section C adds max_groups to BOTH of those forms, which
 * would have made four copies of the same 20 lines - past the point where copying
 * is the cheaper option.
 *
 * Deliberately NOT used for the live max_groups override in the stall table: that
 * one accepts 1-10, and ten tiles is a worse control than a number input.
 */
export default function SegmentedCount({
  value,
  onChange,
  max = 3,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  /** How many tiles. The setup forms use the default 3. */
  max?: number;
  /** Screen-reader name for the group; the tiles themselves are bare digits. */
  label: string;
}) {
  return (
    <div style={{ display: "flex" }} role="group" aria-label={label}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          style={{
            width: "2.4rem",
            padding: "0.5rem 0",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.8rem",
            cursor: "pointer",
            background: value === n ? "var(--accent)" : "transparent",
            color: value === n ? "var(--bg-base)" : "var(--text-primary)",
            border: "1px solid var(--border)",
            // one shared seam between adjacent tiles, so the group reads as a
            // single segmented control rather than three buttons
            borderLeft: n === 1 ? "1px solid var(--border)" : "none",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
