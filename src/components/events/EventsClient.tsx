"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Event } from "@/types/event";

type Props = {
  events: Event[];
};

const FILTER_LABELS = ["All", "Workshops", "Hackathons", "Competitions", "Talks"] as const;
type FilterLabel = (typeof FILTER_LABELS)[number];

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EventsClient({ events }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterLabel>("All");
  const [gridRef] = useAutoAnimate<HTMLDivElement>();

  const filtered =
    activeFilter === "All"
      ? events
      : events.filter(
          (e) => e.category?.toLowerCase() === activeFilter.toLowerCase()
        );

  return (
    <>
      <div
        role="tablist"
        aria-label="Filter events by category"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "2.5rem", borderBottom: "1px solid var(--border)" }}
      >
        {FILTER_LABELS.map((label) => {
          const active = activeFilter === label;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveFilter(label)}
              className="heading events-filter-tab"
              style={{
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: "-1px",
                borderRadius: 0,
                padding: "0.65rem 1.1rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
                transition: "color 0.2s, border-color 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>
          Nothing in this category yet. Follow{" "}
          <a
            href="https://www.instagram.com/teamvegavath_pesu/"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            @teamvegavath_pesu
          </a>{" "}
          for announcements.
        </p>
      ) : (
        <div
          ref={gridRef}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 21rem), 1fr))", gap: "1rem", width: "100%" }}
        >
          {filtered.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="event-card"
              style={{
                display: "flex",
                flexDirection: "column",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: "2px solid var(--accent)",
                textDecoration: "none",
                overflow: "hidden",
                transition: "background 0.2s",
              }}
            >
              {event.cover_image_url ? (
                <div style={{ position: "relative", aspectRatio: "16/9", width: "100%", background: "var(--bg-elevated)" }}>
                  <Image
                    src={event.cover_image_url}
                    alt={event.title}
                    fill
                    style={{ objectFit: "cover" }}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              ) : null}
              <div style={{ padding: "1.25rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                <time className="mono" dateTime={event.event_date} style={{ fontSize: "0.75rem", letterSpacing: "0.14em", color: "var(--text-secondary)" }}>
                  {formatDate(event.event_date)}
                </time>
                <h2 className="heading" style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {event.title}
                </h2>
                <span className="label-tech">{event.category}</span>
                <span
                  className="heading"
                  style={{ marginTop: "auto", paddingTop: "0.75rem", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.14em", color: "var(--accent)" }}
                >
                  VIEW DETAILS →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
