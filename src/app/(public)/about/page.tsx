import type { Metadata } from "next";

import AboutHeroImage from "@/components/about/AboutHeroImage";
import { DomainGrid } from "@/components/home/DomainGrid";
import { SponsorMarquee } from "@/components/sponsors/SponsorMarquee";
import { Reveal } from "@/components/ui/Reveal";
import { getMilestones, type Milestone } from "@/lib/services/about";
import { getActiveSponsors } from "@/lib/services/sponsors";

export const metadata: Metadata = {
  title: "About",
  description:
    "Team Vegavath is PESU ECC's motorsport and innovation club, founded in 2019. We build go-karts, develop robotics systems, and run technical events.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About | Team Vegavath",
    description:
      "PESU ECC's motorsport and innovation club. Founded 2019. Go-karts, robotics, embedded systems.",
  },
};

export const revalidate = 120;

const STATS = [
  { number: "2", label: "Major Events" },
  { number: "47", label: "Active Members" },
  { number: "6", label: "Domains" },
] as const;

// Fallback so the page never breaks before migration 010 runs; once the
// milestones table is populated, the live data takes over.
const TIMELINE_FALLBACK: Milestone[] = [
  { id: "1", date_label: "SEP 2025", title: "Freshers Day",
    description: "First open event of the year, where the newest batch meets the team.",
    sort_order: 1 },
  { id: "2", date_label: "NOV 2025", title: "Ignition 1.0",
    description: "IoT hackathon, one of the largest campus hackathons at PESU ECC.",
    sort_order: 2 },
  { id: "3", date_label: "FEB 2026", title: "EmbedX 2.0",
    description: "Embedded systems event continuing the technical series.",
    sort_order: 3 },
];

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
  const milestonesFromDb = await getMilestones().catch(() => TIMELINE_FALLBACK);
  const milestones = milestonesFromDb.length > 0 ? milestonesFromDb : TIMELINE_FALLBACK;

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
            <div style={{
              background: "var(--bg-card)",
              borderLeft: "3px solid var(--accent)",
              padding: "2rem 2.5rem",
              margin: "2rem 0",
              position: "relative",
              overflow: "hidden",
            }}>
              <div aria-hidden style={{
                position: "absolute", top: "-1rem", right: "1.5rem",
                fontFamily: "var(--font-orbitron)", fontSize: "6rem",
                color: "var(--accent)", opacity: 0.06, lineHeight: 1,
                userSelect: "none", pointerEvents: "none",
              }}>&quot;</div>
              <p style={{
                fontFamily: "var(--font-space)",
                fontSize: "clamp(1rem, 1.8vw, 1.15rem)",
                lineHeight: 1.75,
                color: "var(--text-primary)",
                margin: 0, position: "relative", zIndex: 1,
              }}>
                A future-ready community where technology, innovation, and teamwork
                converge, shaping the next generation of leaders in mobility, robotics,
                and digital transformation.
              </p>
              <div style={{
                marginTop: "1rem",
                fontFamily: "var(--font-mono)", fontSize: "0.7rem",
                letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase",
              }}>
                Team Vegavath -- Club Vision
              </div>
            </div>
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
            {milestones.map((entry, index) => (
              <Reveal key={entry.id} delay={index * 0.08}>
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
                  <time className="mono" dateTime={entry.date_label} style={{ fontSize: "0.75rem", letterSpacing: "0.18em", color: "var(--accent)" }}>
                    {entry.date_label}
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
                  <p style={{ marginTop: "0.6rem", fontSize: "clamp(0.875rem, 1.2vw, 0.95rem)", lineHeight: 1.6, color: "var(--text-secondary)" }}>
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

      {/* S49 LLM/AI SEO: FAQPage schema. Not rendered for users - it exists so
          answer engines can quote the club's own wording on the questions they
          get asked about it. Expanded to ten in S50. Keep the copy in sync with
          public/llms.txt. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "What is Team Vegavath?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Team Vegavath is the motorsport and innovation student club at PES University Electronic City Campus (PESU ECC) in Bangalore, India. The club designs and builds custom go-karts, develops robotics and embedded systems, and organizes technical events including hackathons and open-house showcases.",
                },
              },
              {
                "@type": "Question",
                name: "How can I join Team Vegavath?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Applications open annually at vegavath.live/join. The club recruits across six domains: Coding, Automotives, Robotics, Operations, Sponsorship, and Social Media.",
                },
              },
              {
                "@type": "Question",
                name: "What events does Team Vegavath run?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Team Vegavath organizes EmbedX (an embedded systems and IoT hackathon with Xylem), Ignition (an overnight IoT hackathon), Bootstrap (an annual open-house for PESU ECC freshers), and participates in karting competitions.",
                },
              },
              {
                "@type": "Question",
                name: "Who sponsors Team Vegavath?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Current partners include Xylem, Ather Energy, Paper Boat, Mahindra, BMW Motorrad, and SOLIDWORKS.",
                },
              },
              {
                "@type": "Question",
                name: "Where is Team Vegavath based?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Team Vegavath is based at PES University Electronic City Campus (PESU ECC), Bangalore, Karnataka, India.",
                },
              },
              // S50: five more questions, targeting the named-entity queries
              // (Bootstrap, EmbedX, go-karts, domains, faculty advisor).
              {
                "@type": "Question",
                name: "What is Bootstrap at PESU ECC?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Bootstrap is Team Vegavath's annual open-house event at PESU ECC where student clubs showcase their projects to incoming freshers. Team Vegavath's Bootstrap features go-kart displays, robotics demonstrations, and hands-on exhibits across multiple engineering domains.",
                },
              },
              {
                "@type": "Question",
                name: "What is EmbedX?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "EmbedX is an embedded systems and IoT hackathon organized by Team Vegavath in partnership with Xylem and the Department of ECE, PESU ECC. Teams build firmware and hardware solutions for real-world problem statements over 10 hours.",
                },
              },
              {
                "@type": "Question",
                name: "Does Team Vegavath build go-karts?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Team Vegavath designs and builds custom go-karts covering chassis fabrication, suspension design, engine tuning, and electronics. The kart is the club's flagship project and is demonstrated at Bootstrap and other PESU ECC events.",
                },
              },
              {
                "@type": "Question",
                name: "What domains can I join in Team Vegavath?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Team Vegavath recruits across six domains: Automotives (kart design and fabrication), Robotics (autonomous systems and embedded hardware), Coding (software, web, and firmware), Operations (event management and logistics), Sponsorship (partnerships and finance), and Social Media (content and outreach).",
                },
              },
              {
                "@type": "Question",
                name: "Who is the faculty advisor of Team Vegavath?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Team Vegavath's faculty advisor is Dr. S. V. Satish, Professor in the Department of Mechanical Engineering at PES University Electronic City Campus. Dr. Satish holds a PhD and MTech in Manufacturing Engineering and has spoken at international IEEE robotics and automation conferences.",
                },
              },
            ],
          }),
        }}
      />
    </main>
  );
}
