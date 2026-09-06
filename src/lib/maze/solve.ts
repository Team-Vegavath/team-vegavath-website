// S78: breadth-first shortest-path solver. ZERO React/DOM imports.
//
// Plain unweighted BFS: the first time a cell is dequeued it is at its minimum
// number of steps from the start, so reconstructing parents from goal back to
// start yields a TRUE shortest path. There is deliberately no weighting and no
// early goal-exit that could return a non-shortest route -- the queue is drained
// in FIFO order and the goal's parent chain is read after the search.

import { type Grid } from "./data";
import { type Cell, getNeighbors, inBounds, key } from "./utils";

export type BfsResult = {
  // Cells in the order BFS first reached them (drives the exploration animation).
  visitedOrder: Cell[];
  // Shortest path start -> goal inclusive, or null if unreachable.
  path: Cell[] | null;
  // child-key -> parent cell, for path reconstruction / debugging.
  parents: Map<string, Cell>;
  // True when start or goal is outside the grid: a clear "invalid selection"
  // result rather than a throw or a silently wrong path.
  invalid: boolean;
};

function invalidResult(): BfsResult {
  return { visitedOrder: [], path: null, parents: new Map(), invalid: true };
}

export function bfs(grid: Grid, start: Cell, goal: Cell): BfsResult {
  if (!inBounds(start.x, start.y) || !inBounds(goal.x, goal.y)) {
    return invalidResult();
  }

  // start === goal: a single-cell path, zero moves.
  if (start.x === goal.x && start.y === goal.y) {
    return {
      visitedOrder: [{ ...start }],
      path: [{ ...start }],
      parents: new Map(),
      invalid: false,
    };
  }

  const parents = new Map<string, Cell>();
  const visited = new Set<string>([key(start)]);
  const visitedOrder: Cell[] = [{ ...start }];
  const queue: Cell[] = [{ ...start }];
  let head = 0; // index cursor instead of Array.shift(), which is O(n)

  while (head < queue.length) {
    const current = queue[head++]!;
    if (current.x === goal.x && current.y === goal.y) break;

    for (const next of getNeighbors(grid, current.x, current.y)) {
      const k = key(next);
      if (visited.has(k)) continue;
      visited.add(k);
      parents.set(k, current);
      visitedOrder.push(next);
      queue.push(next);
    }
  }

  // Walk parents backward from goal, then reverse. null if goal was never reached.
  if (!visited.has(key(goal))) {
    return { visitedOrder, path: null, parents, invalid: false };
  }

  const path: Cell[] = [];
  let step: Cell | undefined = { ...goal };
  while (step) {
    path.push(step);
    if (step.x === start.x && step.y === start.y) break;
    step = parents.get(key(step));
  }
  path.reverse();

  return { visitedOrder, path, parents, invalid: false };
}
