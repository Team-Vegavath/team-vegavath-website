"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AnnouncementForm from "@/components/admin/AnnouncementForm";
import InlineDelete from "@/components/admin/InlineDelete";
import type { Announcement } from "@/types/announcement";

/* Same shape as SponsorsTable: server page passes rows in, EDIT opens the
   slide-in panel, InlineDelete hits the DELETE route, viewers get no actions.

   Type-only import from @/types/announcement, never from lib/services -- a
   value import would drag the Neon driver into the client bundle.

   No special handling if two rows are active at once: getActiveAnnouncement's
   LIMIT 1 is what enforces "only one shows", not this table. */

type Props = {
  announcements: Announcement[];
  isViewer: boolean;
};

export default function AnnouncementsTable({ announcements, isViewer }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);

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
              <th>Title</th>
              <th>Active</th>
              <th>Order</th>
              <th>Images</th>
              <th>CTA</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <tr key={announcement.id}>
                  <td className="admin-td-primary" style={{ fontWeight: 500 }}>
                    {announcement.title}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span
                      className={`status-badge status-${announcement.is_active ? "active" : "inactive"}`}
                    >
                      {announcement.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                    {announcement.display_order}
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                    {[
                      announcement.image_url_desktop ? "DESKTOP" : null,
                      announcement.image_url_mobile ? "MOBILE" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "-"}
                  </td>
                  <td className="admin-cell-mono">
                    {announcement.cta_label && announcement.cta_href
                      ? announcement.cta_label
                      : "-"}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {isViewer ? (
                      <span className="admin-cell-mono" style={{ color: "var(--text-muted)" }}>-</span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <button
                          type="button"
                          className="admin-row-action"
                          onClick={() => {
                            setSelected(announcement);
                            setOpen(true);
                          }}
                          style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
                        >
                          EDIT
                        </button>
                        <InlineDelete
                          endpoint={`/api/admin/announcements?id=${encodeURIComponent(announcement.id)}`}
                          confirmMessage={`Delete announcement "${announcement.title}"? This cannot be undone.`}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No announcements yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {open ? (
        <button
          type="button"
          className="admin-panel-backdrop"
          aria-label="Close edit panel"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className="admin-panel"
        data-open={open}
        inert={!open}
        aria-label="Edit announcement"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1.75rem" }}>
          <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <span className="admin-section-label">Edit announcement</span>
              <h2 className="admin-page-title" style={{ marginTop: "0.35rem", fontSize: "1.1rem" }}>
                {selected?.title ?? ""}
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
            <AnnouncementForm
              // Remounts the form when the row changes, so field state never
              // leaks from the previously edited announcement.
              key={selected.id}
              mode="edit"
              initialData={{
                id: selected.id,
                title: selected.title,
                body: selected.body ?? "",
                image_url_desktop: selected.image_url_desktop,
                image_url_mobile: selected.image_url_mobile,
                cta_label: selected.cta_label ?? "",
                cta_href: selected.cta_href ?? "",
                is_active: selected.is_active,
                display_order: selected.display_order,
              }}
              onSuccess={() => {
                setOpen(false);
                router.refresh();
              }}
            />
          ) : null}
        </div>
      </aside>
    </>
  );
}
