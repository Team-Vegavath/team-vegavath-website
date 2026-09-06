"use client";

// S78: SVG render of the 8x8 maze. No canvas, no dependency -- just <rect>/<line>
// and a CSS-transitioned robot marker. y=7 is drawn at the visual TOP (the inverse
// of the data's bottom-up y), per the brief.

import { GRID_SIZE, MAZE } from "@/lib/maze/data";
import { type Cell, type Direction, hasWall, key } from "@/lib/maze/utils";
import { ROBOT_STEP_MS } from "./useMazeSolver";

const CELL = 40; // user units per cell
const PAD = 4; // breathing room so outer walls are not clipped
const SIZE = GRID_SIZE * CELL;

// screen y for a maze y (0 at bottom -> drawn at the bottom row)
const screenRow = (y: number) => (GRID_SIZE - 1 - y) * CELL;

const HEADING_ANGLE: Record<Direction, number> = { N: 0, E: 90, S: 180, W: 270 };

export default function MazeGrid({
  start,
  goal,
  visited,
  pathCells,
  robot,
  onPick,
  interactive,
}: {
  start: Cell;
  goal: Cell;
  visited: Cell[];
  pathCells: Cell[];
  robot: { cell: Cell; heading: Direction } | null;
  onPick: (cell: Cell) => void;
  interactive: boolean;
}) {
  const visitedKeys = new Set(visited.map(key));
  const pathKeys = new Set(pathCells.map(key));
  const startKey = key(start);
  const goalKey = key(goal);

  // fill + opacity for a cell, by precedence: start/goal always win over the
  // exploration/path layers underneath them.
  function cellFill(x: number, y: number): { fill: string; opacity: number } {
    const k = key({ x, y });
    if (k === startKey) return { fill: "var(--success)", opacity: 0.9 };
    if (k === goalKey) return { fill: "var(--gold)", opacity: 0.9 };
    if (pathKeys.has(k)) return { fill: "var(--accent)", opacity: 0.45 };
    if (visitedKeys.has(k)) return { fill: "var(--accent)", opacity: 0.13 };
    return { fill: "var(--bg-card)", opacity: 1 };
  }

  const robotR = CELL * 0.28;

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${SIZE + PAD * 2} ${SIZE + PAD * 2}`}
      style={{ width: "100%", maxWidth: "34rem", height: "auto", display: "block", touchAction: "manipulation" }}
      role="img"
      aria-label="8 by 8 maze grid"
    >
      {/* cells */}
      {Array.from({ length: GRID_SIZE }, (_, y) =>
        Array.from({ length: GRID_SIZE }, (_, x) => {
          const { fill, opacity } = cellFill(x, y);
          const px = x * CELL;
          const py = screenRow(y);
          return (
            <rect
              key={`c-${x}-${y}`}
              x={px}
              y={py}
              width={CELL}
              height={CELL}
              fill={fill}
              fillOpacity={opacity}
              stroke="var(--border)"
              strokeWidth={0.5}
              style={{ cursor: interactive ? "pointer" : "default" }}
              onClick={interactive ? () => onPick({ x, y }) : undefined}
            >
              <title>{`(${x}, ${y})`}</title>
            </rect>
          );
        })
      )}

      {/* walls: drawn per set bit. Reciprocal walls may draw the same edge twice --
          harmless, and cheaper than de-duping. */}
      {Array.from({ length: GRID_SIZE }, (_, y) =>
        Array.from({ length: GRID_SIZE }, (_, x) => {
          const px = x * CELL;
          const py = screenRow(y);
          const lines: [number, number, number, number][] = [];
          if (hasWall(MAZE, x, y, "N")) lines.push([px, py, px + CELL, py]); // top edge
          if (hasWall(MAZE, x, y, "S")) lines.push([px, py + CELL, px + CELL, py + CELL]);
          if (hasWall(MAZE, x, y, "E")) lines.push([px + CELL, py, px + CELL, py + CELL]);
          if (hasWall(MAZE, x, y, "W")) lines.push([px, py, px, py + CELL]);
          return lines.map(([x1, y1, x2, y2], i) => (
            <line
              key={`w-${x}-${y}-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--text-secondary)"
              strokeWidth={2.5}
              strokeLinecap="square"
            />
          ));
        })
      )}

      {/* robot marker: a triangle pointing along its heading, translated to the
          cell centre. CSS transform + transition animate the step and the turn. */}
      {robot && (
        <g
          style={{
            transform: `translate(${robot.cell.x * CELL + CELL / 2}px, ${
              screenRow(robot.cell.y) + CELL / 2
            }px) rotate(${HEADING_ANGLE[robot.heading]}deg)`,
            transition: `transform ${ROBOT_STEP_MS}ms ease-in-out`,
          }}
        >
          <polygon
            points={`0,${-robotR} ${robotR * 0.8},${robotR * 0.7} ${-robotR * 0.8},${robotR * 0.7}`}
            fill="var(--text-primary)"
            stroke="var(--accent)"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}
