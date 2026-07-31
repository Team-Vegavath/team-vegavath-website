"use client";

// Magic UI InteractiveHoverButton
// (magicui.design/docs/components/interactive-hover-button), heavily adapted --
// the upstream mechanism does not survive this site's design rules:
//  - upstream is a pill-shaped button whose circular dot scales up 100x to fill
//    it. Both of those radii are banned here, and a scaling square reads as a
//    glitch rather than a fill, so the dot is replaced by a solid block that
//    slides in from the left. Same visual result, sharp corners.
//  - upstream's second label + lucide-react ArrowRight are dropped. lucide-react
//    is not a dependency and this session must not add one.
//  - upstream default is outline-then-fill. Here the default state matches
//    .btn-primary exactly (accent fill, --bg-base text) so the button looks
//    unchanged at rest, and hover INVERTS it: a --bg-base block slides across and
//    the label turns accent.
//  - state is useState + inline styles rather than group-hover: classes. The
//    ~447 unlayered rules in globals.css beat @layer utilities, and .btn-primary
//    is one of them, so a Tailwind-class version here is a cascade gamble.
//  - renders a next/link, not a <button>. Every intended call site is a
//    navigation CTA, and nesting a <button> inside a <Link> is invalid HTML.
//    Add a button branch when something actually needs one.
//
// S70: `variant` added rather than forking the component, because the bottom-CTA
// button needs the same MECHANIC with the colours swapped. S60 deliberately left
// that button as a plain Link: its section's background IS var(--accent), so an
// accent-filled button at rest would vanish into the panel. That constraint is
// unchanged, hence "inverted" rather than a second call site of the default.
//
// The swap is a TWO-value table, not a set of per-state overrides, because the
// original already obeyed one rule without saying so:
//     button fill at rest  = rest
//     sliding block        = slide
//     label at rest        = slide   (reads against the rest fill)
//     label on hover       = rest    (reads against the block passing under it)
//     border               = rest    (in both states, so the button never
//                                     dissolves into a same-coloured panel at
//                                     full hover -- the whole reason inverted
//                                     exists)
// default {accent, bg-base} reproduces the S63 button byte for byte; inverted is
// the same table read the other way round. No branch, no duplicated JSX.

import Link from "next/link";
import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";

const VARIANTS = {
  default: { rest: "var(--accent)", slide: "var(--bg-base)" },
  inverted: { rest: "var(--bg-base)", slide: "var(--accent)" },
} as const;

interface InteractiveHoverButtonProps
  extends Omit<ComponentPropsWithoutRef<typeof Link>, "children"> {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
}

export function InteractiveHoverButton({
  children,
  className,
  style,
  variant = "default",
  ...props
}: InteractiveHoverButtonProps) {
  const { rest, slide } = VARIANTS[variant];

  // onFocus/onBlur mirror the hover state so keyboard users get the same
  // affordance, not just pointer users.
  const [active, setActive] = useState(false);

  return (
    <Link
      {...props}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      className={["heading", className].filter(Boolean).join(" ")}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: rest,
        border: `1px solid ${rest}`,
        padding: "0.75rem 1.75rem",
        fontWeight: 700,
        fontSize: "0.85rem",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        textDecoration: "none",
        cursor: "pointer",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: slide,
          transform: active ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
        }}
      />
      <span
        style={{
          position: "relative",
          color: active ? rest : slide,
          transition: "color 0.3s ease",
        }}
      >
        {children}
      </span>
    </Link>
  );
}
