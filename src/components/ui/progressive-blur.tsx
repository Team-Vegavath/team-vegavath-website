// Magic UI ProgressiveBlur (magicui.design/docs/components/progressive-blur),
// adapted. Fades the trailing edge of a SCROLLING container so the content
// dissolves into the background instead of hard-cutting at the edge.
//
// Wired in S64 to SponsorMarquee, at position "left" and "right". The original
// S59 target (/crew) has no overflow: .crew-grid is a wrapping CSS grid with no
// fixed height and no scroll container, so every card is already fully visible
// and there is no hard cut to soften. SponsorMarquee's .marquee-track
// (globals.css) is the one real clipped overflow on the site, and S64 added the
// horizontal left/right variant for it. That component renders on / and /about
// (NOT /sponsors -- that page uses the static .sponsor-grid).
//
// Adaptations from upstream:
//  - no cn(): clsx and tailwind-merge are not in package.json (see S58).
//    className is passed straight through instead.
//  - upstream's Tailwind positioning classes (absolute inset-x-0 z-10 top-0)
//    are inline styles here. Roughly 447 unlayered rules in globals.css beat
//    @layer utilities, so a utility class on an overlay is a cascade gamble;
//    the component needs an inline style for the mask anyway.
//  - upstream hardcodes 12.5% mask steps, which only lines up with its
//    8-entry blurLevels default. Here the step is 100 / blurLevels.length, so
//    any layer count produces a correct ramp, and the three near-identical
//    upstream blocks (first / middle / last layer) collapse into one map.
//  - DEFAULT LAYER COUNT IS 4, NOT 8. Each layer is its own backdrop-filter,
//    which is a real GPU cost per frame, not the "free CSS" the mask-image
//    part suggests. tasks.md's performance budget targets budget Android; 8
//    stacked backdrop-filters on a scrolling container is exactly what stutters
//    there. Four reads the same at these sizes. Raise it only after measuring.
//  - aria-hidden: pure decoration.
//
// No hooks and no events, so this is deliberately NOT a client component -- it
// renders as static markup in either a server or a client tree.

import type { CSSProperties } from "react";

export interface ProgressiveBlurProps {
  className?: string;
  /** Extent of the fade along its own axis, as any CSS length: height for
   *  "top"/"bottom", width for "left"/"right". Ignored when position is "both". */
  height?: string;
  position?: "top" | "bottom" | "both" | "left" | "right";
  /** Blur radius in px per layer, weakest first. */
  blurLevels?: number[];
  style?: CSSProperties;
}

const DEFAULT_BLUR_LEVELS = [0.5, 2, 8, 32];

export function ProgressiveBlur({
  className,
  height = "30%",
  position = "bottom",
  blurLevels = DEFAULT_BLUR_LEVELS,
  style,
}: ProgressiveBlurProps) {
  const layers = blurLevels.length;
  const step = 100 / layers;
  const horizontal = position === "left" || position === "right";
  const axis =
    position === "top" ? "to top" : position === "left" ? "to left" : position === "right" ? "to right" : "to bottom";

  const maskFor = (index: number) => {
    // "both" is a single symmetric ramp, so every layer shares one mask and
    // they simply stack -- there is no directional progression to build.
    if (position === "both") {
      return "linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)";
    }
    // The last layer runs to the very edge instead of fading back out, so the
    // strongest blur is what actually touches the boundary.
    if (index === layers - 1) {
      return `linear-gradient(${axis}, rgba(0,0,0,0) ${(layers - 1) * step}%, rgba(0,0,0,1) 100%)`;
    }
    const start = index * step;
    return `linear-gradient(${axis}, rgba(0,0,0,0) ${start}%, rgba(0,0,0,1) ${start + step}%, rgba(0,0,0,1) ${start + step * 2}%, rgba(0,0,0,0) ${start + step * 3}%)`;
  };

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        zIndex: 10,
        pointerEvents: "none",
        ...(horizontal
          ? // Horizontal variant spans the full height and is `height` wide.
            { top: 0, bottom: 0, width: height, ...(position === "left" ? { left: 0 } : { right: 0 }) }
          : {
              left: 0,
              right: 0,
              height: position === "both" ? "100%" : height,
              ...(position === "top" ? { top: 0 } : position === "bottom" ? { bottom: 0 } : { top: 0, bottom: 0 }),
            }),
        ...style,
      }}
    >
      {blurLevels.map((blur, index) => {
        const mask = maskFor(index);
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: index + 1,
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
    </div>
  );
}
