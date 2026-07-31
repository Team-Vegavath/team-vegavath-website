"use client";

import { useEffect, useState } from "react";

/* S69: /legal's contents block was a 2-column jump-link grid sitting near the
 * top of the page (S68). It is now a sticky sidebar, following the same layout
 * shape as DocsShell: a 260px rail, the document in the remaining width, and a
 * slide-over below 768px.
 *
 * WHY THIS IS A CLIENT COMPONENT AND page.tsx IS NOT. The mobile slide-over
 * needs state and the scroll-spy needs an observer, so the shell is a client
 * boundary -- but LEGAL_CONTENTS and all 19 clauses stay in the server page and
 * come through as props/children. /legal keeps `revalidate = 120` and none of
 * the prose ships as a client chunk. Same split DocsShell uses.
 *
 * SCROLL-SPY: THIS REVERSES S68. S68 rejected scroll-spy, and the reasoning was
 * sound at the time: the contents block scrolled out of view the instant you
 * jumped, so an active highlight would be state nobody could see. That
 * reasoning was explicitly conditional on the layout -- S68's own note says
 * scroll-spy "only earns its keep against a STICKY contents rail, which a 780px
 * centred column has no room for." This session builds exactly that rail, so
 * the precondition it was waiting on now holds and the objection is gone. It is
 * an addition, not a rebuild: one observer, one piece of state, one class.
 *
 * The hamburger reuses .nav-hamburger from Section A rather than copying
 * .docs-hamburger. .docs-hamburger renders the word MENU, and /legal is a
 * public page -- shipping a text hamburger here would contradict the icon-only
 * change in the same session. Nothing else from the docs mobile pattern is
 * shared: .docs-mobile-bar sits under a 72px navbar on a password-gated
 * surface, so the legal bar is its own class rather than a shared one carrying
 * docs assumptions onto a public page.
 */

type LegalGroup = {
  readonly title: string;
  readonly items: readonly { readonly id: string; readonly label: string }[];
};

export function LegalShell({
  contents,
  children,
}: {
  contents: readonly LegalGroup[];
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const sections = contents
      .flatMap((group) => group.items.map((item) => document.getElementById(item.id)))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    /* ponytail: band-based spy. rootMargin carves a thin strip just under the
       fixed 72px navbar (-96px matches .legal-clause's scroll-margin-top, so a
       jumped-to clause lands lit) and discards the bottom 70% of the viewport,
       which keeps one clause in the band at a time. The known ceiling: a clause
       shorter than the band can be scrolled past without ever intersecting, so
       the highlight stays on the previous one. That is a decoration-grade miss
       on a page whose shortest clause is still a full paragraph -- if it ever
       matters, the upgrade is tracking getBoundingClientRect for all 19 on
       scroll instead, which costs a rAF listener this does not need. */
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px" },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [contents]);

  return (
    <div className="legal-layout">
      <div className="legal-mobile-bar">
        <span className="legal-mobile-bar-label">Contents</span>
        <button
          type="button"
          className="nav-hamburger"
          data-open={sidebarOpen}
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label={sidebarOpen ? "Close contents" : "Open contents"}
          aria-expanded={sidebarOpen}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <div className="legal-sidebar-wrapper" data-open={sidebarOpen}>
        <nav className="legal-toc" aria-label="Contents">
          {contents.map((group) => (
            <div key={group.title} className="legal-toc-group">
              <p className="legal-toc-group-label">{group.title}</p>
              {group.items.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="legal-toc-link"
                  /* aria-current, not just a class: the highlight is real
                     state, so it should reach a screen reader too. */
                  aria-current={activeId === item.id ? "true" : undefined}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="legal-content-wrapper">{children}</div>
    </div>
  );
}
