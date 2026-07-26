import type { Metadata } from "next";
import Link from "next/link";
import { getUpcomingEvents, getPastEvents } from "@/lib/services/events";
import { getActiveSponsors } from "@/lib/services/sponsors";
import { DomainGrid } from "@/components/home/DomainGrid";
import { StatsTicker } from "@/components/home/StatsTicker";
import { EventsPreview } from "@/components/home/EventsPreview";
import { SponsorMarquee } from "@/components/sponsors/SponsorMarquee";
import { Reveal } from "@/components/ui/Reveal";
import KartModelWrapper from "@/components/home/KartModelWrapper";

export const metadata: Metadata = {
  title: {
    absolute: "Team Vegavath | Karts, Code & Innovation at PESU ECC",
  },
  alternates: { canonical: "/" },
};

export const revalidate = 60;

export default async function HomePage() {
  const [upcomingEvents, pastEvents, sponsors] = await Promise.all([
    getUpcomingEvents(3).catch(() => []),
    getPastEvents(3).catch(() => []),
    getActiveSponsors().catch(() => []),
  ]);

  return (
    // pattern-speed-lines sets background-color: var(--bg-base) itself; an inline
    // background shorthand here would override the pattern image, so none is set.
    <div className="pattern-speed-lines" style={{ width: "100%", color: "var(--text-primary)" }}>
      {/* Hero */}
      <section
        className="pattern-speed-lines"
        style={{
          position: "relative",
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "6rem 1.5rem 4rem",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: "72rem", margin: "0 auto", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "clamp(48px, 12vw, 140px)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: "var(--text-primary)",
              wordBreak: "keep-all",
            }}
          >
            VEGAVATH
          </h1>

          <p
            className="heading"
            style={{
              marginTop: "1.5rem",
              fontWeight: 600,
              fontSize: "clamp(0.8rem, 2vw, 1rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            Life At Full Throttle · PESU ECC
          </p>

          <p style={{ marginTop: "0.9rem", fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "var(--text-secondary)" }}>
            Karts. Code. Innovation.
          </p>

          <div style={{ marginTop: "2.75rem", display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/join" className="btn-primary">
              JOIN THE TEAM
            </Link>
            <Link href="/events" className="btn-outline">
              VIEW EVENTS
            </Link>
          </div>
        </div>
      </section>

      {/* Stats ticker */}
      <StatsTicker />

      {/* 3D kart */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ margin: "0 auto", maxWidth: "72rem" }}>
          <Reveal>
            <h2 style={{ marginBottom: "3rem", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700 }}>
              THE BUILD
            </h2>
            <KartModelWrapper />
          </Reveal>
        </div>
      </section>

      {/* Domains */}
      <section style={{ padding: "2rem 1.5rem 5rem" }}>
        <div style={{ margin: "0 auto", maxWidth: "72rem" }}>
          <Reveal>
            <p className="label-tech" style={{ marginBottom: "0.75rem", color: "var(--accent)" }}>
              Six domains, one team
            </p>
            <DomainGrid />
          </Reveal>
        </div>
      </section>

      {/* Events */}
      <section style={{ padding: "5rem 1.5rem", background: "var(--bg-surface)" }}>
        <div style={{ margin: "0 auto", maxWidth: "72rem" }}>
          <EventsPreview
            upcoming={upcomingEvents.map(({ slug, title, category, event_date, cover_image_url }) => ({ slug, title, category, event_date, cover_image_url }))}
            past={pastEvents.map(({ slug, title, category, event_date, cover_image_url }) => ({ slug, title, category, event_date, cover_image_url }))}
          />
        </div>
      </section>

      {/* Sponsors strip */}
      {sponsors.length > 0 ? (
        <section style={{ padding: "4rem 0" }}>
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

      {/* Join CTA */}
      <section
        className="pattern-speed-lines-strong"
        style={{
          background: "var(--accent)",
          clipPath: "polygon(0 32px, 100% 0, 100% 100%, 0 100%)",
          padding: "7rem 1.5rem 5.5rem",
          marginTop: "2rem",
        }}
      >
        <div style={{ margin: "0 auto", maxWidth: "56rem", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(2.25rem, 6vw, 3.75rem)", fontWeight: 700, color: "var(--bg-base)", letterSpacing: "0.01em" }}>
            JOIN THE TEAM
          </h2>
          <p style={{ marginTop: "1rem", fontSize: "1.05rem", color: "rgba(10, 10, 10, 0.75)" }}>
            Build karts, ship code, and run the biggest events on campus, with 85 students who take it seriously.
          </p>
          <div style={{ marginTop: "2.25rem" }}>
            <Link
              href="/join"
              className="heading"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-base)",
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: "0.9rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "0.9rem 2.5rem",
                textDecoration: "none",
              }}
            >
              APPLY NOW
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
