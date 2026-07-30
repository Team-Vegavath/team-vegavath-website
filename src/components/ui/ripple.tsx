import { memo, type CSSProperties } from "react";

/* S60 -- Magic UI Ripple, adapted. Source checked via Context7
 * (/magicuidesign/magicui): props are `mainCircleSize` / `mainCircleOpacity` /
 * `numCircles`, and the animation is a registry `cssVars` entry
 * (`ripple var(--duration,2s) ease calc(var(--i,0)*.2s) infinite`) with
 * keyframes scaling 1 -> 0.9 -> 1. That registry mechanism is Tailwind v4
 * `@theme`, which this project does not use, so the keyframes and the class
 * live in globals.css as `.ripple-ring` / `@keyframes ripple-scale` and `--i`
 * is set per ring inline. Same split S58 used for ScrollProgress.
 *
 * Four adaptations worth knowing:
 *
 * 1. RINGS ARE SQUARE, NOT ROUND. Upstream gives them a full pill radius, which
 *    this project bans outright (CLAUDE.md exempts only RacingCursor). Concentric
 *    sharp rings read as a technical reticle and suit the editorial aesthetic;
 *    if round rings are wanted, the change is one `borderRadius: "50%"` below.
 * 2. RINGS ARE var(--bg-base), NOT var(--accent). The brief asked for
 *    accent-tinted rings "on the dark background", but the only place this is
 *    mounted -- the homepage JOIN THE TEAM CTA -- has `background:
 *    var(--accent)` itself. Accent rings on an accent panel are invisible, so
 *    they are dark-on-orange instead.
 * 3. No `cn()`: clsx and tailwind-merge are still not in package.json (S59), so
 *    className passes straight through.
 * 4. `shadow-xl` and `bg-foreground/25` are dropped -- the design bans glows,
 *    and a filled circle behind a filled panel does nothing. Border only.
 *
 * No "use client": no hooks, no handlers, so it renders in either tree.
 */

type RippleProps = {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
  style?: CSSProperties;
};

export const Ripple = memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className,
  style,
}: RippleProps) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        userSelect: "none",
        maskImage: "linear-gradient(to bottom, white, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, white, transparent)",
        ...style,
      }}
    >
      {Array.from({ length: numCircles }, (_, i) => (
        <div
          key={i}
          className="ripple-ring"
          style={
            {
              "--i": i,
              position: "absolute",
              top: "50%",
              left: "50%",
              width: `${mainCircleSize + i * 70}px`,
              height: `${mainCircleSize + i * 70}px`,
              opacity: mainCircleOpacity - i * 0.03,
              border: "1px solid var(--bg-base)",
              transform: "translate(-50%, -50%) scale(1)",
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
});
