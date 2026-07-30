"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

import { Reveal } from "@/components/ui/Reveal";

/* S62/D2: the S60 projects teaser, lifted out of (public)/page.tsx unchanged so
   it can take a scroll-linked parallax. The extraction was forced, not stylistic:
   page.tsx is a server component, and useScroll/useTransform in it would be a
   build error (tasks.md's performance gate greps for exactly that).

   This is the "kart parallax" item, minus the kart. The homepage deliberately
   has no kart asset any more -- S60 moved the 3D model to /projects/kart to keep
   canvas/WebGL off `/` -- so the parallax layer is the shield logo at 0.04
   opacity. transform + opacity only, one composited layer, no canvas: the same
   budget the CSS-transform rule in tasks.md asks for.

   offset ["start end", "end start"] measures the section's own travel through
   the viewport, so the drift is tied to this section rather than page scroll. */

const LOGO_URL = "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/icons/logo.png";

export function ProjectsTeaser() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

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
          <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "3rem 0" }}>
            <p className="label-tech" style={{ marginBottom: "1rem", color: "var(--accent)" }}>
              What we build
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
              <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", fontWeight: 700, textTransform: "uppercase" }}>
                GO-KARTS. ROBOTS. MORE.
              </h2>
              <Link
                href="/projects"
                className="mono"
                style={{ fontSize: "0.75rem", color: "var(--accent)", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}
              >
                VIEW PROJECTS →
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
