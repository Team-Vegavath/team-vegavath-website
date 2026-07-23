import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { Container } from "@/components/ui/Container";
import { getEventBySlug, getEvents } from "@/lib/services/events";
import { getGalleryByEvent } from "@/lib/services/gallery";
import EventMediaClient from "@/components/events/EventMediaClient";

export const dynamic = "force-dynamic";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return {
    title: event ? `${event.title} | Team Vegavath` : "Event | Team Vegavath",
  };
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) notFound();

  const galleryItems = await getGalleryByEvent(event.id);
  const formattedDate = new Date(event.event_date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const titleInitials = event.title
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <section style={{ width: "100%", padding: "9rem 0 6rem" }}>
        <Container>
          <div style={{ display: "flex", flexDirection: "column", gap: "3.5rem" }}>
            <Link
              href="/events"
              className="heading"
              style={{
                display: "inline-flex",
                width: "fit-content",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.78rem",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                textDecoration: "none",
              }}
            >
              ← All events
            </Link>

            <div className="event-detail-grid">
              <div className="event-detail-main">
                <header>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                    {event.logo_url ? (
                      <Image
                        src={event.logo_url}
                        alt={`${event.title} logo`}
                        width={64}
                        height={64}
                        style={{ height: "64px", width: "64px", objectFit: "contain", border: "1px solid var(--border)", background: "var(--bg-card)", padding: "0.4rem" }}
                        unoptimized // 64px logo, no transformation benefit
                      />
                    ) : null}
                    <div>
                      <p className="mono" style={{ fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent)" }}>
                        {formattedDate} · {event.category}
                      </p>
                      <h1 className="heading" style={{ marginTop: "0.5rem", fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, letterSpacing: "0.01em", textTransform: "uppercase" }}>
                        {event.title}
                      </h1>
                    </div>
                  </div>
                </header>

                {event.description ? (
                  <div
                    className="prose prose-invert"
                    style={{ marginTop: "2rem", maxWidth: "48rem", color: "var(--text-secondary)", lineHeight: 1.75, fontSize: "1rem" }}
                  >
                    <ReactMarkdown>{event.description}</ReactMarkdown>
                  </div>
                ) : null}

                {/* No registration block at all when there is nothing to register
                    for: the absence IS the signal. The closed message only shows
                    when a form URL exists but registration is switched off. */}
                {event.registration_open || event.registration_form_url ? (
                  <div style={{ marginTop: "2rem" }}>
                    {event.registration_open ? (
                      <a
                        href={event.registration_form_url || "/join"}
                        target={event.registration_form_url ? "_blank" : undefined}
                        rel={event.registration_form_url ? "noreferrer" : undefined}
                        className="btn-primary"
                      >
                        REGISTER NOW
                      </a>
                    ) : (
                      <p className="mono" style={{ fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                        Registration is closed for this event.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              <aside className="event-detail-cover">
                <div className="event-detail-cover-box">
                  {event.cover_image_url ? (
                    <Image
                      src={event.cover_image_url}
                      alt={event.title}
                      fill
                      style={{ objectFit: "cover" }}
                      sizes="(max-width: 1023px) 100vw, 40vw"
                    />
                  ) : (
                    <span className="event-initials" aria-hidden="true">
                      {titleInitials}
                    </span>
                  )}
                </div>
              </aside>
            </div>

            {galleryItems.length > 0 ? (
              <section>
                <h2 className="heading" style={{ fontSize: "clamp(1.4rem, 3vw, 1.9rem)", fontWeight: 700, textTransform: "uppercase", marginBottom: "1.75rem" }}>
                  Media
                </h2>
                <EventMediaClient items={galleryItems} eventTitle={event.title} />
              </section>
            ) : null}
          </div>
        </Container>
      </section>
    </main>
  );
}
