import type { Metadata } from "next";

import AboutHeroImage from "@/components/about/AboutHeroImage";
import { DomainGrid } from "@/components/home/DomainGrid";
import { SponsorMarquee } from "@/components/sponsors/SponsorMarquee";
import { Reveal } from "@/components/ui/Reveal";
import { getActiveSponsors } from "@/lib/services/sponsors";

export const metadata: Metadata = {
  title: "About | Team Vegavath",
};

export const revalidate = 120;

const STATS = [
  { number: "2", label: "Major Events" },
  { number: "85", label: "Active Members" },
  { number: "6", label: "Domains" },
] as const;

const TIMELINE = [
  {
    date: "SEP 2025",
    title: "Freshers Day",
    description: "First open event of the year, where the newest batch meets the team.",
  },
  {
    date: "NOV 2025",
    title: "Ignition 1.0",
    description: "IoT hackathon, one of the largest campus hackathons at PESU ECC.",
  },
  {
    date: "FEB 2026",
    title: "EmbedX 2.0",
    description: "Embedded systems event continuing the technical series.",
  },
] as const;

const VALUES = [
  {
    shape: "circle",
    title: "Innovation",
    description: "We challenge convention and build forward-looking solutions with curiosity at the center.",
  },
  {
    shape: "triangle",
    title: "Excellence",
    description: "We hold ourselves to high engineering and creative standards in every project we ship.",
  },
  {
    shape: "square",
    title: "Collaboration",
    description: "Our best ideas come from working across disciplines, learning openly, and moving as one team.",
  },
  {
    shape: "hexagon",
    title: "Impact",
    description: "We build experiences that prepare students for real-world challenges in technology and mobility.",
  },
] as const;

function ValueShape({ shape }: { shape: (typeof VALUES)[number]["shape"] }) {
  const stroke = "var(--accent)";
  const common = { fill: "none", stroke, strokeWidth: 1.5 };

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      {shape === "circle" ? <circle cx="18" cy="18" r="13" {...common} /> : null}
      {shape === "triangle" ? <path d="M18 5 L31 30 L5 30 Z" {...common} /> : null}
      {shape === "square" ? <rect x="6" y="6" width="24" height="24" {...common} /> : null}
      {shape === "hexagon" ? <path d="M18 4 L30 11 L30 25 L18 32 L6 25 L6 11 Z" {...common} /> : null}
    </svg>
  );
}

export default async function AboutPage() {
  const sponsors = await getActiveSponsors().catch(() => []);

  return (
    <main style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      {/* Full-bleed hero: the photo + statement IS the header */}
      <AboutHeroImage />

      {/* Intro + mission pull-quote */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ margin: "0 auto", maxWidth: "56rem" }}>
          <Reveal>
            <p style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "var(--text-secondary)" }}>
              Team Vegavath is the official student innovation club of PES University, Electronic City
              Campus. Founded by Mechanical Engineering seniors as a racing team, it has grown into a
              multi-domain community of Computer Science and Electronics students with a shared obsession:
              automotives and robotics.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <blockquote
              style={{
                marginTop: "3.5rem",
                borderLeft: "2px solid var(--accent)",
                paddingLeft: "1.75rem",
                fontSize: "clamp(1.3rem, 3vw, 1.75rem)",
                fontStyle: "italic",
                lineHeight: 1.5,
                color: "var(--text-primary)",
              }}
            >
              A <span style={{ color: "var(--gold)", fontStyle: "normal", fontWeight: 600 }}>future-ready community</span> where
              technology, innovation, and teamwork converge, shaping the next generation of leaders in
              mobility, robotics, and digital transformation.
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* Domains: shared grid, identical to home */}
      <section style={{ padding: "0 1.5rem 5rem" }}>
        <div style={{ margin: "0 auto", maxWidth: "72rem" }}>
          <Reveal>
            <h2 style={{ marginBottom: "2rem", fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, textTransform: "uppercase" }}>
              What we do
            </h2>
            <DomainGrid />
          </Reveal>
        </div>
      </section>

      {/* Stats: dramatic, dot pattern */}
      <section className="pattern-dots" style={{ padding: "5.5rem 1.5rem" }}>
        <div style={{ margin: "0 auto", maxWidth: "72rem" }}>
          <Reveal>
            <div className="stats-grid">
              {STATS.map(({ number, label }) => (
                <div key={label}>
                  <p className="stat-number">{number}</p>
                  <p className="stat-label">{label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Timeline: real events only */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ margin: "0 auto", maxWidth: "56rem" }}>
          <Reveal>
            <h2 style={{ marginBottom: "3rem", fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, textTransform: "uppercase" }}>
              The road so far
            </h2>
          </Reveal>

          <div style={{ borderLeft: "1px solid var(--border-strong)", paddingLeft: "2rem", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            {TIMELINE.map((entry, index) => (
              <Reveal key={entry.title} delay={index * 0.08}>
                <div style={{ position: "relative" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "calc(-2rem - 5px)",
                      top: "0.4rem",
                      width: "9px",
                      height: "9px",
                      background: "var(--accent)",
                    }}
                  />
                  <time className="mono" dateTime={entry.date} style={{ fontSize: "0.75rem", letterSpacing: "0.18em", color: "var(--accent)" }}>
                    {entry.date}
                  </time>
                  <h3 style={{ marginTop: "0.4rem", fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {entry.title}
                  </h3>
                  <p style={{ marginTop: "0.5rem", fontSize: "0.95rem", lineHeight: 1.65, color: "var(--text-secondary)" }}>
                    {entry.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Values: geometric outlines, no emoji */}
      <section style={{ padding: "0 1.5rem 5rem" }}>
        <div style={{ margin: "0 auto", maxWidth: "72rem" }}>
          <Reveal>
            <h2 style={{ marginBottom: "2rem", fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, textTransform: "uppercase" }}>
              How we operate
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="values-grid">
              {VALUES.map(({ shape, title, description }) => (
                <div key={title} style={{ background: "var(--bg-card)", padding: "1.75rem 1.5rem" }}>
                  <ValueShape shape={shape} />
                  <h3 style={{ marginTop: "1.1rem", fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {title}
                  </h3>
                  <p style={{ marginTop: "0.6rem", fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Sponsors marquee: same treatment as home */}
      {sponsors.length > 0 ? (
        <section style={{ padding: "0 0 5rem" }}>
          <div style={{ margin: "0 auto", maxWidth: "80rem" }}>
            <h2
              className="heading"
              style={{ textAlign: "center", marginBottom: "1.5rem", fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--text-secondary)" }}
            >
              PARTNERS
            </h2>
            <SponsorMarquee sponsors={sponsors} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
