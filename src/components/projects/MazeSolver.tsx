"use client";

// S78: the interactive maze demo. One client tree: grid + controls + output. All
// solver logic is imported from the pure src/lib/maze/* modules; this file is only
// presentation + wiring to the useMazeSolver hook.

import { useEffect, useRef, useState } from "react";

import { type Direction } from "@/lib/maze/utils";
import MazeGrid from "./MazeGrid";
import { type Status, type SolveOutput, useMazeSolver } from "./useMazeSolver";

const HEADINGS: Direction[] = ["N", "E", "S", "W"];

const STATUS_META: Record<Status, { label: string; color: string }> = {
  ready: { label: "READY", color: "var(--text-muted)" },
  solving: { label: "SOLVING", color: "var(--accent)" },
  solved: { label: "SOLVED", color: "var(--success)" },
  "no-path": { label: "NO PATH", color: "var(--error)" },
};

// compact tile button (mode + heading selectors); the big .btn-* classes are for
// the primary actions.
const tile = (active: boolean): React.CSSProperties => ({
  minWidth: "3rem",
  minHeight: "2.75rem",
  padding: "0 0.75rem",
  fontFamily: "var(--font-mono), monospace",
  fontSize: "0.75rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  background: active ? "var(--accent)" : "transparent",
  color: active ? "var(--bg-base)" : "var(--text-primary)",
  border: `1px solid ${active ? "var(--accent)" : "var(--border-strong)"}`,
});

function buildCopyText(o: SolveOutput): string {
  const pathStr = o.path.map((c) => `(${c.x},${c.y})`).join(" -> ");
  return [
    "MAZE SOLVER -- Vega Vath Racing (8x8, BFS shortest path on the known map)",
    `Start: (${o.start.x}, ${o.start.y})`,
    `Goal: (${o.goal.x}, ${o.goal.y})`,
    `Start heading: ${o.startHeading}`,
    `Moves: ${o.moves}`,
    `Final heading: ${o.finalHeading}`,
    "",
    "Path (x, y):",
    pathStr,
    "",
    "Absolute directions:",
    o.directions.join(" ") || "(none -- start equals goal)",
    "",
    "Robot commands (F=forward, L=left, R=right, B=back):",
    o.commands.join(" ") || "(none -- start equals goal)",
    "",
  ].join("\n");
}

export default function MazeSolver() {
  const m = useMazeSolver();
  const interactive = m.status !== "solving";

  return (
    <div>
      {/* grid */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
        <MazeGrid
          start={m.start}
          goal={m.goal}
          visited={m.visited}
          pathCells={m.pathCells}
          robot={m.robot}
          onPick={m.pickCell}
          interactive={interactive}
        />
      </div>

      {/* selection: mode + read-only coords */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
        <button
          type="button"
          style={tile(m.selectMode === "start")}
          disabled={!interactive}
          onClick={() => m.setSelectMode("start")}
        >
          Set start
        </button>
        <button
          type="button"
          style={tile(m.selectMode === "goal")}
          disabled={!interactive}
          onClick={() => m.setSelectMode("goal")}
        >
          Set goal
        </button>
        <span className="mono" style={{ fontSize: "0.75rem", color: "var(--success)", letterSpacing: "0.06em" }}>
          START: ({m.start.x}, {m.start.y})
        </span>
        <span className="mono" style={{ fontSize: "0.75rem", color: "var(--gold)", letterSpacing: "0.06em" }}>
          GOAL: ({m.goal.x}, {m.goal.y})
        </span>
      </div>

      {/* heading selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "1.25rem" }}>
        <span className="mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginRight: "0.25rem" }}>
          Start heading
        </span>
        {HEADINGS.map((h) => (
          <button
            key={h}
            type="button"
            style={tile(m.startHeading === h)}
            disabled={!interactive}
            onClick={() => m.setStartHeading(h)}
          >
            {h}
          </button>
        ))}
      </div>

      {/* actions + status */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1.5rem" }}>
        <button
          type="button"
          className="btn-primary"
          style={{ padding: "0.6rem 1.5rem", fontSize: "0.8rem" }}
          disabled={m.status === "solving"}
          onClick={m.solve}
        >
          Solve
        </button>
        <button
          type="button"
          className="btn-outline"
          style={{ padding: "0.6rem 1.5rem", fontSize: "0.8rem" }}
          onClick={m.reset}
        >
          Reset
        </button>
        <button
          type="button"
          className="btn-outline"
          style={{ padding: "0.6rem 1.5rem", fontSize: "0.8rem" }}
          disabled={!m.canReplay || m.status === "solving"}
          onClick={m.replay}
        >
          Replay
        </button>
        <span className="status-badge" style={{ color: STATUS_META[m.status].color, marginLeft: "auto" }}>
          {STATUS_META[m.status].label}
        </span>
      </div>

      {/* output panel */}
      {m.status === "no-path" && !m.output && (
        <div style={{ border: "1px solid var(--error)", background: "var(--bg-card)", padding: "1.25rem", color: "var(--error)" }} className="mono">
          NO PATH -- the selected start and goal are not connected. (This should not
          happen on the real maze; check the selection.)
        </div>
      )}

      {m.output && <OutputPanel output={m.output} />}
    </div>
  );
}

function OutputPanel({ output: o }: { output: SolveOutput }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copyText = buildCopyText(o);
  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked (non-https/permission) -- the text is visible below anyway
    }
  }

  const row: React.CSSProperties = { padding: "0.5rem 0", borderBottom: "1px solid var(--border)", display: "flex", gap: "1rem", flexWrap: "wrap" };
  const label: React.CSSProperties = { fontFamily: "var(--font-mono), monospace", fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", minWidth: "9rem" };
  const value: React.CSSProperties = { fontFamily: "var(--font-mono), monospace", fontSize: "0.8rem", color: "var(--text-primary)", wordBreak: "break-word" };

  return (
    <div style={{ border: "1px solid var(--border)", background: "var(--bg-card)", padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "1rem", flexWrap: "wrap" }}>
        <h3 className="heading" style={{ fontSize: "0.95rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)" }}>
          Robot route
        </h3>
        <button
          type="button"
          style={tile(false)}
          title={copyText}
          onClick={copy}
        >
          {copied ? "Copied" : "Copy for firmware"}
        </button>
      </div>

      <div style={row}><span style={label}>Start</span><span style={value}>({o.start.x}, {o.start.y})</span></div>
      <div style={row}><span style={label}>Goal</span><span style={value}>({o.goal.x}, {o.goal.y})</span></div>
      <div style={row}><span style={label}>Start heading</span><span style={value}>{o.startHeading}</span></div>
      <div style={row}><span style={label}>Moves</span><span style={value}>{o.moves}</span></div>
      <div style={row}><span style={label}>Final heading</span><span style={value}>{o.finalHeading}</span></div>
      <div style={row}>
        <span style={label}>Path (x, y)</span>
        <span style={value}>{o.path.map((c) => `(${c.x},${c.y})`).join(" -> ")}</span>
      </div>
      <div style={row}>
        <span style={label}>Absolute dirs</span>
        <span style={value}>{o.directions.join(" ") || "(none)"}</span>
      </div>
      <div style={{ ...row, borderBottom: "none" }}>
        <span style={label}>Robot commands</span>
        <span style={value}>{o.commands.join(" ") || "(none)"}</span>
      </div>

      {/* F/L/R/B legend -- matches the convention documented above
          absoluteDirectionsToRobotCommands in src/lib/maze/directions.ts */}
      <p className="mono" style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "1rem", lineHeight: 1.6, letterSpacing: "0.04em" }}>
        F = move forward one cell (no turn) · L = turn left 90 then move · R = turn
        right 90 then move · B = turn around 180 then move (reverse)
      </p>
    </div>
  );
}
