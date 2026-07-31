import type { CSSProperties } from "react";

/**
 * Aceternity's Spotlight (ui.aceternity.com/components/spotlight).
 *
 * Confirmed via Context7 before writing this: the classic Spotlight is a single
 * blurred SVG ellipse plus one CSS keyframe -- no framer-motion, no mouse
 * tracking, no browser-only APIs. (The framer-motion version is a *different*
 * component, "Spotlight New".) So this stays a server component: the homepage
 * hero does not gain a "use client" boundary for a decorative light cone.
 *
 * Upstream's geometry is kept verbatim (viewBox, ellipse, transform matrix,
 * 151px blur); only the fill is retokenised to --accent at the low opacity the
 * dark editorial palette can carry. Layout + animation live in globals.css
 * (.spotlight-cone) for the same reason .ripple-ring does: upstream ships them
 * as a Tailwind v4 @theme entry and arbitrary utilities, and this project has
 * no @theme block.
 */
export function Spotlight({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className ? `spotlight-cone ${className}` : "spotlight-cone"}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
      aria-hidden="true"
    >
      <g filter="url(#spotlight-blur)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill="var(--accent)"
          fillOpacity="0.07"
        />
      </g>
      <defs>
        <filter
          id="spotlight-blur"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="spotlightBlur" />
        </filter>
      </defs>
    </svg>
  );
}
