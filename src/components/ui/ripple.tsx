"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/* S60 -- Magic UI Ripple, adapted. Source checked via Context7
 * (/magicuidesign/magicui): props were `mainCircleSize` / `mainCircleOpacity` /
 * `numCircles`, and the animation is a registry `cssVars` entry with keyframes
 * scaling 1 -> 0.9 -> 1. That registry mechanism is Tailwind v4 `@theme`, which
 * this project does not use, so the keyframes and the classes live in
 * globals.css and `--i` is set per ring inline. Same split S58 used for
 * ScrollProgress.
 *
 * Kept from S60:
 *  - RINGS ARE SQUARE, NOT ROUND. Upstream gives them a full pill radius, which
 *    this project bans outright (CLAUDE.md exempts only RacingCursor).
 *  - RINGS ARE var(--bg-base), NOT var(--accent). The only mount site -- the
 *    homepage JOIN THE TEAM CTA -- has `background: var(--accent)` itself, so
 *    accent rings on it would be invisible. Dark-on-orange is a contrast
 *    decision, and S69 re-confirmed it rather than reversing it (see below).
 *  - No `cn()`: clsx and tailwind-merge are still not in package.json.
 *  - No shadow, no fill. The design bans glows.
 *
 * ── S69: the rings follow the cursor, and they are smaller ──────────────────
 *
 * WHY IT READ AS INVISIBLE, and it was not the colour. The opacities were
 * multiplied together: `mainCircleOpacity` 0.24 on the first ring, inside a
 * wrapper the mount site set to `opacity: 0.3`. 0.24 x 0.3 = 0.072. The
 * brightest ring on the panel was rendering at 7% and the faintest at 1%. The
 * fix is removing the compounding, not repainting the rings -- the wrapper
 * opacity is gone and the per-ring value is the only one left. Dark-on-orange
 * at 0.28 with a 1.5px border reads clearly, so the S60 colour direction
 * stands.
 *
 * SMALLER: base 210px -> 100px, step 70px -> 36px, 8 rings -> 4. The largest
 * ring goes 700px -> 208px, which is what makes them read as a localised
 * reticle around the pointer rather than as texture washing the whole panel.
 *
 * The upstream `maskImage: linear-gradient(to bottom, white, transparent)` is
 * dropped. It faded the rings out toward the bottom of the panel, which was
 * harmless when they were static and centred but would delete them entirely
 * whenever the cursor was in the lower half.
 *
 * POINTER TRACKING reuses smooth-cursor.tsx's shape rather than inventing a
 * second one in this codebase: the same `(any-hover: hover) and (any-pointer:
 * fine)` gate, a `pointermove` listener on window, and a rAF throttle. It
 * differs in one way on purpose -- smooth-cursor drives framer-motion
 * `useSpring` MotionValues, and this writes `transform` to a ref imperatively
 * instead. Springs here would mean a MotionValue per ring; one imperative
 * translate3d on a single follower element moves all four rings with zero React
 * re-renders per frame, and the lag comes from a CSS transition on that one
 * transform. `setVisible` is the only state that touches React, and it only
 * changes when the pointer crosses the panel edge, not per frame.
 *
 * This file is now "use client" -- cursor tracking needs hooks. The CTA section
 * in page.tsx stays a SERVER component and simply mounts this, which is the
 * same boundary S62 drew for ProjectsTeaser rather than converting a whole
 * section.
 *
 * ── S70: track AND pulse, and the touch anchor moves to the button ───────────
 *
 * No JS changed. Both fixes are CSS, because the structure S69 built already
 * separates the two transforms onto two elements -- .ripple-follow translates,
 * .ripple-ring scales -- so re-enabling the pulse in cursor mode needed the
 * keyframe rule promoted off the touch-fallback selector, not a rewrite. S69's
 * claim that the two modes were "mutually exclusive by design" was a prediction
 * about how it would look, not a constraint the code imposed. Full reasoning and
 * the two things that had to be verified are in globals.css above
 * @keyframes ripple-scale.
 */

/* Same query smooth-cursor.tsx gates on. `any-*` rather than plain `hover` so a
   touchscreen laptop with a trackpad still tracks. */
const DESKTOP_POINTER_QUERY = "(any-hover: hover) and (any-pointer: fine)";

const RING_COUNT = 4;
const BASE_SIZE = 100;
const RING_STEP = 36;
const BASE_OPACITY = 0.28;

/* Must match the y-offset in the mount site's clipPath:
   polygon(0 32px, 100% 0, 100% 100%, 0 100%). */
const SLANT_PX = 32;

export function Ripple() {
  const rootRef = useRef<HTMLDivElement>(null);
  const followRef = useRef<HTMLDivElement>(null);
  const [tracks, setTracks] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_POINTER_QUERY);
    const update = () => setTracks(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!tracks) return;

    let rafId = 0;

    const onPointerMove = (e: PointerEvent) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;

        const root = rootRef.current;
        const follow = followRef.current;
        if (!root || !follow) return;

        const rect = root.getBoundingClientRect();
        const ox = e.clientX - rect.left;
        const oy = e.clientY - rect.top;

        /* EXACT wedge test, not a bounding-box approximation -- and exact is
           the cheaper of the two here. The panel's clip-path is a rectangle
           with one slanted edge: a straight line from (0, 32) to (width, 0).
           So "inside" is one linear inequality, and `oy >= slantY` also
           subsumes the `oy >= 0` box check, because the slant is never
           negative. Writing the comment defending an approximation would have
           been longer than the arithmetic it replaced. */
        const slantY = SLANT_PX * (1 - ox / rect.width);
        const isInside = ox >= 0 && ox <= rect.width && oy <= rect.height && oy >= slantY;

        setVisible(isInside);
        if (isInside) follow.style.transform = `translate3d(${ox}px, ${oy}px, 0)`;
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [tracks]);

  return (
    <div ref={rootRef} aria-hidden="true" className="ripple-root">
      {/* A 0x0 anchor. The rings centre themselves on it with
          translate(-50%, -50%), so moving this one element moves all four. On
          touch there is no pointer to follow, so CSS parks it -- S70 parks it on
          the APPLY NOW button (left: 50%; bottom: 7rem) rather than S69's panel
          centre, which was in the gap between the heading and the paragraph. The
          coordinate is arithmetic, not a measurement; the reasoning is in
          .ripple-follow[data-tracking="false"]. */}
      <div
        ref={followRef}
        className="ripple-follow"
        data-tracking={tracks}
        data-visible={visible}
      >
        {Array.from({ length: RING_COUNT }, (_, i) => (
          <div
            key={i}
            className="ripple-ring"
            style={
              {
                "--i": i,
                width: `${BASE_SIZE + i * RING_STEP}px`,
                height: `${BASE_SIZE + i * RING_STEP}px`,
                opacity: BASE_OPACITY - i * 0.05,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
