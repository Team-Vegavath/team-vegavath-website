"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EventCard, type EventCardData } from "@/components/events/EventCard";

interface EventsPreviewProps {
  upcoming: EventCardData[];
  past: EventCardData[];
}

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function InstagramTeaser() {
  return (
    <p style={{ color: "var(--text-secondary)" }}>
      Events TBA. Check out{" "}
      <a
        href="https://www.instagram.com/teamvegavath_pesu/"
        target="_blank"
        rel="noreferrer"
        style={{ color: "var(--accent)", textDecoration: "none" }}
      >
        @teamvegavath_pesu
      </a>{" "}
      for updates.
    </p>
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
        <InstagramTeaser />
      ) : (
        <>
          {upcoming.length === 0 ? (
            <div style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              <InstagramTeaser />
            </div>
          ) : null}
          <motion.div
            className="events-card-grid"
            variants={listVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {upcoming.map((event) => (
              <motion.div key={event.slug} variants={itemVariants}>
                <EventCard event={event} upcoming />
              </motion.div>
            ))}
            {past.map((event) => (
              <motion.div key={event.slug} variants={itemVariants}>
                <EventCard event={event} />
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}
