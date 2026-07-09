import Image from "next/image";
import Link from "next/link";

/* Shared card markup for the home events preview and the /events list:
   one source of truth so the two grids can't drift apart. */

export type EventCardData = {
  slug: string;
  title: string;
  category: string;
  event_date: string;
  cover_image_url: string | null;
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function EventCard({ event, upcoming }: { event: EventCardData; upcoming?: boolean }) {
  return (
    <Link href={`/events/${event.slug}`} className="event-card">
      {event.cover_image_url ? (
        <div className="event-card-media">
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            style={{ objectFit: "cover" }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="event-card-media event-card-media-empty">
          <span className="mono">{event.category}</span>
        </div>
      )}
      <div className="event-card-body">
        <time className="mono" dateTime={event.event_date}>
          {formatDate(event.event_date)}
        </time>
        <h3 className="heading event-card-title">{event.title}</h3>
        <span className="label-tech">{upcoming ? `UPCOMING · ${event.category}` : event.category}</span>
        <span className="heading event-card-view">VIEW DETAILS →</span>
      </div>
    </Link>
  );
}
