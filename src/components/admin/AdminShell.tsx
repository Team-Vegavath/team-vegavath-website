"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

// Same R2 shield as the public Navbar (constant duplicated; Navbar doesn't export it).
const LOGO_URL = "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/icons/logo.png";

const NAV_ITEMS = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/admin/events",
    label: "Events",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
      </svg>
    ),
  },
  {
    href: "/admin/team",
    label: "Team",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M17.5 14.5c2.1.6 3.5 2.7 3.5 5.5" />
      </svg>
    ),
  },
  {
    href: "/admin/gallery",
    label: "Gallery",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" />
        <circle cx="9" cy="10" r="2" />
        <path d="M3 17l5-5 4 4 3-3 6 6" />
      </svg>
    ),
  },
  {
    href: "/admin/sponsors",
    label: "Sponsors",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M3 3h8l10 10-8 8L3 11z" />
        <circle cx="8" cy="8" r="1.5" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <line x1="4" y1="8" x2="20" y2="8" />
        <rect x="8" y="6" width="3" height="4" />
        <line x1="4" y1="16" x2="20" y2="16" />
        <rect x="14" y="14" width="3" height="4" />
      </svg>
    ),
  },
] as const;

interface AdminShellProps {
  children: ReactNode;
  // SignOutButton is a server component (server action), so the server layout
  // passes it in as a slot; client components can't import it directly.
  signOutSlot: ReactNode;
}

export default function AdminShell({ children, signOutSlot }: AdminShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile overlay nav is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Login page ("/admin") is a standalone screen with no sidebar chrome.
  if (pathname === "/admin") {
    return <>{children}</>;
  }

  const brand = (
    <>
      <Image
        src={LOGO_URL}
        alt="Team Vegavath shield"
        width={24}
        height={24}
        style={{ height: "24px", width: "24px", objectFit: "contain" }}
      />
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
        <span
          className="heading"
          style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.14em", color: "var(--text-primary)" }}
        >
          VEGAVATH
        </span>
        <span
          className="mono"
          style={{ fontSize: "0.55rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--text-muted)" }}
        >
          ADMIN
        </span>
      </span>
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <div className="admin-topbar">
        <Link href="/admin/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.7rem", textDecoration: "none" }}>
          {brand}
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle admin menu"
          aria-expanded={menuOpen}
          style={{ display: "flex", flexDirection: "column", gap: "5px", background: "transparent", border: "none", cursor: "pointer", padding: "0.6rem 0.25rem" }}
        >
          <span style={{ display: "block", height: "2px", width: "20px", background: "var(--text-primary)", transition: "transform 0.2s", transform: menuOpen ? "translateY(7px) rotate(45deg)" : "none" }} />
          <span style={{ display: "block", height: "2px", width: "20px", background: "var(--text-primary)", opacity: menuOpen ? 0 : 1, transition: "opacity 0.2s" }} />
          <span style={{ display: "block", height: "2px", width: "20px", background: "var(--text-primary)", transition: "transform 0.2s", transform: menuOpen ? "translateY(-7px) rotate(-45deg)" : "none" }} />
        </button>
      </div>

      <aside className="admin-sidebar" data-open={menuOpen}>
        <Link href="/admin/dashboard" className="admin-sidebar-brand" style={{ textDecoration: "none" }}>
          {brand}
        </Link>

        <nav className="admin-nav" aria-label="Admin sections">
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="admin-nav-link"
              data-active={pathname === href || pathname.startsWith(`${href}/`)}
            >
              {icon}
              {label}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-foot">{signOutSlot}</div>
      </aside>

      <main className="admin-content">{children}</main>
    </div>
  );
}
