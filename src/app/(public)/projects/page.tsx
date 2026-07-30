import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Engineering projects by Team Vegavath -- go-kart builds, robotics systems, and more.",
  alternates: { canonical: "/projects" },
  openGraph: {
    title: "Projects | Team Vegavath",
    description:
      "Go-karts, combat robots, and embedded systems built by Team Vegavath at PESU ECC.",
  },
};

export const revalidate = 3600;

/* S60/D4. Static content, no service call -- there is no `projects` table and
   nothing here needs one yet. When the automotive team wants editable specs,
   that is a migration plus a service function, not an inline query.
   No <main>: (public)/layout.tsx already renders one around every page. Most
   existing pages nest a second <main> inside it; new files stop adding to that. */
export default function ProjectsPage() {
  return (
    <div style={{ background: "var(--bg-base)", color: "var(--text-primary)", overflowX: "hidden", minHeight: "100vh" }}>
      <section style={{ padding: "9rem 0 6rem" }}>
        <Container>
          <header style={{ marginBottom: "3rem" }}>
            <p className="label-tech" style={{ color: "var(--accent)", marginBottom: "0.75rem" }}>
              What we build
            </p>
            <h1 className="heading" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}>
              Projects
            </h1>
            <p style={{ marginTop: "1rem", fontSize: "0.85rem", lineHeight: 1.7, color: "var(--text-muted)" }}>
              Every machine on this page was designed and fabricated in-house.
            </p>
          </header>

          <Reveal>
            {/* 1px gap over a --border background is the hairline-divider trick
                the sponsor and crew grids already use -- no per-card borders. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
                gap: "1px",
                background: "var(--border)",
                border: "1px solid var(--border)",
              }}
            >
              <Link
                href="/projects/kart"
                className="project-card"
                style={{ background: "var(--bg-card)", padding: "2.5rem", textDecoration: "none", display: "block", transition: "background 0.15s ease" }}
              >
                <p className="label-tech" style={{ color: "var(--accent)", marginBottom: "1rem" }}>
                  Automotives
                </p>
                <h2 className="heading" style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                  Go-Kart
                </h2>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                  A custom-built go-kart designed and fabricated entirely by Team
                  Vegavath. From chassis design to electronics integration, every
                  component is engineered in-house.
                </p>
                <span className="mono" style={{ fontSize: "0.75rem", color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  VIEW PROJECT →
                </span>
              </Link>

              <Link
                href="/projects/combat-bot"
                className="project-card"
                style={{ background: "var(--bg-card)", padding: "2.5rem", textDecoration: "none", display: "block", transition: "background 0.15s ease" }}
              >
                <p className="label-tech" style={{ color: "var(--accent)", marginBottom: "1rem" }}>
                  Robotics
                </p>
                <h2 className="heading" style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                  Combat Bot
                </h2>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                  An arena combat robot built for competitive robotics events.
                  Designed for durability and maneuverability under combat
                  conditions.
                </p>
                <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  COMING SOON
                </span>
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
