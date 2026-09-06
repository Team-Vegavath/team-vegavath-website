// S78: the fixed 8x8 competition maze, as a wall-mask grid.
//
// Pre-verified computationally before this session (BFS reachability, reciprocal
// walls, boundary walls) -- transcribed EXACTLY as given, not re-derived. Do not
// "correct" any value here without re-running that verification.
//
// Indexing: MAZE[y][x], with x = 0..7 left-to-right and y = 0..7 BOTTOM-to-top.
// So MAZE[0] is the bottom row (y=0) and MAZE[7] is the top row (y=7). The grid is
// rendered with y=7 at the visual top (see MazeGrid), which is the inverse of this
// storage order.
//
// Each value is a 4-bit wall mask. A SET bit means a wall is present in that
// direction from that cell:
//   N = 1  (towards y+1)
//   E = 2  (towards x+1)
//   S = 4  (towards y-1)
//   W = 8  (towards x-1)

export const GRID_SIZE = 8;

export const WALL = { N: 1, E: 2, S: 4, W: 8 } as const;

// Written as hex literals so this matches the source table digit-for-digit.
// prettier-ignore
export const MAZE: readonly (readonly number[])[] = [
  /* y=0 */ [0xC, 0x4, 0x5, 0x4, 0x7, 0xC, 0x5, 0x7],
  /* y=1 */ [0xB, 0x8, 0x7, 0x9, 0x6, 0x9, 0x5, 0x6],
  /* y=2 */ [0xC, 0x2, 0xD, 0x5, 0x1, 0x4, 0x5, 0x2],
  /* y=3 */ [0xA, 0x9, 0x6, 0xC, 0x6, 0x9, 0x6, 0xA],
  /* y=4 */ [0xA, 0xC, 0x3, 0x8, 0x3, 0xC, 0x2, 0xA],
  /* y=5 */ [0xA, 0x9, 0x6, 0xA, 0xD, 0x3, 0xA, 0xA],
  /* y=6 */ [0xA, 0xC, 0x3, 0x9, 0x6, 0xC, 0x3, 0xA],
  /* y=7 */ [0xB, 0x9, 0x5, 0x5, 0x1, 0x3, 0xD, 0x3],
];

export type Grid = readonly (readonly number[])[];
