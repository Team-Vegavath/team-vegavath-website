import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { Container } from "@/components/ui/Container";
import { getEventBySlug } from "@/lib/services/events";
import { getGalleryByEvent } from "@/lib/services/gallery";
import { isNoRegistrationEvent, stripMarkdown } from "@/lib/utils";
import EventMediaClient from "@/components/events/EventMediaClient";

export const dynamic = "force-dynamic";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event" };

  // Descriptions are markdown in the DB, so strip it before it lands in a
  // meta tag -- same reason the Event JSON-LD below does.
  const description = event.description
    ? stripMarkdown(event.description).slice(0, 160)
    : undefined;

  return {
    title: event.title,
    ...(description ? { description } : {}),
    alternates: { canonical: `/events/${slug}` },
    openGraph: {
      title: `${event.title} | Team Vegavath`,
      ...(description ? { description } : {}),
      ...(event.cover_image_url ? { images: [event.cover_image_url] } : {}),
    },
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
  // Registration is a competition-type concept only. S44 tied the block to
  // registration_form_url, which silently dropped the "closed" message for
  // every event without a form URL -- the category check is the real gate.
  const isCompetitionType =
    event.category === "hackathons" || event.category === "competitions";
  const showRegistration =
    !isNoRegistrationEvent(event.slug) && isCompetitionType;

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

                {/* Only competition-type events register at all. Workshops,
                    talks and other categories show nothing, and the
                    no-registration slugs (Bootstrap, Freshers Day) are
                    suppressed even if the flags are set in admin. */}
                {showRegistration ? (
                  <div style={{ marginTop: "2rem" }}>
                    {event.registration_open ? (
                      <Link href={`/events/${event.slug}/register`} className="btn-primary">
                        REGISTER
                      </Link>
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

      {/* S49 LLM/AI SEO: Event schema for hackathons and competitions only -
          showcases and open-house days are not "events with a start date" that
          answer engines should surface as attendable. */}
      {isCompetitionType && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Event",
              name: event.title,
              startDate: event.event_date,
              organizer: {
                "@type": "Organization",
                name: "Team Vegavath",
                url: "https://vegavath.live",
              },
              location: {
                "@type": "Place",
                name: "PES University Electronic City Campus",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: "Bangalore",
                  addressCountry: "IN",
                },
              },
              url: `https://vegavath.live/events/${event.slug}`,
              // S50: descriptions are markdown in the DB, and literal ## / **
              // leaked into the schema output. Stripped for the schema only -
              // the visible section above still renders the markdown.
              ...(event.description
                ? { description: stripMarkdown(event.description) }
                : {}),
            }),
          }}
        />
      )}
    </main>
  );
}
