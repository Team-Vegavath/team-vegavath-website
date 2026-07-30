"use client";

// Magic UI ScrollProgress (magicui.design/docs/components/scroll-progress),
// adapted:
//  - "motion/react" -> "framer-motion".
//  - upstream's cn() is gone (no clsx/tailwind-merge here).
//  - upstream's purple/pink/orange gradient is replaced with a solid
//    var(--accent). Gradients are off the table on this site.
//  - position/size/colour live in the inline style, not Tailwind classes. About
//    447 rules in globals.css are still unlayered and beat @layer utilities, so
//    an arbitrary-value class like top-[64px] is a cascade gamble; inline is not.
//    Callers can still override any of it through style.
//  - zIndex 49 sits one below the Navbar's 50 on purpose: the fixed header grows
//    past its own height when the menu overlay opens, and the header should
//    paint over the bar rather than the other way round.
//  - S62: top is 64px, matching the S61 navbar height. It was 72px, which left
//    the bar floating 8px below the bar it is supposed to sit flush under.

import { motion, useScroll, type MotionProps } from "framer-motion";

interface ScrollProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, keyof MotionProps> {
  ref?: React.Ref<HTMLDivElement>;
  // Omit<..., keyof MotionProps> strips `style`, so it is added back explicitly
  // as plain CSSProperties for callers that want to nudge top / height / colour.
  style?: React.CSSProperties;
}

export function ScrollProgress({
  className,
  ref,
  style,
  ...props
}: ScrollProgressProps) {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: "64px",
        height: "2px",
        zIndex: 49,
        background: "var(--accent)",
        transformOrigin: "left",
        ...style,
        scaleX: scrollYProgress,
      }}
      {...props}
    />
  );
}
