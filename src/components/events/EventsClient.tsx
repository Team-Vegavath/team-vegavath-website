"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Event } from "@/types/event";

type Props = {
  events: Event[];
};

const FILTER_LABELS = ["All", "Workshops", "Hackathons", "Competitions", "Talks"] as const;
type FilterLabel = (typeof FILTER_LABELS)[number];

export default function EventsClient({ events }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterLabel>("All");

  const filtered =
    activeFilter === "All"
      ? events
      : events.filter(
          (e) => e.category?.toLowerCase() === activeFilter.toLowerCase()
        );

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        {FILTER_LABELS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setActiveFilter(label)}
            style={{
              borderRadius: "9999px",
              border: "1.5px solid #EF5D08",
              background: activeFilter === label ? "#EF5D08" : "transparent",
              color: activeFilter === label ? "white" : "#EF5D08",
              padding: "0.75rem 1.75rem",
              fontSize: "clamp(0.95rem, 1.2vw, 1rem)",
              fontWeight: 600,
              lineHeight: 1,
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "#EF5D08";
              (e.currentTarget as HTMLButtonElement).style.color = "white";
            }}
            onMouseLeave={e => {
              if (activeFilter !== label) {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "#EF5D08";
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-base text-[#9a9a9a]">No events found.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))", gap: "1.5rem", width: "100%" }}>
          {filtered.map((event) => (
            <article
              key={event.id}
              className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-colors hover:border-[#EF5D08]"
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
                  <div className="flex h-full w-full items-center justify-center bg-[#2a2a2a]">
                    <span className="text-4xl">🏁</span>
                  </div>
                )}
              </div>
              <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <span className="inline-block rounded-full bg-[#EF5D08]/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#EF5D08]">
                  {event.category}
                </span>
                <h2 className="text-lg font-bold text-[#EBEBEB]">{event.title}</h2>
                {event.event_date && (
                  <p className="text-sm text-[#9a9a9a]">
                    {new Date(event.event_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
                <Link
                  href={`/events/${event.slug}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: "9999px",
                    border: "1.5px solid #EF5D08",
                    background: "transparent",
                    color: "#EF5D08",
                    padding: "0.5rem 1.25rem",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "#d44f06";
                    (e.currentTarget as HTMLAnchorElement).style.color = "#d44f06";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "#EF5D08";
                    (e.currentTarget as HTMLAnchorElement).style.color = "#EF5D08";
                  }}
                >
                  View Details →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
