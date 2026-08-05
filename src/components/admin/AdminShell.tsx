"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState, type ReactNode } from "react";

import { CommandPalette } from "@/components/admin/CommandPalette";

// Same R2 shield as the public Navbar (constant duplicated; Navbar doesn't export it).
const LOGO_URL = "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/icons/logo.png";

// S70. "1"/"0" rather than JSON so a corrupted value can only ever read as
// false, which is the safe default (expanded).
const SIDEBAR_KEY = "vegavath-admin-sidebar-collapsed";

// S65: `section` groups the sidebar into labelled zones. Kept on NAV_ITEMS
// itself rather than in a parallel list of hrefs, so the grouping can't drift
// from the nav (same reason CommandPalette is fed from this array).
const SECTIONS = ["Overview", "Content", "Recruitment", "System"] as const;

const NAV_ITEMS = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    section: "Overview",
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
    section: "Content",
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
    href: "/admin/posts",
    label: "Posts",
    section: "Content",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    href: "/admin/team",
    label: "Team",
    section: "Content",
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
    href: "/admin/applications",
    label: "Applications",
    section: "Recruitment",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="1" width="12" height="14" rx="0" stroke="currentColor" strokeWidth="1.3" />
        <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.1" />
        <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.1" />
        <line x1="5" y1="11" x2="9" y2="11" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    ),
  },
  {
    href: "/admin/bootstrap",
    label: "Bootstrap",
    section: "System",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="4" width="14" height="9" rx="0" stroke="currentColor" strokeWidth="1.3" />
        <line x1="4" y1="4" x2="4" y2="2" stroke="currentColor" strokeWidth="1.3" />
        <line x1="8" y1="4" x2="8" y2="2" stroke="currentColor" strokeWidth="1.3" />
        <line x1="12" y1="4" x2="12" y2="2" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    href: "/admin/gallery",
    label: "Gallery",
    section: "Content",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" />
        <circle cx="9" cy="10" r="2" />
        <path d="M3 17l5-5 4 4 3-3 6 6" />
      </svg>
    ),
  },
  {
    href: "/admin/milestones",
    label: "Road So Far",
    section: "Content",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <line x1="5" y1="3" x2="5" y2="21" />
        <circle cx="5" cy="7" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="5" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none" />
        <line x1="9" y1="7" x2="20" y2="7" />
        <line x1="9" y1="13" x2="20" y2="13" />
        <line x1="9" y1="19" x2="16" y2="19" />
      </svg>
    ),
  },
  {
    href: "/admin/sponsors",
    label: "Sponsors",
    section: "Content",
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
    section: "System",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <line x1="4" y1="8" x2="20" y2="8" />
        <rect x="8" y="6" width="3" height="4" />
        <line x1="4" y1="16" x2="20" y2="16" />
        <rect x="14" y="14" width="3" height="4" />
      </svg>
    ),
  },
  {
    // S72C: a site-wide utility, so System rather than Content, and ahead of the
    // two identity entries (Profile, Accounts) which the existing ordering keeps
    // last. CommandPalette is fed this same array, so it appears there too.
    href: "/admin/qr",
    label: "QR Codes",
    section: "System",
    // three corner finder patterns plus one module square - the QR silhouette,
    // stroke-only and geometric like the rest of the set
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="3" width="6" height="6" />
        <rect x="15" y="3" width="6" height="6" />
        <rect x="3" y="15" width="6" height="6" />
        <line x1="15" y1="15" x2="21" y2="15" />
        <line x1="15" y1="15" x2="15" y2="21" />
        <line x1="18" y1="18" x2="21" y2="21" />
      </svg>
    ),
  },
  {
    href: "/admin/profile",
    label: "Profile",
    section: "System",
    // Single bust: one head, one shoulder line. Deliberately simpler than the
    // Accounts icon (two figures + a plus) -- "me" vs "everyone".
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
      </svg>
    ),
  },
  {
    href: "/admin/accounts",
    label: "Accounts",
    section: "System",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="8" cy="8" r="3.5" />
        <path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="16.5" cy="9" r="2.5" />
        <path d="M17 14.5c2.7.4 4.5 2.6 4.5 5.5" />
        <line x1="19" y1="4" x2="23" y2="4" />
        <line x1="21" y1="2" x2="21" y2="6" />
      </svg>
    ),
  },
] as const;

interface AdminShellProps {
  children: ReactNode;
  // SignOutButton is a server component (server action), so the server layout
  // passes it in as a slot; client components can't import it directly.
  signOutSlot: ReactNode;
  // Orange dot on the Accounts link when registration requests await approval.
  hasPendingAccounts?: boolean;
  // S65 sidebar footer. Passed down rather than read here: this is a client
  // component with no SessionProvider above it, and the layout is already
  // async, so it can await auth() for free.
  userName?: string;
  userRole?: string;
}

export default function AdminShell({
  children,
  signOutSlot,
  hasPendingAccounts = false,
  userName,
  userRole,
}: AdminShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // S70. Server-rendered as expanded (it cannot read localStorage), corrected on
  // mount. `ready` is what stops that correction from animating -- see the S70
  // sidebar-collapse block in globals.css for why the flash is a frame, not a
  // slide.
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard, mount-only
    setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    setReady(true);
  }, []);

  // Written outside the updater on purpose: a setState updater must be pure, and
  // React double-invokes it in dev.
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close mobile nav on route change
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
        <span className="admin-sidebar-brand-name">VEGAVATH</span>
        <span className="admin-sidebar-brand-sub">ADMIN PANEL</span>
      </span>
    </>
  );

  return (
    // data-collapsed lives here, not on the sidebar: .admin-content is the
    // sidebar's SIBLING and needs the same signal for its margin-left.
    <div
      className="admin-shell"
      data-collapsed={collapsed}
      data-ready={ready}
      style={{ minHeight: "100vh", background: "var(--bg-base)" }}
    >
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
        {/* S70: the brand row is a wrapper now -- the collapse toggle is a
            <button>, and nesting one inside the anchor would be invalid HTML. */}
        <div className="admin-sidebar-brand">
          <Link href="/admin/dashboard" className="admin-sidebar-brand-link">
            {brand}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="admin-sidebar-collapse"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {/* Bar plus chevron: "collapse toward the left". CSS rotates it 180deg
                when collapsed, which turns it into "expand toward the right"
                without a second icon. */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <line x1="4" y1="4" x2="4" y2="20" />
              <path d="M20 8l-4 4 4 4" />
            </svg>
          </button>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          {SECTIONS.map((section) => (
            <Fragment key={section}>
              <span className="admin-nav-section-label">{section}</span>
              {NAV_ITEMS.filter((item) => item.section === section).map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  // startsWith keeps the parent lit on sub-routes (/admin/events/new).
                  className={
                    pathname === href || pathname.startsWith(`${href}/`)
                      ? "admin-nav-item active"
                      : "admin-nav-item"
                  }
                  /* S70: the accessible name comes from the label span when
                     expanded and from `title` when collapsed (the span is
                     display:none then, so it leaves the a11y tree with it) --
                     exactly one name in each state, never two. `title` is also the
                     tooltip: no tooltip component exists in this codebase, and
                     inventing one for a 13-item rail is not worth the surface. */
                  title={collapsed ? label : undefined}
                >
                  {href === "/admin/accounts" && hasPendingAccounts ? (
                    <span style={{ position: "relative", display: "inline-flex" }}>
                      {icon}
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          top: "-2px",
                          right: "-3px",
                          width: "6px",
                          height: "6px",
                          background: "var(--accent)",
                        }}
                      />
                    </span>
                  ) : (
                    icon
                  )}
                  {/* Wrapped so CSS can hide it. A bare text node is unselectable,
                      and font-size: 0 on the item would be the clever version of
                      this that someone has to decode later. */}
                  <span className="admin-nav-label">{label}</span>
                </Link>
              ))}
            </Fragment>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {userName ? <span className="admin-sidebar-user-name">{userName}</span> : null}
          {userRole ? <span className="admin-sidebar-user-role">{userRole}</span> : null}
          <div className="admin-sidebar-footer-row">
            {/* SignOutButton takes no className, so the style hangs off a wrapper. */}
            <span className="admin-sidebar-signout">{signOutSlot}</span>
            {/* S62: the palette's only discoverability affordance. Text, not a
                button -- the shortcut is the interface, and a clickable hint
                would need its own open handler threaded down for no gain. */}
            <span className="admin-sidebar-ctrlk">CTRL+K</span>
          </div>
        </div>
      </aside>

      <main className="admin-content">{children}</main>

      {/* Fed from NAV_ITEMS so the palette can never drift from the sidebar.
          Mounted after the /admin early return above, so the login screen has
          no Ctrl+K handler bound. */}
      <CommandPalette pages={NAV_ITEMS} />
    </div>
  );
}
