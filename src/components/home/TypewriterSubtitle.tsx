"use client";

import { TypeAnimation } from "react-type-animation";

/* S60 -- typewriter for the homepage hero tagline.
 *
 * API verified against the installed package's own .d.ts (Context7 has no
 * index for react-type-animation), so these are the real constraints:
 *   - `TypeAnimation` is a NAMED export.
 *   - `speed` is a union of the integers 1..99 on an inverse scale (higher =
 *     faster). It is NOT milliseconds. 60 is roughly "brisk".
 *   - `repeat` is typed `number`; Infinity satisfies that.
 *   - the cursor is a `::after` with `content: '|'` and an opacity blink. It
 *     carries no color of its own, so it inherits var(--accent) from the
 *     element below. Nothing to adapt, no hardcoded hex.
 *
 * This replaces the accent `.heading` tagline, so it reproduces that element's
 * styles exactly rather than the mono/secondary treatment the brief sketched --
 * the point is that the hero looks unchanged at rest.
 *
 * "KARTS. CODE. INNOVATION." is deliberately NOT in the sequence: that exact
 * string is the static <p> directly underneath this element in page.tsx, and
 * cycling to it would print the same words twice, ten pixels apart.
 *
 * Accessibility: mid-cycle the text is a partial string. Same containment
 * pattern S59 used for HyperText -- the real tagline lives in a .sr-only span
 * (globals.css:99) and the animating copy is aria-hidden, so assistive tech
 * never reads a half-typed line.
 */
export function TypewriterSubtitle() {
  return (
    <>
      <span className="sr-only">Life at full throttle. PESU ECC.</span>
      <TypeAnimation
        aria-hidden="true"
        className="heading hero-typewriter"
        sequence={[
          "LIFE AT FULL THROTTLE · PESU ECC",
          3000,
          "BUILT BY STUDENTS. FOR STUDENTS.",
          3000,
          "SIX DOMAINS. ONE TEAM.",
          3000,
        ]}
        wrapper="p"
        speed={60}
        repeat={Infinity}
        style={{
          marginTop: "1.5rem",
          fontWeight: 600,
          fontSize: "clamp(0.8rem, 2vw, 1rem)",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--accent)",
        }}
      />
    </>
  );
}
