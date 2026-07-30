"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import InlineDelete from "@/components/admin/InlineDelete";
import SponsorForm from "@/components/admin/SponsorForm";
import type { Sponsor } from "@/types/sponsor";

/* S62/D5: the brief said "read SponsorsTable.tsx" -- it did not exist. The table
   was inline in the /admin/sponsors server page, and EDIT was a <Link> to
   /admin/sponsors/[id]/edit. A slide-in panel needs client state, so the table
   moved here wholesale rather than growing a per-row client trigger: one trigger
   per row would mount one SponsorForm (and one FileUploadField) per sponsor.

   The full-page edit route is deliberately NOT removed. It is still the target
   of any bookmark or deep link, and SponsorForm without onSuccess still
   navigates there exactly as before.

   Type-only import from @/types/sponsor, never from lib/services -- a value
   import would drag the Neon driver into the client bundle. */

type Props = {
  sponsors: Sponsor[];
  isViewer: boolean;
};

export default function SponsorsTable({ sponsors, isViewer }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // `selected` is intentionally NOT cleared on close: the panel stays mounted so
  // it can animate out, and clearing would blank its content mid-slide. A stale
  // off-screen sponsor is harmless -- reopening sets a new one, and the <key>
  // below is what resets the form's internal state between sponsors.
  const [selected, setSelected] = useState<Sponsor | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <section className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Tier</th>
              <th>Active</th>
              <th>Order</th>
              <th>Logo URL</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sponsors.length > 0 ? (
              sponsors.map((sponsor) => (
                <tr key={sponsor.id}>
                  <td className="admin-td-primary" style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{sponsor.name}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>{sponsor.tier}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>
                    <span
                      className="admin-dot"
                      style={{ background: sponsor.is_active ? "var(--success)" : "var(--text-muted)" }}
                      aria-hidden="true"
                    />
                    {sponsor.is_active ? "ACTIVE" : "INACTIVE"}
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{sponsor.display_order}</td>
                  <td className="admin-cell-mono">{truncateText(sponsor.logo_url, 40)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {isViewer ? (
                      <span className="admin-cell-mono" style={{ color: "var(--text-muted)" }}>-</span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <button
                          type="button"
                          className="admin-row-action"
                          onClick={() => {
                            setSelected(sponsor);
                            setOpen(true);
                          }}
                          style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
                        >
                          EDIT
                        </button>
                        <InlineDelete
                          endpoint={`/api/admin/sponsors?id=${encodeURIComponent(sponsor.id)}`}
                          confirmMessage={`Delete sponsor "${sponsor.name}"? This cannot be undone.`}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No sponsors yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Rendered only while open: a fixed inset-0 element left mounted would
          swallow every click on the table behind it. */}
      {open ? (
        <button
          type="button"
          className="admin-panel-backdrop"
          aria-label="Close edit panel"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Stays mounted so the transform can transition both ways. `inert` when
          closed is what keeps the off-screen form out of the tab order and
          non-clickable -- cheaper and more correct than pointer-events juggling. */}
      <aside className="admin-panel" data-open={open} inert={!open} aria-label="Edit sponsor">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1.75rem" }}>
          <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <span className="admin-section-label">Edit sponsor</span>
              <h2 className="admin-page-title" style={{ marginTop: "0.35rem", fontSize: "1.1rem" }}>
                {selected?.name ?? ""}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-outline mono"
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.65rem", letterSpacing: "0.16em" }}
            >
              CLOSE
            </button>
          </header>

          {selected ? (
            <SponsorForm
              // Remounts the form when the row changes, so field state never
              // leaks from the previously edited sponsor.
              key={selected.id}
              mode="edit"
              initialData={{
                id: selected.id,
                name: selected.name,
                tier: selected.tier,
                website_url: selected.website_url ?? "",
                description: selected.description ?? "",
                display_order: selected.display_order,
                is_active: selected.is_active,
                logo_url: selected.logo_url,
              }}
              onSuccess={() => {
                setOpen(false);
                // The page is force-dynamic, so refresh() re-runs getSponsors
                // and the row updates without a full navigation.
                router.refresh();
              }}
            />
          ) : null}
        </div>
      </aside>
    </>
  );
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}
