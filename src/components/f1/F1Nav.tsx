"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sub-navigation for the /f1 section. Client-only because it needs the pathname
// to mark the active link; the pages themselves stay server components.
const F1_LINKS = [
  { href: "/f1", label: "F1" },
  { href: "/f1#standings", label: "Standings" },
  { href: "/f1#calendar", label: "Calendar" },
  { href: "/f1/drivers", label: "Drivers" },
  { href: "/f1/circuits", label: "Circuits" },
  { href: "/f1/seasons", label: "Seasons" },
] as const;

export default function F1Nav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="F1 sections"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "0.35rem 0.9rem",
        paddingBottom: "1rem",
        borderBottom: "1px solid var(--border)",
        marginBottom: "3rem",
      }}
    >
      {F1_LINKS.map(({ href, label }) => {
        // Hash links live on /f1 itself, so they light up with the root link.
        const target = href.split("#")[0] ?? href;
        const active = pathname === target;
        return (
          <Link
            key={href}
            href={href}
            className="mono"
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: active ? "var(--accent)" : "var(--text-muted)",
              textDecoration: "none",
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
