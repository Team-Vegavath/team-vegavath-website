"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { Reveal } from "@/components/ui/Reveal";

/* S62/D2: the S60 projects teaser, lifted out of (public)/page.tsx so it can
   take a scroll-linked parallax. The extraction was forced, not stylistic:
   page.tsx is a server component, and useScroll/useTransform in it would be a
   build error (tasks.md's performance gate greps for exactly that).

   This is the "kart parallax" item, minus the kart. The homepage deliberately
   has no kart asset any more -- S60 moved the 3D model to /projects/kart to keep
   canvas/WebGL off `/` -- so the parallax layer is the shield logo at 0.04
   opacity. transform + opacity only, one composited layer, no canvas: the same
   budget the CSS-transform rule in tasks.md asks for.

   S71 briefly replaced the shield with a hand-drawn SVG kart silhouette and it
   was REVERTED the same session: the ask was never a drawn stand-in in this
   band, it was the real kart on the HERO. A second, lesser kart down here would
   compete with that. The shield stays what it always was -- texture.

   offset ["start end", "end start"] measures the section's own travel through
   the viewport, so the drift is tied to this section rather than page scroll.

   ── S69: the band is one clickable card, and it has content ─────────────────

   THE DIAGNOSIS IS NOT "too static" OR "too invisible", it is EMPTY. Before
   this session the band held a label, a heading and a link -- three lines of
   text and nothing else. Turning the shield up from 4% would only have made a
   bigger watermark behind three lines of text, so the shield is deliberately
   left exactly as it was: it is texture, and it is not the problem.

   What the band gained instead:

   1. REAL CONTENT. It now names the actual builds, driven off PROJECTS below.
      The brief offered a live count ("2 ACTIVE BUILDS") as an option; the
      roster is strictly more information than a count that summarises it, and
      it cannot quietly become a lie the way "ACTIVE" could. PROJECTS is local
      rather than shared with /projects/page.tsx: that page's two cards are
      bespoke prose with their own images and specs, so hoisting a const only
      this file reads would be a second list pretending to be one source of
      truth. The drift risk here is a missing NAME in a teaser, which is
      cosmetic -- not a wrong number presented as data.
   2. ONE IDLE MOTION, and only one. A slow accent hairline crosses the top
      rule every 5s (.teaser-scan). It is not scroll-triggered, so the band is
      alive when it is sitting still, which is what "static" actually meant.
      Two ambient motions would compete with each other and with the parallax,
      so this is the single place the section spends any boldness.
   3. ONE FOCUSABLE ELEMENT. The whole band is the <Link>, and "VIEW PROJECTS"
      is now a <span> inside it rather than its own <a>. That was a real
      nested-interactive bug waiting to happen the moment the block became a
      link, not a style preference. Everything inside is non-interactive text,
      which is what makes a block-level <Link> valid here. */

const LOGO_URL = "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/icons/logo.png";

const PROJECTS = [
  { name: "Go-Kart", domain: "Automotives" },
  { name: "Combat Bot", domain: "Robotics" },
] as const;

export function ProjectsTeaser() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  /* The kart SVG reverted with S71; this did NOT, because it was never part of
     it. The site-wide prefers-reduced-motion block only zeroes
     transition-duration and animation-duration, and a MotionValue driven by
     useTransform is neither -- so this drift has been an uncovered Framer
     animation since S60, sitting silently alongside
     GlyphMatrix/SmoothCursor/HyperText/KartGame on S67's open list. Collapsing
     the range to a constant is the fix for that pre-existing gap and stands on
     its own. useReducedMotion returns boolean | null; the null-before-hydration
     case is falsy, which is the correct default. */
  const reduceMotion = useReducedMotion();
  const y = useTransform(scrollYProgress, [0, 1], reduceMotion ? ["0%", "0%"] : ["-8%", "8%"]);

  return (
    <section ref={ref} style={{ position: "relative", padding: "5rem 1.5rem", overflow: "hidden" }}>
      <motion.div
        aria-hidden="true"
        style={{
          y,
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.04,
          pointerEvents: "none",
        }}
      >
        <Image
          src={LOGO_URL}
          alt=""
          width={520}
          height={520}
          /* Decorative, below the fold, and at 4% opacity -- not worth a
             priority hint or a fetch that blocks anything above it. */
          loading="lazy"
          style={{ width: "min(30rem, 80vw)", height: "auto", objectFit: "contain" }}
        />
      </motion.div>

      <div className="mx-auto" style={{ position: "relative", maxWidth: "72rem" }}>
        <Reveal>
          <Link href="/projects" className="teaser-card">
            {/* The one idle motion. aria-hidden and pointer-events: none in
                CSS -- it is a moving rule, not information. */}
            <span className="teaser-scan" aria-hidden="true" />

            <span className="label-tech teaser-label">What we build</span>

            <span className="teaser-row">
              <span className="teaser-heading">GO-KARTS. ROBOTS. MORE.</span>
              {/* A span, not a second link. See note 3 above. */}
              <span className="teaser-cta mono">
                VIEW PROJECTS <span className="teaser-arrow">&rarr;</span>
              </span>
            </span>

            <span className="teaser-roster">
              {PROJECTS.map((project) => (
                <span key={project.name} className="teaser-roster-item">
                  <span className="teaser-roster-name">{project.name}</span>
                  <span className="teaser-roster-domain">{project.domain}</span>
                </span>
              ))}
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
