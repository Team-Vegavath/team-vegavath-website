import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import MazeSolver from "@/components/projects/MazeSolver";

export const metadata: Metadata = {
  title: "Maze Solver",
  description:
    "An interactive 8x8 autonomous maze-solving robot demo by Vega Vath Racing: a BFS shortest-path solver over the known map, with animated exploration and robot command output.",
  alternates: { canonical: "/projects/maze-solver" },
  openGraph: {
    title: "Maze Solver | Team Vegavath",
    description:
      "8x8 BFS maze solver with animated exploration and Arduino-ready robot commands.",
  },
};

export const revalidate = 3600;

/* S78. The interactive demo is a "use client" island (MazeSolver); the solver
   itself is pure functions in src/lib/maze/* with zero React/DOM deps. Header-then
   -content and the Container/Reveal/.label-tech/.heading reuse match /projects/kart
   and /projects/combat-bot exactly -- no new page style was invented. */
export default function MazeSolverPage() {
  return (
    <div style={{ background: "var(--bg-base)", color: "var(--text-primary)", overflowX: "hidden", minHeight: "100vh" }}>
      <section style={{ padding: "9rem 0 2rem" }}>
        <Container>
          <header>
            <p className="label-tech" style={{ color: "var(--accent)", marginBottom: "0.75rem" }}>
              Team Vegavath · Robotics
            </p>
            <h1 className="heading" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}>
              Maze Solver
            </h1>
            <p style={{ marginTop: "1rem", fontSize: "0.9rem", lineHeight: 1.7, color: "var(--text-secondary)", maxWidth: "40rem" }}>
              An 8x8 autonomous maze-solving robot by Vega Vath Racing. Pick a start
              and goal, choose the robot&apos;s starting heading, and watch it find
              the shortest route.
            </p>
          </header>
        </Container>
      </section>

      <section style={{ paddingBottom: "3.5rem" }}>
        <Container>
          <MazeSolver />
        </Container>
      </section>

      <section style={{ padding: "3rem 0", borderTop: "1px solid var(--border)" }}>
        <Container>
          <Reveal>
            <h2 className="heading" style={{ fontSize: "1.25rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "1.5rem" }}>
              How it works
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: "44rem" }}>
              This page works from the known map of the competition maze. A
              breadth-first search computes the shortest route between the start and
              goal you pick, then converts that route into the exact turn-by-turn
              commands the robot would execute from its starting heading. Because the
              map is known ahead of time, the route shown here is genuinely the
              shortest one, not a guess refined over several runs.
            </p>
          </Reveal>
        </Container>
      </section>

      <section style={{ padding: "3rem 0", borderTop: "1px solid var(--border)" }}>
        <Container>
          <Reveal>
            <h2 className="heading" style={{ fontSize: "1.25rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "1.5rem" }}>
              The physical robot
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse", maxWidth: "44rem" }}>
              <tbody>
                {[
                  ["Controller", "Arduino Uno"],
                  ["Heading / turns", "MPU6050 IMU"],
                  ["Front sensor", "HC-SR04 -- wall detection and safety"],
                  ["Side sensors", "Left + right HC-SR04 -- wall sensing and corridor centering"],
                  ["Distance", "Right-motor encoder"],
                  ["Motor driver", "TB6612FNG"],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: "1px solid var(--border)" }}>
                    <th
                      scope="row"
                      className="mono"
                      style={{ padding: "0.875rem 0", fontSize: "0.72rem", fontWeight: 400, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", width: "38%", textAlign: "left", verticalAlign: "top" }}
                    >
                      {label}
                    </th>
                    <td style={{ padding: "0.875rem 0", fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.6 }}>
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: "44rem", marginTop: "1.5rem" }}>
              The robot does not blindly trust motion timing. Even while executing a
              route it already knows from the map, it keeps verifying its
              surroundings with its sensors, correcting its heading with the IMU and
              its distance with the encoder rather than assuming a fixed number of
              milliseconds equals one cell.
            </p>
          </Reveal>
        </Container>
      </section>

      <section style={{ padding: "3rem 0", borderTop: "1px solid var(--border)" }}>
        <Container>
          <Reveal>
            <h2 className="heading" style={{ fontSize: "1.25rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "1.5rem" }}>
              Planned autonomous mode
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: "44rem" }}>
              A second mode is planned separately: instead of being handed the map,
              the robot would build and maintain its own maze state onboard and run
              flood-fill replanning as it discovers walls, updating its route on the
              fly. That discovery mode is a distinct piece of work from the known-map
              shortest-route solver shown on this page.
            </p>
          </Reveal>
        </Container>
      </section>

      <section style={{ padding: "2rem 0 4rem", borderTop: "1px solid var(--border)" }}>
        <Container>
          <Link href="/projects" className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)", textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            ← All projects
          </Link>
        </Container>
      </section>
    </div>
  );
}
