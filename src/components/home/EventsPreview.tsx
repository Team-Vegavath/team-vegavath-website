"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type EventPreview = {
  id: string;
  slug: string;
  title: string;
  category: string;
  event_date: string;
};

interface EventsPreviewProps {
  upcoming: EventPreview[];
  past: EventPreview[];
}

function formatEventDate(date: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function EventRow({ event, upcoming }: { event: EventPreview; upcoming?: boolean }) {
  return (
    <motion.div variants={itemVariants}>
      <Link href={`/events/${event.slug}`} className="event-row">
        <time className="event-date mono" dateTime={event.event_date} style={{ fontSize: "0.8rem", color: upcoming ? "var(--accent)" : "var(--text-secondary)" }}>
          {formatEventDate(event.event_date)}
        </time>
        <div className="event-main">
          <p className="heading" style={{ fontWeight: 600, fontSize: "1.15rem", color: "var(--text-primary)" }}>
            {event.title}
          </p>
          <p className="label-tech" style={{ marginTop: "0.35rem" }}>
            {upcoming ? `UPCOMING — ${event.category}` : event.category}
          </p>
        </div>
        <span className="event-view">VIEW DETAILS →</span>
      </Link>
    </motion.div>
  );
}

export function EventsPreview({ upcoming, past }: EventsPreviewProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem", marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, color: "var(--text-primary)" }}>
          EVENTS
        </h2>
        <Link
          href="/events"
          className="heading"
          style={{ fontWeight: 600, fontSize: "0.8rem", letterSpacing: "0.14em", color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap" }}
        >
          VIEW ALL →
        </Link>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>
          Next event — TBA. Follow{" "}
          <a
            href="https://www.instagram.com/teamvegavath_pesu/"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            @teamvegavath_pesu
          </a>{" "}
          to stay updated.
        </p>
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {upcoming.length === 0 ? (
            <p style={{ marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Next event — TBA. Follow{" "}
              <a
                href="https://www.instagram.com/teamvegavath_pesu/"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent)", textDecoration: "none" }}
              >
                @teamvegavath_pesu
              </a>{" "}
              to stay updated.
            </p>
          ) : (
            upcoming.map((event) => <EventRow key={event.id} event={event} upcoming />)
          )}
          {past.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
