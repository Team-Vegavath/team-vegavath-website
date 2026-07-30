"use client";

// Magic UI HyperText (magicui.design/docs/components/hyper-text), adapted.
// Scrambles the characters through a random charset and resolves left-to-right
// into the real text. Fires once after `delay` on mount, and again on hover.
//
// Adaptations from upstream:
//  - framer-motion is NOT used. Upstream wraps everything in a motion element
//    plus an AnimatePresence over per-letter motion.spans, but none of those
//    spans carry initial/animate/exit -- the animation is entirely
//    requestAnimationFrame driven. Dropping them removes a per-frame remount of
//    one span per character for zero visual difference. The cost is that
//    MotionProps can no longer be spread onto the wrapper; nothing needs that.
//  - no per-letter spans at all, for the same reason: the scrambled string is
//    one text node. Keeps letter-spacing, word-spacing and wrapping behaving
//    exactly as they do on plain text.
//  - the `as` prop is dropped. This always renders a <span> and inherits font,
//    size and colour from whatever heading it sits inside -- the same pattern
//    NumberTicker uses inside <p className="stat-number"> (S58). Passing a
//    className instead would put Tailwind utilities against unlayered
//    globals.css rules, which they lose.
//  - upstream's default classes (text-4xl font-bold py-2 overflow-hidden) are
//    gone; they would fight the caller's clamp() font size, and overflow-hidden
//    clips descenders on large display type.
//  - no cn(): clsx and tailwind-merge are not in package.json (see S58).
//  - a11y: mid-animation the text is gibberish, and this is used inside an h1.
//    The real string is rendered in a .sr-only span (globals.css:99) and the
//    scrambling copy is aria-hidden, so the accessible name of the heading is
//    always the finished text.
//
// startOnView is supported for API parity but is a trap on a sticky panel:
// upstream's IntersectionObserver uses rootMargin "-30% 0px -30% 0px", so an
// element pinned near the top of the viewport never intersects and never fires.
// The /join headline uses the default (false = play on mount) for that reason.

import { useEffect, useRef, useState, type CSSProperties } from "react";

export interface HyperTextProps {
  /** The text to animate. */
  children: string;
  className?: string;
  style?: CSSProperties;
  /** Length of the scramble in milliseconds. */
  duration?: number;
  /** Milliseconds before the scramble starts. */
  delay?: number;
  /** Start when scrolled into view instead of on mount. See the note above. */
  startOnView?: boolean;
  animateOnHover?: boolean;
  characterSet?: readonly string[];
}

const DEFAULT_CHARACTER_SET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function HyperText({
  children,
  className,
  style,
  duration = 800,
  delay = 0,
  startOnView = false,
  animateOnHover = true,
  characterSet = DEFAULT_CHARACTER_SET,
}: HyperTextProps) {
  // Seeded with the real text so SSR and the first client render match.
  const [displayText, setDisplayText] = useState(children);
  const [isAnimating, setIsAnimating] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!startOnView) {
      const timer = setTimeout(() => setIsAnimating(true), delay);
      return () => clearTimeout(timer);
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setTimeout(() => setIsAnimating(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "-30% 0px -30% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [delay, startOnView]);

  useEffect(() => {
    if (!isAnimating) return;

    const characters = children.split("");
    const start = performance.now();
    let frame: number | null = null;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Characters resolve left to right as the playhead sweeps the string.
      const resolvedUpTo = progress * characters.length;

      setDisplayText(
        characters
          .map((letter, index) =>
            letter === " " || index <= resolvedUpTo
              ? letter
              : // noUncheckedIndexedAccess: fall back to the real letter rather
                // than dropping a character and reflowing the line.
                (characterSet[Math.floor(Math.random() * characterSet.length)] ?? letter),
          )
          .join(""),
      );

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplayText(children);
        setIsAnimating(false);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [children, duration, isAnimating, characterSet]);

  return (
    <span
      ref={ref}
      className={className}
      style={style}
      onMouseEnter={() => {
        if (animateOnHover && !isAnimating) setIsAnimating(true);
      }}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true">{displayText}</span>
    </span>
  );
}
