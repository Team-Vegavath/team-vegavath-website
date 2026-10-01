"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import AdminEditPanel from "@/components/admin/AdminEditPanel";
import EventForm from "@/components/admin/EventForm";
import InlineDelete from "@/components/admin/InlineDelete";
import type { Event } from "@/types/event";

/* S82: the /admin/events table, moved out of the server page so EDIT can open
   the shared slide-in panel -- the same move S62 made for SponsorsTable.

   The panel edits the event's fields only. Registrations and the permanent-
   delete Danger Zone stay on /admin/events/[id]/edit (owner decision): every
   row links there as REGISTRATIONS, and so does the panel. "Add event" keeps
   its own full page (?new=true).

   Both date strings arrive pre-formatted from the server page. Formatting a
   DATE here would use the viewer's timezone on the client and the server's
   during SSR -- a hydration mismatch waiting for anyone west of UTC.

   Type-only import from @/types/event, never from lib/services -- a value
   import would drag the Neon driver into the client bundle. */

export type EventRow = {
  event: Event;
  /** Display date, e.g. "28 Sept 2026". */
  dateLabel: string;
  /** YYYY-MM-DD for the form's date input, computed as the edit page does. */
  formDate: string;
};

type Props = {
  rows: EventRow[];
  isViewer: boolean;
};

export default function EventsTable({ rows, isViewer }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Not cleared on close, so the panel keeps its content while it slides out.
  const [selected, setSelected] = useState<EventRow | null>(null);

  return (
    <>
      <section className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Date</th>
              <th>Registration</th>
              <th>Slug</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => {
                const { event } = row;
                return (
                  <tr key={event.id}>
                    <td className="admin-td-primary" style={{ whiteSpace: "nowrap", fontWeight: 500 }}>
                      <Link
                        href={`/events/${event.slug}`}
                        target="_blank"
                        style={{ color: "var(--text-primary)", textDecoration: "none", borderBottom: "1px solid var(--border-strong)" }}
                      >
                        {event.title}
                      </Link>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={`status-badge status-${event.status}`}>{event.status}</span>
                    </td>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{row.dateLabel}</td>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>
                      {event.registration_open ? "OPEN" : "CLOSED"}
                    </td>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{event.slug}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        {!isViewer ? (
                          <button
                            type="button"
                            className="admin-row-action"
                            onClick={() => {
                              setSelected(row);
                              setOpen(true);
                            }}
                            style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
                          >
                            EDIT
                          </button>
                        ) : null}
                        {/* Viewers had this link already; admins now get it too,
                            since EDIT no longer leads to the registrations page. */}
                        <Link href={`/admin/events/${event.id}/edit`} className="admin-row-action">
                          REGISTRATIONS
                        </Link>
                        {!isViewer ? (
                          // Plain DELETE here soft-deletes (archives): the API's
                          // non-permanent path. Permanent delete lives in the
                          // full page's danger zone.
                          <InlineDelete
                            endpoint={`/api/admin/events?id=${event.id}`}
                            confirmMessage={`Archive "${event.title}"? It will be hidden from the public site but can be restored.`}
                            label="ARCHIVE"
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No events yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <AdminEditPanel open={open} onClose={() => setOpen(false)} label="Edit event" title={selected?.event.title ?? ""}>
        {selected ? (
          <>
            <EventForm
              // Remounts per event, so field state never leaks between rows.
              key={selected.event.id}
              mode="edit"
              // Same mapping as /admin/events/[id]/edit.
              initialData={{
                id: selected.event.id,
                title: selected.event.title,
                slug: selected.event.slug,
                category: selected.event.category,
                status: selected.event.status,
                description: selected.event.description ?? undefined,
                event_date: selected.formDate,
                registration_open: selected.event.registration_open,
                registration_form_url: selected.event.registration_form_url ?? undefined,
                logo_url: selected.event.logo_url,
                cover_image_url: selected.event.cover_image_url,
              }}
              onSuccess={() => {
                setOpen(false);
                // The page is force-dynamic, so refresh() re-runs getEvents.
                router.refresh();
              }}
            />
            <p className="admin-cell-mono" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              Registrations and permanent delete:{" "}
              <Link href={`/admin/events/${selected.event.id}/edit`} className="admin-row-action">
                OPEN FULL PAGE
              </Link>
            </p>
          </>
        ) : null}
      </AdminEditPanel>
    </>
  );
}
