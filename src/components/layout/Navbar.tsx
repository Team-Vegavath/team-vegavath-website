"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/* S61/D2: one navbar at every width -- logo left, MENU button right, full-screen
   overlay. The horizontal desktop link list is gone, which retires the tablet
   crowding flagged in S60 (9 links wanted ~990px of chrome at a 768px
   breakpoint) instead of patching the gap. The scroll-aware transparent->solid
   background is gone too: the bar is now always opaque when closed, so the
   hero no longer needs to reserve space for a see-through header.
   MENU/CLOSE is a word, not three animated bars -- the bars needed the
   .nav-hamburger class plus a media query to exist at all, and .btn-outline
   already carries the border + accent hover this needs. */

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
  const isHome = pathname === "/";

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
        background: menuOpen ? "transparent" : "var(--bg-base)",
        borderBottom: menuOpen ? "1px solid transparent" : "1px solid var(--border)",
        transition: "background 0.2s ease, border-color 0.2s ease",
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

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="btn-outline mono"
          style={{ position: "relative", zIndex: 1, padding: "0.5rem 1.1rem", fontSize: "0.7rem", letterSpacing: "0.16em" }}
        >
          {menuOpen ? "CLOSE" : "MENU"}
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
                  {label}
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
