import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { getEvents } from "@/lib/services/events";
import type { Event } from "@/types/event";

export const metadata: Metadata = {
  title: "Events | Team Vegavath",
};

export const revalidate = 60;

const FILTER_LABELS = ["All", "Workshops", "Competitions", "Talks"] as const;

export default async function EventsPage() {
  let events: Event[] = [];

  try {
    events = await getEvents({ limit: 50 });
  } catch {
    events = [];
  }

  return (
    <main className="mx-auto w-full max-w-7xl bg-[#121212] px-4 py-12 text-[#EBEBEB] sm:px-6 lg:px-8 lg:py-16">
      <section className="space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#EBEBEB] sm:text-4xl">
            Events
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            {FILTER_LABELS.map((label) => (
              <button
                key={label}
                type="button"
                className="rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-[#EBEBEB] transition-colors hover:border-[#EF5D08] hover:text-[#F29C04]"
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {events.length === 0 ? (
          <p className="text-base text-[#9a9a9a]">No events found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <article
                key={event.id}
                className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]"
              >
                <div className="relative aspect-video w-full bg-[#2a2a2a]">
                  {event.cover_image_url ? (
                    <Image
                      src={event.cover_image_url}
                      alt={event.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#2a2a2a]" />
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <h2 className="text-lg font-bold text-[#EBEBEB]">{event.title}</h2>
                  <p className="text-sm text-[#9a9a9a]">
                    {new Date(event.event_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                  <Link
                    href={`/events/${event.slug}`}
                    className="inline-flex items-center rounded-md bg-[#EF5D08] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#EF5D08]"
                  >
                    View Details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
