import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Combat Bot",
  description:
    "Team Vegavath's arena combat robot. This project page is under construction.",
  alternates: { canonical: "/projects/combat-bot" },
  openGraph: {
    title: "Combat Bot | Team Vegavath",
    description: "An arena combat robot by Team Vegavath. Details coming soon.",
  },
};

/* S60/D4 stub. Deliberately kept out of sitemap.ts until it has real content --
   a crawler indexing a "check back soon" page is a thin-content hit for no gain. */
export default function CombatBotPage() {
  return (
    <div style={{ background: "var(--bg-base)", color: "var(--text-primary)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "9rem 1.5rem 6rem" }}>
      <div style={{ textAlign: "center", maxWidth: "30rem" }}>
        <p className="label-tech" style={{ color: "var(--accent)", marginBottom: "0.75rem" }}>
          Robotics · In progress
        </p>
        <h1 className="heading" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, textTransform: "uppercase", marginBottom: "1rem" }}>
          Combat Bot
        </h1>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          This project page is under construction. Check back soon.
        </p>
        <Link
          href="/projects"
          className="mono"
          style={{ fontSize: "0.75rem", color: "var(--text-muted)", textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase", display: "inline-block", marginTop: "2rem" }}
        >
          ← All projects
        </Link>
      </div>
    </div>
  );
}
