"use client";

import { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Event } from "@/types/event";
import { EventCard } from "@/components/events/EventCard";

type Props = {
  events: Event[];
};

const FILTER_LABELS = ["All", "Workshops", "Hackathons", "Competitions", "Talks"] as const;
type FilterLabel = (typeof FILTER_LABELS)[number];

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
        <div ref={gridRef} className="events-card-grid" style={{ width: "100%" }}>
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </>
  );
}
