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
 * Two decisions worth knowing:
 *
 * 1. FLIPS ARE INDEPENDENT, not radio-style. `flipped` is a Set, so several
 *    tiles can be open at once. A single-active string would be one line
 *    shorter but would re-create the modal's one-at-a-time behaviour, which is
 *    the thing being removed.
 * 2. THE TILE IS A REAL <button>. S20 had role="button" + tabIndex + a manual
 *    Enter/Space handler on a div; a native button deletes all three and gets
 *    focus-visible for free. The UA styles it brings are neutralised in
 *    .domain-flip. Both faces stay in the DOM, so assistive tech reads the
 *    description whether or not the tile is flipped -- better than the modal,
 *    where it did not exist until opened.
 */

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
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set());

  // Set.delete returns whether it removed anything, so it doubles as the
  // "was it already open" test and the toggle is one branch.
  const toggle = (name: string) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (!next.delete(name)) next.add(name);
      return next;
    });

  return (
    <div className="domain-grid">
      {DOMAINS.map((domain) => {
        const isFlipped = flipped.has(domain.name);

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
