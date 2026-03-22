import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import DeleteEventButton from "@/components/admin/DeleteEventButton";
import EventForm from "@/components/admin/EventForm";
import ToggleEventStatusButton from "@/components/admin/ToggleEventStatusButton";
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
      <main style={{ minHeight: "100vh", background: "#09090b", color: "white", padding: "6rem 2rem 4rem", boxSizing: "border-box" }}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <Link
            href="/admin/events"
            style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", border: "1.5px solid #EF5D08", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, color: "#EF5D08", textDecoration: "none", transition: "all 0.2s", width: "fit-content" }}
          >
            ← Back to events list
          </Link>

          <h1 className="text-3xl font-extrabold tracking-tight">Create New Event</h1>

          <EventForm mode="create" />
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#09090b", color: "white", padding: "6rem 2rem 4rem", boxSizing: "border-box" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "72rem", display: "flex", flexDirection: "column", gap: "1.5rem", boxSizing: "border-box" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">Manage Events</h1>
          <Link
            href="/admin/events?new=true"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Add New Event
          </Link>
        </div>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-950/60 text-left text-xs uppercase tracking-[0.12em] text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Registration Open</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {events.length > 0 ? (
                  events.map((event) => (
                    <tr key={event.id} className="text-zinc-200">
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-100">
                        <Link
                          href={`/events/${event.slug}`}
                          target="_blank"
                          className="text-[#EF5D08] hover:text-[#F29C04] underline"
                        >
                          {event.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 uppercase text-zinc-300">
                        {event.status}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">
                        {formatDate(event.event_date)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">
                        {event.registration_open ? "Yes" : "No"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-300">{event.slug}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/events/${event.id}/edit`}
                            className="text-sm text-[#9a9a9a] hover:text-[#EBEBEB]"
                          >
                            Edit
                          </Link>
                          <ToggleEventStatusButton
                            id={event.id}
                            currentStatus={event.status}
                          />
                          <DeleteEventButton id={event.id} title={event.title} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-zinc-400">
                      No events yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <Link
          href="/admin/dashboard"
          style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", border: "1px solid #3f3f46", padding: "0.4rem 1rem", fontSize: "0.8rem", color: "#a1a1aa", textDecoration: "none", transition: "all 0.2s", width: "fit-content" }}
        >
          ← Back to dashboard
        </Link>
      </div>
    </main>
  );
}
