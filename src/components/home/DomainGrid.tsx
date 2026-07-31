"use client";

import { useState } from "react";

/* Shared by / and /about -- any change here lands on both pages.
 *
 * S69: the S20 click-to-modal is gone. Clicking a tile now flips it in place
 * and the description lives on the back face, which deleted the AnimatePresence
 * card, the fixed backdrop, the Escape listener and the body-scroll lock along
 * with it -- four pieces of global state for text that fits in the tile it came
 * from. framer-motion is no longer imported here at all; a CSS rotateY needs no
 * JS timeline.
 *
 * THE TILE IS A REAL <button>. S20 had role="button" + tabIndex + a manual
 * Enter/Space handler on a div; a native button deletes all three and gets
 * focus-visible for free. The UA styles it brings are neutralised in
 * .domain-flip. Both faces stay in the DOM, so assistive tech reads the
 * description whether or not the tile is flipped -- better than the modal, where
 * it did not exist until opened.
 *
 * S70: FLIPS ARE SINGLE-ACTIVE. This reverses S69's deliberate choice, not a
 * bug. S69 made `flipped` a Set so several tiles could be open at once, on the
 * grounds that a single active value "would re-create the modal's one-at-a-time
 * behaviour, which is the thing being removed." That reasoning is overridden by
 * direct visual feedback: the objection to the modal was the modal -- the fixed
 * backdrop, the scroll lock, the Escape listener -- not one-at-a-time reading.
 * Six tiles flipped at once is a wall of body copy where the grid used to be.
 * `string | null` also deletes the Set-clone-per-toggle, so the reversal is
 * strictly less code than the thing it replaces.
 *
 * S71A: EACH DOMAIN HAS AN ICON, AND IT IS INLINE RATHER THAN AN <Image>.
 *
 * The same six marks are also uploaded to R2 at icons/domain-*.svg, kept as the
 * source of truth if anything outside this bundle ever needs them (a deck, an
 * OG image, a poster). Nothing in the app reads them, and that is on purpose --
 * three concrete things go wrong if these become remote images:
 *
 *   1. THE HOVER STATE BREAKS. .domain-face-front turns var(--accent) on hover,
 *      so an accent-stroked file becomes invisible against its own background
 *      at exactly the moment it is being looked at. Inline, the icon inherits
 *      `color` and flips to var(--bg-base) with the name in ONE rule, because
 *      every path is stroke: currentColor. As a file it would need a
 *      filter: brightness(0) invert(1) hack.
 *   2. next/image REFUSES a remote SVG unless next.config sets
 *      dangerouslyAllowSVG, and AGENTS.md bans <img>. So the file route costs a
 *      config change and a security exception for zero gain.
 *   3. Six HTTP requests for 2.3KB of total markup. The whole set inlined is
 *      smaller than one of the round-trips it would replace.
 *
 * This is also just what the rest of the site already does -- /about's values
 * icons, the footer socials, the admin sidebar and KartModelSection's tap
 * indicator are all inline SVG. The `common` spread and the 4.2% stroke ratio
 * (2 at a 48 viewBox = 1.5 at /about's 36) are lifted from ValueIcon so the two
 * sets read as one family rather than two.
 *
 * Keyed on `abbr`, not `name`: it is the shorter stable code, and it is already
 * in the data.
 */

function DomainIcon({ abbr }: { abbr: string }) {
  /* stroke-linecap/linejoin are omitted, not forgotten -- butt and miter are
     the SVG defaults, and they are already the sharp-cornered values this site
     wants. Declaring them would be noise claiming to be a safeguard. */
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2 };

  return (
    <svg className="domain-icon" width="36" height="36" viewBox="0 0 48 48" aria-hidden="true">
      {/* Angle brackets and a slash. The one dev mark that needs no caption. */}
      {abbr === "COD" && (
        <>
          <path d="M18 15 L9 24 L18 33" {...common} />
          <path d="M30 15 L39 24 L30 33" {...common} />
          <path d="M27 12 L21 36" {...common} />
        </>
      )}

      {/* A wheel with speed lines, NOT a kart. A kart side-profile is 3.6:1, so
          in a square box shared with five other icons it reads as a thin sliver
          at half their optical weight. The speed lines echo
          pattern-speed-lines, which the homepage already renders behind this. */}
      {abbr === "AUT" && (
        <>
          <circle cx="30" cy="24" r="12" {...common} />
          <circle cx="30" cy="24" r="4.5" {...common} />
          <path d="M30 12 L30 19.5" {...common} />
          <path d="M19.6 30 L26.1 26.3" {...common} />
          <path d="M40.4 30 L33.9 26.3" {...common} />
          <path d="M7 18 L15 18" {...common} />
          <path d="M6 24 L15 24" {...common} />
          <path d="M7 30 L15 30" {...common} />
        </>
      )}

      {/* Ascending bars under a rising chevron: growth, which is what
          sponsorship funding is. An abstracted handshake (two facing chevrons)
          was rejected -- at tile scale it is COD's chevron pair mirrored. */}
      {abbr === "S&F" && (
        <>
          <path d="M8 38 L40 38" {...common} />
          <path d="M11 38 L11 29 L18 29 L18 38" {...common} />
          <path d="M21 38 L21 22 L28 22 L28 38" {...common} />
          <path d="M31 38 L31 15 L38 15 L38 38" {...common} />
          <path d="M30.5 12 L34.5 8 L38.5 12" {...common} />
        </>
      )}

      {/* A gripper: base, stem, wrist, two jaws. More specific than a bot head,
          and it shares no silhouette with the wheel above it. */}
      {abbr === "ROB" && (
        <>
          <path d="M18 38 L30 38" {...common} />
          <path d="M24 38 L24 29" {...common} />
          <path d="M15 29 L33 29" {...common} />
          <path d="M15 29 L15 21 L10 14" {...common} />
          <path d="M33 29 L33 21 L38 14" {...common} />
        </>
      )}

      {/* A stopwatch. Gears are the cliche, and for a motorsport team ops maps
          to pit and timing discipline anyway. */}
      {abbr === "OPS" && (
        <>
          <circle cx="24" cy="28" r="12" {...common} />
          <path d="M24 16 L24 11" {...common} />
          <path d="M20 11 L28 11" {...common} />
          <path d="M33.5 18.5 L36.5 15.5" {...common} />
          <path d="M24 28 L24 21" {...common} />
          <path d="M24 28 L29 32" {...common} />
        </>
      )}

      {/* Broadcast arcs off a solid node. OPEN arcs anchored bottom-left,
          deliberately, so it cannot be confused with OPS's closed centred
          circle once these are down at 24px somewhere. */}
      {abbr === "SOC" && (
        <>
          <path d="M13 26 A 9 9 0 0 1 22 35" {...common} />
          <path d="M13 19 A 16 16 0 0 1 29 35" {...common} />
          <path d="M13 12 A 23 23 0 0 1 36 35" {...common} />
          <path d="M10 32 L16 32 L16 38 L10 38 Z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

const DOMAINS = [
  {
    abbr: "COD",
    name: "Coding",
    description:
      "Embedded systems, automotive software, robotics code, internal tools, full-stack web. We build everything the team runs on.",
  },
  {
    abbr: "AUT",
    name: "Automotives",
    description:
      "Chassis, drivetrain, suspension, electronics. We design and build the kart from the ground up and take it to the track.",
  },
  {
    abbr: "S&F",
    name: "Sponsorship & Finance",
    description:
      "The fuel behind everything. We build industry partnerships and manage the resources that keep the club running.",
  },
  {
    abbr: "ROB",
    name: "Robotics",
    description: "Autonomous systems, sensors, and control logic. We build machines that think and move.",
  },
  {
    abbr: "OPS",
    name: "Operations",
    description: "Logistics, planning, and execution. We make events happen from concept to cleanup.",
  },
  {
    abbr: "SOC",
    name: "Social Media",
    description: "The club's voice. Photography, content, and the story of everything we build.",
  },
] as const;

export function DomainGrid() {
  const [flipped, setFlipped] = useState<string | null>(null);

  // Flipping a new tile closes whichever one was open: assigning the name IS the
  // close, so there is nothing to clear first.
  const toggle = (name: string) => setFlipped((prev) => (prev === name ? null : name));

  return (
    <div className="domain-grid">
      {DOMAINS.map((domain) => {
        const isFlipped = flipped === domain.name;

        return (
          <button
            key={domain.name}
            type="button"
            className="domain-flip"
            aria-pressed={isFlipped}
            onClick={() => toggle(domain.name)}
          >
            <span className="domain-flip-inner" data-flipped={isFlipped}>
              <span className="domain-face domain-face-front">
                <span className="domain-letter" aria-hidden="true">
                  {domain.abbr}
                </span>
                {/* Sits in flow ABOVE the name rather than replacing the ghost
                    letter. The letter is a 15%-opacity watermark pinned
                    top-right -- it is texture, not a mark -- and the front face
                    is bottom-aligned, so there was a dead band in the middle of
                    every tile. The icon is what fills it. */}
                <DomainIcon abbr={domain.abbr} />
                <span className="domain-name">{domain.name}</span>
              </span>

              <span className="domain-face domain-face-back">
                <span className="domain-back-abbr" aria-hidden="true">
                  {domain.abbr}
                </span>
                <span className="domain-back-text">{domain.description}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
