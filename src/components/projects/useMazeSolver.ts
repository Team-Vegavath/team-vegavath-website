"use client";

// S78: all animation/timeline state for the maze demo. The SOLVER stays pure (see
// src/lib/maze/*); this hook only orchestrates timers and React state around it.

import { useCallback, useEffect, useRef, useState } from "react";

import { MAZE } from "@/lib/maze/data";
import {
  absoluteDirectionsToRobotCommands,
  pathToAbsoluteDirections,
} from "@/lib/maze/directions";
import { bfs, type BfsResult } from "@/lib/maze/solve";
import { type Cell, type Direction } from "@/lib/maze/utils";

export type Status = "ready" | "solving" | "solved" | "no-path";

// Animation pacing (ms). Tuned by eye for a TV-legible booth pace.
const EXPLORE_MS = 45; // per explored cell during the BFS replay
const PATH_MS = 60; // per cell as the final path lights up
const PHASE_PAUSE_MS = 400; // beat between phases
export const ROBOT_STEP_MS = 220; // per robot step (grid mirrors this in its CSS transition)

export type SolveOutput = {
  start: Cell;
  goal: Cell;
  startHeading: Direction;
  path: Cell[];
  directions: Direction[];
  commands: ("F" | "L" | "R" | "B")[];
  finalHeading: Direction;
  moves: number;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useMazeSolver() {
  const [start, setStart] = useState<Cell>({ x: 0, y: 0 });
  const [goal, setGoal] = useState<Cell>({ x: 7, y: 7 });
  const [startHeading, setStartHeading] = useState<Direction>("N");
  const [selectMode, setSelectMode] = useState<"start" | "goal">("start");

  const [status, setStatus] = useState<Status>("ready");
  const [visited, setVisited] = useState<Cell[]>([]); // explored cells revealed so far
  const [pathCells, setPathCells] = useState<Cell[]>([]); // final-path cells revealed so far
  const [robot, setRobot] = useState<{ cell: Cell; heading: Direction } | null>(null);
  const [output, setOutput] = useState<SolveOutput | null>(null);
  // whether a solve has run at least once, so Replay can enable without reading a
  // ref during render
  const [canReplay, setCanReplay] = useState(false);

  // The last bfs() result + the inputs it was computed for. Replay reads this and
  // NEVER calls bfs() again (the person's explicit "replay without recalculating").
  const lastRun = useRef<{ result: BfsResult; output: SolveOutput | null } | null>(null);

  // Cancellation: every run gets a token; a stale run's awaited continuations bail.
  const runToken = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    return () => {
      // alive() also gates on mounted.current, so this alone stops any in-flight
      // timeline on unmount -- no need to touch runToken here.
      mounted.current = false;
    };
  }, []);

  const clearAnimation = useCallback(() => {
    setVisited([]);
    setPathCells([]);
    setRobot(null);
  }, []);

  // Plays the exploration -> path -> robot timeline against an already-computed
  // result. Shared by solve() and replay() so they animate identically.
  const runTimeline = useCallback(
    async (result: BfsResult, out: SolveOutput | null) => {
      const token = ++runToken.current;
      const alive = () => mounted.current && runToken.current === token;

      clearAnimation();
      setStatus("solving");

      // Phase 1: reveal explored cells in BFS order.
      const explored: Cell[] = [];
      for (const cell of result.visitedOrder) {
        if (!alive()) return;
        explored.push(cell);
        setVisited([...explored]);
        await sleep(EXPLORE_MS);
      }

      if (!result.path || !out) {
        if (alive()) setStatus("no-path");
        return;
      }

      if (!alive()) return;
      await sleep(PHASE_PAUSE_MS);

      // Phase 2: light up the final path.
      const litPath: Cell[] = [];
      for (const cell of result.path) {
        if (!alive()) return;
        litPath.push(cell);
        setPathCells([...litPath]);
        await sleep(PATH_MS);
      }

      if (!alive()) return;
      await sleep(PHASE_PAUSE_MS);

      // Phase 3: drive the robot along the path, rotating to each step's heading.
      setRobot({ cell: result.path[0]!, heading: out.startHeading });
      await sleep(ROBOT_STEP_MS);
      for (let i = 1; i < result.path.length; i++) {
        if (!alive()) return;
        setRobot({ cell: result.path[i]!, heading: out.directions[i - 1] ?? out.startHeading });
        await sleep(ROBOT_STEP_MS);
      }

      if (alive()) setStatus("solved");
    },
    [clearAnimation]
  );

  const solve = useCallback(() => {
    const result = bfs(MAZE, start, goal);

    let out: SolveOutput | null = null;
    if (!result.invalid && result.path) {
      const directions = pathToAbsoluteDirections(result.path);
      const { commands, finalHeading } = absoluteDirectionsToRobotCommands(
        directions,
        startHeading
      );
      out = {
        start,
        goal,
        startHeading,
        path: result.path,
        directions,
        commands,
        finalHeading,
        moves: result.path.length - 1,
      };
    }

    lastRun.current = { result, output: out };
    setOutput(out);
    setCanReplay(true);
    void runTimeline(result, out);
  }, [start, goal, startHeading, runTimeline]);

  const replay = useCallback(() => {
    const prev = lastRun.current;
    if (!prev) return;
    setOutput(prev.output);
    void runTimeline(prev.result, prev.output); // reuses the stored bfs() result
  }, [runTimeline]);

  const reset = useCallback(() => {
    runToken.current++; // cancel any running timeline
    clearAnimation();
    setOutput(null);
    setStatus("ready");
    // start/goal/heading are intentionally kept, so the attendant can re-solve the
    // same pair or nudge one endpoint without re-picking both.
  }, [clearAnimation]);

  // Clicking a cell assigns it to whichever endpoint the mode button selected.
  const pickCell = useCallback(
    (cell: Cell) => {
      if (status === "solving") return; // locked mid-animation
      if (selectMode === "start") setStart(cell);
      else setGoal(cell);
    },
    [status, selectMode]
  );

  return {
    // selection
    start,
    goal,
    startHeading,
    setStartHeading,
    selectMode,
    setSelectMode,
    pickCell,
    // animation state
    status,
    visited,
    pathCells,
    robot,
    output,
    // actions
    solve,
    replay,
    reset,
    canReplay,
  };
}
