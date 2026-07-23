"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_SECTIONS } from "@/lib/docs-config";

interface DocsSidebarProps {
  onNavigate?: () => void;
}

export default function DocsSidebar({ onNavigate }: DocsSidebarProps) {
  const pathname = usePathname();

  return (
    <nav style={{ padding: "0 1rem" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.65rem",
          letterSpacing: "0.15em",
          color: "var(--accent)",
          textTransform: "uppercase",
          marginBottom: "1.5rem",
          padding: "0 0.5rem",
        }}
      >
        Documentation
      </div>

      {DOC_SECTIONS.map((section) => (
        <div key={section.title} style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              padding: "0 0.5rem",
              marginBottom: "0.4rem",
            }}
          >
            {section.title}
          </div>
          {section.pages.map((page) => {
            const href = page.slug === "" ? "/docs" : `/docs/${page.slug}`;
            // startsWith (not ===) so an in-page anchor URL like
            // /docs/bootstrap#session-lifecycle still highlights Bootstrap.
            const active =
              href === "/docs"
                ? pathname === "/docs"
                : pathname.startsWith(href);
            return (
              <Link
                key={page.slug}
                href={href}
                onClick={onNavigate}
                style={{
                  display: "block",
                  padding: "0.4rem 0.75rem",
                  fontFamily: "var(--font-space)",
                  fontSize: "0.875rem",
                  color: active
                    ? "var(--accent)"
                    : "var(--text-secondary)",
                  background: active ? "var(--accent-dim)" : "transparent",
                  borderLeft: active
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {page.title}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
