"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_SECTIONS } from "@/lib/docs-config";

interface DocsSidebarProps {
  onNavigate?: () => void;
}

// S68: the inline style objects moved to `.docs-nav-*` in globals.css. The point
// was not tidiness -- an inline style cannot express :hover, so until now the
// only feedback these links gave was the active state on the page you were
// already looking at. Styling matched to .admin-nav-item.
export default function DocsSidebar({ onNavigate }: DocsSidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="docs-nav">
      <div className="docs-nav-brand">Documentation</div>

      {DOC_SECTIONS.map((section) => (
        <div key={section.title} className="docs-nav-section">
          <div className="docs-nav-section-label">{section.title}</div>
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
                aria-current={active ? "page" : undefined}
                className={active ? "docs-nav-item active" : "docs-nav-item"}
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
