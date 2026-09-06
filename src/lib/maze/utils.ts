// S78: pure maze helpers. ZERO React/DOM imports -- plain, testable TypeScript.

import { GRID_SIZE, WALL, type Grid } from "./data";

export type Cell = { x: number; y: number };
export type Direction = "N" | "E" | "S" | "W";

// Movement delta per direction. y increases UPWARD (see data.ts), so N is y+1.
export const DELTA: Record<Direction, { dx: number; dy: number }> = {
  N: { dx: 0, dy: 1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: -1 },
  W: { dx: -1, dy: 0 },
};

export const DIRECTIONS: Direction[] = ["N", "E", "S", "W"];

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

// True when a wall is present on the given side of cell (x, y).
export function hasWall(grid: Grid, x: number, y: number, dir: Direction): boolean {
  const row = grid[y];
  if (!row) return true; // out of the grid reads as walled-in
  const mask = row[x];
  if (mask === undefined) return true;
  return (mask & WALL[dir]) !== 0;
}

// The cells reachable from (x, y) in one step: in bounds AND with no wall between.
// The data is pre-verified reciprocal, so we only need to check this cell's wall.
export function getNeighbors(grid: Grid, x: number, y: number): Cell[] {
  const out: Cell[] = [];
  for (const dir of DIRECTIONS) {
    if (hasWall(grid, x, y, dir)) continue;
    const nx = x + DELTA[dir].dx;
    const ny = y + DELTA[dir].dy;
    if (inBounds(nx, ny)) out.push({ x: nx, y: ny });
  }
  return out;
}

// Stable string key for a cell, used by the BFS visited set and parent map.
export function key(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}
