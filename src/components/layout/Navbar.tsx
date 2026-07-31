"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useScroll } from "framer-motion";

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
   makes transparency worth having -- the bar now sits over the hero art. */

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
  const isHome = pathname === "/";
  const { scrollY } = useScroll();

  // scrollY.on returns its own unsubscribe, so it IS the cleanup function.
  useEffect(() => scrollY.on("change", (v) => setScrolled(v > 80)), [scrollY]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close overlay on route change
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: menuOpen || scrolled ? "var(--bg-base)" : "transparent",
        borderBottom: menuOpen || scrolled ? "1px solid var(--border)" : "1px solid transparent",
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
            them carry a transition and inherit the button's :hover accent. */}
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

      {menuOpen && (
        <div className="nav-overlay">
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.1rem", listStyle: "none" }}>
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="nav-overlay-link"
                  style={{
                    color: pathname === href ? "var(--accent)" : "var(--text-primary)",
                  }}
                >
                  {/* The fullstop is rendered, not stored in NAV_LINKS, so the
                      labels stay usable as plain route names elsewhere. */}
                  {label}.
                </Link>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "2.5rem" }}>
            <Link
              href="/join"
              onClick={() => setMenuOpen(false)}
              className="btn-primary"
              style={{ padding: "0.875rem 2.5rem" }}
            >
              JOIN THE TEAM
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
