import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import DeleteEventButton from "@/components/admin/DeleteEventButton";
import EventForm from "@/components/admin/EventForm";
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
      <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <Link
            href="/admin/events"
            className="w-fit text-sm text-zinc-400 transition-colors hover:text-zinc-200"
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
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
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
          className="w-fit text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          ← Back to dashboard
        </Link>
      </div>
    </main>
  );
}
