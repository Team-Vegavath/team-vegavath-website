// S78: convert a cell path into absolute compass directions, then into the
// robot's own relative move commands. ZERO React/DOM imports.

import { type Cell, type Direction } from "./utils";

// Compass order, clockwise. A +1 step around this ring is a right (clockwise)
// turn; +3 (i.e. -1) is a left turn; +2 is a 180 turnaround.
const CW: Direction[] = ["N", "E", "S", "W"];

// For each consecutive pair of cells, the absolute direction of travel, from the
// coordinate delta (y increases upward, so dy = +1 is North).
export function pathToAbsoluteDirections(path: Cell[]): Direction[] {
  const dirs: Direction[] = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 1 && dy === 0) dirs.push("E");
    else if (dx === -1 && dy === 0) dirs.push("W");
    else if (dx === 0 && dy === 1) dirs.push("N");
    else if (dx === 0 && dy === -1) dirs.push("S");
    // A non-adjacent or diagonal pair is impossible from a BFS grid path; skip it
    // rather than emit a bogus command.
  }
  return dirs;
}

/**
 * Robot command convention (F/L/R/B), also shown verbatim in the UI legend:
 *
 *   F = move forward one cell (heading unchanged)
 *   L = turn left 90 degrees, then move one cell
 *   R = turn right 90 degrees, then move one cell
 *   B = turn around 180 degrees, then move one cell (reverse)
 *
 * Each absolute direction is compared to where the robot is CURRENTLY facing, not
 * its original start heading: the heading is updated to the new absolute direction
 * after every step, so the next comparison is always relative to the robot's now.
 */
export function absoluteDirectionsToRobotCommands(
  directions: Direction[],
  startHeading: Direction
): { commands: ("F" | "L" | "R" | "B")[]; finalHeading: Direction } {
  const commands: ("F" | "L" | "R" | "B")[] = [];
  let heading = startHeading;

  for (const target of directions) {
    const diff = (CW.indexOf(target) - CW.indexOf(heading) + 4) % 4;
    if (diff === 0) commands.push("F");
    else if (diff === 1) commands.push("R");
    else if (diff === 2) commands.push("B");
    else commands.push("L"); // diff === 3
    heading = target; // the robot now faces the direction it just moved in
  }

  return { commands, finalHeading: heading };
}
