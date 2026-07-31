import type { Metadata } from "next";
import Link from "next/link";
import { getUpcomingEvents, getPastEvents } from "@/lib/services/events";
import { getActiveSponsors } from "@/lib/services/sponsors";
import { DomainGrid } from "@/components/home/DomainGrid";
import { StatsTicker } from "@/components/home/StatsTicker";
import { EventsPreview } from "@/components/home/EventsPreview";
import { ProjectsTeaser } from "@/components/home/ProjectsTeaser";
import { SponsorMarquee } from "@/components/sponsors/SponsorMarquee";
import { Reveal } from "@/components/ui/Reveal";
import { BlurFade } from "@/components/ui/blur-fade";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { TypewriterSubtitle } from "@/components/home/TypewriterSubtitle";
import HeroKartWrapper from "@/components/home/HeroKartWrapper";
import { Ripple } from "@/components/ui/ripple";
import { Spotlight } from "@/components/ui/spotlight";

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
          /* S61: the top 6rem is gone. It existed to clear the old 72px navbar;
             the navbar is now a 64px bar with only a logo and a MENU button, so
             the hero can run full-bleed under it and the button floats over the
             hero. The section is a centring flex box, so with equal-ish padding
             the content sits optically centred rather than pushed down. */
          padding: "0 1.5rem 4rem",
          overflow: "hidden",
        }}
      >
        {/* S63: first child so it paints behind the copy. It is a positioned
            element, so the in-flow content below needs its own stacking context
            (position + z-index) to stay on top -- otherwise the cone would
            render over the VEGAVATH h1. pointer-events: none lives in the
            .spotlight-cone class, so the CTAs stay clickable through it. */}
        {/* S71B: the real kart, revolving on scroll behind the wordmark. First
            child so it paints furthest back -- behind the Spotlight cone as well
            as the copy. It is absolutely positioned with pointer-events: none
            internally, so it changes nothing about this section's layout or its
            click targets. The h1 below is still server-rendered HTML and still
            paints before any of this loads; see HeroKart.tsx for why the S60
            no-WebGL-on-/ gate is deliberately reversed. */}
        <HeroKartWrapper />

        <Spotlight />

        <div className="mx-auto" style={{ maxWidth: "72rem", textAlign: "center", position: "relative", zIndex: 1 }}>
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

          {/* S60: the static accent tagline is now a cycling typewriter. It
              reproduces this element's exact styles, so the hero is unchanged
              at rest. The VEGAVATH h1 above stays completely static. */}
          <TypewriterSubtitle />

          <p style={{ marginTop: "0.9rem", fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "var(--text-secondary)" }}>
            Karts. Code. Innovation.
          </p>

          <div style={{ marginTop: "2.75rem", display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
            {/* S58: this is the "JOIN THE TEAM" CTA the brief named, so it gets the
                InteractiveHoverButton. The APPLY NOW button in the bottom CTA
                section is left alone: that section's background IS var(--accent),
                so an accent-filled button would vanish into it. At rest this
                renders identically to the .btn-primary it replaced, so it still
                lines up with VIEW EVENTS beside it. */}
            <InteractiveHoverButton href="/join">JOIN THE TEAM</InteractiveHoverButton>
            <Link href="/events" className="btn-outline">
              VIEW EVENTS
            </Link>
          </div>
        </div>
      </section>

      {/* Stats ticker */}
      {/* S58: `inView` is passed on every BlurFade below. Its default is false,
          which in Magic UI's API means "animate on mount", not "never" -- without
          it these would all fire at once on page load. THE BUILD and Domains
          sections keep <Reveal> instead; nothing is wrapped in both. */}
      <BlurFade inView delay={0.1}>
        <StatsTicker />
      </BlurFade>

      {/* Projects teaser.
          S60/D4: the 3D kart (KartModelWrapper -> KartModelSection) used to sit
          here. It now lives only at /projects/kart, which is what clears
          tasks.md's performance gate that no canvas/WebGL loads on the
          homepage. This teaser takes its slot and drives traffic there, keeping
          the same 5rem/1.5rem padding and 72rem measure so the page rhythm
          below the stats ticker is unchanged.
          S62: extracted to a client component to carry the scroll parallax --
          useScroll cannot run in this server component. Markup is unchanged. */}
      <ProjectsTeaser />

      {/* Domains */}
      <section style={{ padding: "2rem 1.5rem 5rem" }}>
        <div className="mx-auto" style={{ maxWidth: "72rem" }}>
          <Reveal>
            <p className="label-tech" style={{ marginBottom: "0.75rem", color: "var(--accent)" }}>
              Six domains, one team
            </p>
            <DomainGrid />
          </Reveal>
        </div>
      </section>

      {/* Events */}
      <BlurFade inView delay={0.2}>
        <section style={{ padding: "5rem 1.5rem", background: "var(--bg-surface)" }}>
          <div className="mx-auto" style={{ maxWidth: "72rem" }}>
            <EventsPreview
              upcoming={upcomingEvents.map(({ slug, title, category, event_date, cover_image_url }) => ({ slug, title, category, event_date, cover_image_url }))}
              past={pastEvents.map(({ slug, title, category, event_date, cover_image_url }) => ({ slug, title, category, event_date, cover_image_url }))}
            />
          </div>
        </section>
      </BlurFade>

      {/* Sponsors strip */}
      {sponsors.length > 0 ? (
        <BlurFade inView delay={0.2}>
          <section style={{ padding: "4rem 0" }}>
            <div className="mx-auto" style={{ maxWidth: "80rem" }}>
              <h2
                className="heading"
                style={{ textAlign: "center", marginBottom: "1.5rem", fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--text-secondary)" }}
              >
                PARTNERS
              </h2>
              <SponsorMarquee sponsors={sponsors} />
            </div>
          </section>
        </BlurFade>
      ) : null}

      {/* Join CTA */}
      <BlurFade inView delay={0.3}>
        <section
          className="pattern-speed-lines-strong"
          style={{
            position: "relative",
            overflow: "hidden",
            background: "var(--accent)",
            clipPath: "polygon(0 32px, 100% 0, 100% 100%, 0 100%)",
            padding: "7rem 1.5rem 5.5rem",
            marginTop: "2rem",
          }}
        >
          {/* S60: the rings are var(--bg-base), not var(--accent) -- this
              panel's own background IS the accent, so accent rings would be
              invisible on it. Content sits above at zIndex 1; the ripple takes
              zIndex 0 and no pointer events.
              S69: the rings now follow the cursor inside this panel's clipped
              wedge, and Ripple takes no props. The `opacity: 0.3` that used to
              be here was the bug -- it multiplied against each ring's own
              opacity and rendered the brightest one at 7%. zIndex and the
              pointer-events opt-out moved into .ripple-root.
              The SLANT_PX constant in ripple.tsx must match the 32px in the
              clipPath above: it is what makes the hit test follow the visible
              wedge rather than the rectangular bounding box. */}
          <Ripple />

          <div className="mx-auto" style={{ position: "relative", zIndex: 1, maxWidth: "56rem", textAlign: "center" }}>
            <h2 style={{ fontSize: "clamp(2.25rem, 6vw, 3.75rem)", fontWeight: 700, color: "var(--bg-base)", letterSpacing: "0.01em" }}>
              JOIN THE TEAM
            </h2>
            <p style={{ marginTop: "1rem", fontSize: "1.05rem", color: "rgba(10, 10, 10, 0.75)" }}>
              Build karts, ship code, and run the biggest events on campus, with 47 students who take it seriously.
            </p>
            {/* S70/C2: the same InteractiveHoverButton mechanic as the hero, in
                its inverted colour mapping. S60 left this a plain Link because
                this panel's background IS var(--accent), so the default variant
                would vanish into it -- that constraint is why `variant` exists
                rather than a second default call site. Rest is --bg-base fill
                with an --accent label; hover slides an --accent block across and
                the label flips to --bg-base. The border stays --bg-base in both
                states, so at full hover the button is still outlined against the
                accent panel instead of dissolving into it. */}
            <div style={{ marginTop: "2.25rem" }}>
              <InteractiveHoverButton
                href="/join"
                variant="inverted"
                style={{ fontSize: "0.9rem", letterSpacing: "0.1em", padding: "0.9rem 2.5rem" }}
              >
                APPLY NOW
              </InteractiveHoverButton>
            </div>
          </div>
        </section>
      </BlurFade>
    </div>
  );
}
