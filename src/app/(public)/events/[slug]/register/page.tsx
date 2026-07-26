import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EventRegisterForm from "@/components/events/EventRegisterForm";
import { Container } from "@/components/ui/Container";
import { getEventBySlug } from "@/lib/services/events";
import { isNoRegistrationEvent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RegisterPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: RegisterPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return {
    title: event ? `Register: ${event.title}` : "Register",
  };
}

export default async function EventRegisterPage({ params }: RegisterPageProps) {
  const { slug } = await params;

  // Bootstrap / Freshers Day never take registrations, so the route does not
  // exist for them -- not even a "closed" message.
  if (isNoRegistrationEvent(slug)) notFound();

  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <section style={{ width: "100%", padding: "9rem 0 6rem" }}>
        <Container>
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", maxWidth: "40rem" }}>
            <Link
              href={`/events/${event.slug}`}
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
              ← Back to event
            </Link>

            <header>
              <p
                className="mono"
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                }}
              >
                Registration
              </p>
              <h1
                className="heading"
                style={{
                  marginTop: "0.5rem",
                  fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)",
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                  textTransform: "uppercase",
                }}
              >
                {event.title}
              </h1>
            </header>

            {event.registration_open ? (
              <EventRegisterForm slug={event.slug} eventTitle={event.title} />
            ) : (
              <p
                className="mono"
                style={{
                  fontSize: "0.8rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                Registration is currently closed.
              </p>
            )}
          </div>
        </Container>
      </section>
    </main>
  );
}
