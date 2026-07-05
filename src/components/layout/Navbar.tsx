"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";

const NAV_LINKS = [
  { href: "/", label: "HOME" },
  { href: "/about", label: "ABOUT" },
  { href: "/events", label: "EVENTS" },
  { href: "/gallery", label: "GALLERY" },
  { href: "/crew", label: "CREW" },
  { href: "/sponsors", label: "SPONSORS" },
] as const;

const LOGO_URL = "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/icons/logo.png";

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 80);
  });

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className="site-nav"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: scrolled || menuOpen ? "var(--bg-base)" : "transparent",
        borderBottom: scrolled && !menuOpen ? "1px solid var(--border)" : "1px solid transparent",
        transition: "background 0.25s ease, border-color 0.25s ease",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "72px",
          paddingLeft: "clamp(1.25rem, 4vw, 4rem)",
          paddingRight: "clamp(1.25rem, 4vw, 4rem)",
        }}
      >
        <Link href="/" aria-label="Team Vegavath home" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <Image
            src={LOGO_URL}
            alt="Team Vegavath shield"
            width={48}
            height={48}
            style={{ height: "48px", width: "48px", objectFit: "contain" }}
          />
        </Link>

        <ul className="nav-links-desktop">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="nav-link"
                style={{
                  color: pathname === href ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <Link href="/join" className="btn-primary nav-join-desktop" style={{ padding: "0.55rem 1.4rem" }}>
          JOIN US
        </Link>

        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className="nav-hamburger"
        >
          <span style={{ display: "block", height: "2px", width: "22px", background: "var(--text-primary)", transition: "transform 0.2s", transform: menuOpen ? "translateY(7px) rotate(45deg)" : "none" }} />
          <span style={{ display: "block", height: "2px", width: "22px", background: "var(--text-primary)", opacity: menuOpen ? 0 : 1, transition: "opacity 0.2s" }} />
          <span style={{ display: "block", height: "2px", width: "22px", background: "var(--text-primary)", transition: "transform 0.2s", transform: menuOpen ? "translateY(-7px) rotate(-45deg)" : "none" }} />
        </button>
      </nav>

      {menuOpen && (
        <div className="nav-overlay">
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.25rem", listStyle: "none" }}>
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
          <Link
            href="/join"
            onClick={() => setMenuOpen(false)}
            className="btn-primary"
            style={{ width: "100%", padding: "1rem" }}
          >
            JOIN US
          </Link>
        </div>
      )}
    </header>
  );
}
