import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import EventForm from "@/components/admin/EventForm";
import InlineDelete from "@/components/admin/InlineDelete";
import { auth } from "@/lib/auth";
import { getEvents } from "@/lib/services/events";
import type { Event } from "@/types/event";

export const metadata: Metadata = {
  title: "Events | Admin",
};

export const dynamic = "force-dynamic";

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const events = await getEvents({ limit: 100 }).catch(() => [] as Event[]);
  const resolvedSearchParams = await searchParams;
  const showNewForm = resolvedSearchParams.new === "true";

  if (showNewForm) {
    return (
      <div style={{ maxWidth: "52rem" }}>
        <Link href="/admin/events" className="admin-back-link">
          ← Back to events
        </Link>

        <header className="admin-page-header" style={{ marginTop: "1rem" }}>
          <h1 className="admin-page-title">New Event</h1>
        </header>

        <EventForm mode="create" />
      </div>
    );
  }

  return (
    <>
      <header className="admin-page-header">
        <h1 className="admin-page-title">Events</h1>
        <Link href="/admin/events?new=true" className="btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}>
          ADD EVENT
        </Link>
      </header>

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
            {events.length > 0 ? (
              events.map((event) => (
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
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>
                    <span
                      className="admin-dot"
                      style={{ background: event.status === "upcoming" ? "var(--accent)" : "var(--text-muted)" }}
                      aria-hidden="true"
                    />
                    {event.status}
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{formatDate(event.event_date)}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>
                    {event.registration_open ? "OPEN" : "CLOSED"}
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{event.slug}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <Link href={`/admin/events/${event.id}/edit`} className="admin-row-action">
                        EDIT
                      </Link>
                      {/* Plain DELETE here soft-deletes (archives): the API's non-permanent
                          path. Permanent delete lives in the edit page's danger zone. */}
                      <InlineDelete
                        endpoint={`/api/admin/events?id=${event.id}`}
                        confirmMessage={`Archive "${event.title}"? It will be hidden from the public site but can be restored.`}
                        label="ARCHIVE"
                      />
                    </div>
                  </td>
                </tr>
              ))
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
    </>
  );
}
