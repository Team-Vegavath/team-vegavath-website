// S78: verifies the SOLVER'S OUTPUT, not the raw maze data (which was verified
// computationally before the session). The core guarantee: a returned path never
// crosses a wall, across many start/goal pairs.

import { describe, expect, it } from "vitest";

import { MAZE } from "@/lib/maze/data";
import {
  absoluteDirectionsToRobotCommands,
  pathToAbsoluteDirections,
} from "@/lib/maze/directions";
import { bfs } from "@/lib/maze/solve";
import { type Cell, type Direction, DELTA, hasWall, key } from "@/lib/maze/utils";

// Walk every consecutive pair in a path and assert an open wall between them.
function assertNoWallCrossing(path: Cell[]): void {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const dir = (Object.keys(DELTA) as Direction[]).find(
      (d) => a.x + DELTA[d].dx === b.x && a.y + DELTA[d].dy === b.y
    );
    // steps must be to an orthogonally adjacent cell
    expect(dir, `step ${i} is not to an adjacent cell`).toBeDefined();
    expect(
      hasWall(MAZE, a.x, a.y, dir!),
      `path crosses a ${dir} wall from (${a.x},${a.y})`
    ).toBe(false);
  }
}

const pairs: { name: string; start: Cell; goal: Cell }[] = [
  { name: "adjacent (0,0)->(1,0)", start: { x: 0, y: 0 }, goal: { x: 1, y: 0 } },
  { name: "opposite corners (0,0)->(7,7)", start: { x: 0, y: 0 }, goal: { x: 7, y: 7 } },
  { name: "opposite corners (7,0)->(0,7)", start: { x: 7, y: 0 }, goal: { x: 0, y: 7 } },
  { name: "opposite corners (0,7)->(7,0)", start: { x: 0, y: 7 }, goal: { x: 7, y: 0 } },
  { name: "middle (3,3)->(4,4)", start: { x: 3, y: 3 }, goal: { x: 4, y: 4 } },
  { name: "middle (2,5)->(5,2)", start: { x: 2, y: 5 }, goal: { x: 5, y: 2 } },
  { name: "inner (1,1)->(6,6)", start: { x: 1, y: 1 }, goal: { x: 6, y: 6 } },
  { name: "vertical (4,0)->(4,7)", start: { x: 4, y: 0 }, goal: { x: 4, y: 7 } },
  { name: "horizontal (0,4)->(7,4)", start: { x: 0, y: 4 }, goal: { x: 7, y: 4 } },
  { name: "diagonal-ish (6,1)->(1,6)", start: { x: 6, y: 1 }, goal: { x: 1, y: 6 } },
  { name: "middle (5,5)->(2,2)", start: { x: 5, y: 5 }, goal: { x: 2, y: 2 } },
  { name: "same cell (3,3)->(3,3)", start: { x: 3, y: 3 }, goal: { x: 3, y: 3 } },
];

describe("bfs solver output across varied start/goal pairs", () => {
  for (const { name, start, goal } of pairs) {
    it(`${name}: returns a valid, wall-free, non-repeating shortest path`, () => {
      const result = bfs(MAZE, start, goal);

      expect(result.invalid).toBe(false);
      expect(result.path).not.toBeNull();
      const path = result.path!;

      // endpoints line up
      expect(path[0]).toEqual(start);
      expect(path[path.length - 1]).toEqual(goal);

      // never crosses a wall
      assertNoWallCrossing(path);

      // a correct BFS reconstruction never repeats a cell
      const seen = new Set(path.map(key));
      expect(seen.size).toBe(path.length);

      // command sequences have exactly one entry per move
      const moves = path.length - 1;
      const directions = pathToAbsoluteDirections(path);
      expect(directions.length).toBe(moves);
      const { commands } = absoluteDirectionsToRobotCommands(directions, "N");
      expect(commands.length).toBe(moves);
    });
  }
});

describe("edge cases", () => {
  it("start === goal returns a single-cell, zero-move path", () => {
    const result = bfs(MAZE, { x: 2, y: 5 }, { x: 2, y: 5 });
    expect(result.invalid).toBe(false);
    expect(result.path).toEqual([{ x: 2, y: 5 }]);
    expect(pathToAbsoluteDirections(result.path!).length).toBe(0);
  });

  it("out-of-bounds start returns the invalid result without throwing", () => {
    const result = bfs(MAZE, { x: -1, y: 0 }, { x: 3, y: 3 });
    expect(result.invalid).toBe(true);
    expect(result.path).toBeNull();
  });

  it("out-of-bounds goal returns the invalid result without throwing", () => {
    const result = bfs(MAZE, { x: 0, y: 0 }, { x: 8, y: 8 });
    expect(result.invalid).toBe(true);
    expect(result.path).toBeNull();
  });
});
