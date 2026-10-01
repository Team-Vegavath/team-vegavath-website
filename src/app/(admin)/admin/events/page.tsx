import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import EventForm from "@/components/admin/EventForm";
import EventsTable from "@/components/admin/EventsTable";
import { auth } from "@/lib/auth";
import { getEvents } from "@/lib/services/events";
import type { Event } from "@/types/event";

export const metadata: Metadata = {
  title: "Events",
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
  const isViewer = session.user.isViewer;
  const showNewForm = resolvedSearchParams.new === "true" && !isViewer;

  if (showNewForm) {
    return (
      <div style={{ maxWidth: "52rem" }}>
        <Link href="/admin/events" className="admin-back-link">
          ← Back to events
        </Link>

        <div style={{ marginTop: "1rem" }}>
          <AdminPageHeader title="New Event" />
        </div>

        <EventForm mode="create" />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Events"
        subtitle={`${events.length} events`}
        action={
          !isViewer ? (
            <Link href="/admin/events?new=true" className="btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}>
              ADD EVENT
            </Link>
          ) : null
        }
      />

      {/* S82: the table is a client component so EDIT can open the slide-in
          panel. Dates are formatted here, on the server, exactly as before. */}
      <EventsTable
        rows={events.map((event) => ({
          event,
          dateLabel: formatDate(event.event_date),
          // Same computation as /admin/events/[id]/edit.
          formDate: event.event_date
            ? new Date(event.event_date).toISOString().slice(0, 10)
            : "",
        }))}
        isViewer={isViewer}
      />
    </>
  );
}
