"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useScroll } from "framer-motion";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

/* S61/D2: one navbar at every width -- logo left, MENU button right, full-screen
   overlay. The horizontal desktop link list is gone, which retires the tablet
   crowding flagged in S60 (9 links wanted ~990px of chrome at a 768px
   breakpoint) instead of patching the gap.
   S61 made the toggle the WORD "MENU"/"CLOSE" rather than three animated bars,
   on the grounds that the bars needed a .nav-hamburger class plus a media query
   to exist at all while .btn-outline already carried the border and accent
   hover. S69 reverses that: the ask is no visible text at any width. Half of
   S61's reasoning no longer applies -- there is one navbar at every width now,
   so the icon needs no media query, only the class.

   S62: the S2 scroll-aware transparent->solid background is back, which S61 had
   deleted along with the link list. It reads off framer-motion's `scrollY`
   rather than a raw window listener: framer-motion is already in the bundle for
   Reveal/BlurFade, and its MotionValue is rAF-throttled, so this does not add a
   layout-thrashing scroll handler. State flips at 80px, not 0, so a 1px
   trackpad nudge does not strobe the bar. The full-bleed hero from S61 is what
   makes transparency worth having -- the bar now sits over the hero art.

   ── S70: the full-screen overlay is a bounded corner panel ──────────────────

   S69's icon was never the complaint -- "no animation and looks trash" was about
   the PANEL, which S61 conditionally mounted and unmounted with no transition at
   either end. The rebuild is a hybrid: hover.dev Corner Nav's structure (a small
   trigger, a bounded panel that grows out of the corner it lives in) with Liquid
   Nav's motion quality carried by the EASING rather than by literal blob shapes,
   which this site's sharp-corner rule bans outright. Geometry and reveal maths
   live in .nav-panel in globals.css; three consequences land here:

   1. THE PANEL IS ALWAYS IN THE DOM. clip-path needs two frames to transition
      between, so `menuOpen &&` is gone and `data-open` drives CSS instead. The
      closed panel is `visibility: hidden`, which removes it from the tab order
      and the a11y tree -- no aria-hidden or tabIndex bookkeeping needed.
   2. THE BODY-SCROLL LOCK IS GONE. It existed because the overlay covered the
      viewport. A 360px content-height panel does not, and locking the page
      behind a dropdown is wrong. Deleted, not ported.
   3. ESCAPE AND CLICK-OUTSIDE ARE NEW, and they are the cost of going bounded:
      the page behind is now visible and looks clickable, so the panel needs
      dismissals a full-screen overlay never did. The outside test runs against
      the whole HEADER, not the panel -- a panel-only ref would let a click on
      the trigger close via outside-click and reopen via onClick in the same
      gesture, and the menu would appear stuck open. */

const NAV_LINKS = [
  { href: "/", label: "HOME" },
  { href: "/about", label: "ABOUT" },
  { href: "/events", label: "EVENTS" },
  { href: "/projects", label: "PROJECTS" },
  { href: "/posts", label: "POSTS" },
  { href: "/gallery", label: "GALLERY" },
  { href: "/f1", label: "F1" },
  { href: "/crew", label: "CREW" },
  { href: "/sponsors", label: "SPONSORS" },
] as const;

const LOGO_URL = "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/icons/logo.png";

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const isHome = pathname === "/";
  const { scrollY } = useScroll();

  // scrollY.on returns its own unsubscribe, so it IS the cleanup function.
  useEffect(() => scrollY.on("change", (v) => setScrolled(v > 80)), [scrollY]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    // pointerdown, not click: dismisses on press rather than release, which is
    // how every other dismissible surface on the platform behaves.
    const onPointerDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close panel on route change
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      ref={headerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        /* S70: menuOpen no longer forces the solid bar. The panel supplies its
           own background behind the trigger, and a bounded panel has no business
           repainting full-width chrome on the far side of the viewport. */
        background: scrolled ? "var(--bg-base)" : "transparent",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
          paddingLeft: "clamp(1.25rem, 4vw, 4rem)",
          paddingRight: "clamp(1.25rem, 4vw, 4rem)",
        }}
      >
        <Link
          href="/"
          aria-label="Team Vegavath home"
          style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0, textDecoration: "none" }}
        >
          <Image
            src={LOGO_URL}
            alt="Team Vegavath shield"
            width={40}
            height={40}
            style={{ height: "40px", width: "40px", objectFit: "contain" }}
          />
          {/* The wordmark is redundant on the homepage, where the hero already
              renders VEGAVATH at 140px. Everywhere else it is the only place
              the team name appears above the fold. */}
          {!isHome && (
            <span
              className="heading"
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Team Vegavath
            </span>
          )}
        </Link>

        {/* S69: icon-only. The word MENU/CLOSE is gone at every width, so the
            accessible name lives entirely on aria-label -- the ask was no
            VISIBLE text, not no name. Bars are three empty spans driven by
            data-open in CSS rather than inline transforms, which is what lets
            them carry a transition and inherit the button's :hover accent.
            S70 left this untouched: the icon was never the complaint. */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="nav-hamburger"
          data-open={menuOpen}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </nav>

      <div className="nav-panel" data-open={menuOpen}>
        <ul className="nav-panel-list">
          {NAV_LINKS.map(({ href, label }, i) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setMenuOpen(false)}
                className="nav-panel-link"
                data-active={pathname === href}
                style={{ "--i": i } as CSSProperties}
              >
                {/* The label sits in its own span so the hover shift and the
                    open-reveal transform never share an element. The fullstop is
                    rendered, not stored in NAV_LINKS, so the labels stay usable
                    as plain route names elsewhere. */}
                <span>{label}.</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* S70/C1: the same InteractiveHoverButton the hero uses, not a
            .btn-primary -- one CTA mechanic across the site. --i continues the
            link stagger so the button arrives last. */}
        <InteractiveHoverButton
          href="/join"
          onClick={() => setMenuOpen(false)}
          className="nav-panel-cta"
          style={
            {
              "--i": NAV_LINKS.length,
              display: "flex",
              padding: "0.9rem 1rem",
              letterSpacing: "0.1em",
            } as CSSProperties
          }
        >
          JOIN THE TEAM
        </InteractiveHoverButton>
      </div>
    </header>
  );
}
