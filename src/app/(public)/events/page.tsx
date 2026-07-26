import type { Metadata } from "next";
import { getEvents } from "@/lib/services/events";
import type { Event } from "@/types/event";
import EventsClient from "@/components/events/EventsClient";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Hackathons, competitions and showcases organized by Team Vegavath at PESU ECC -- including EmbedX, Ignition, and Bootstrap.",
  alternates: { canonical: "/events" },
  openGraph: {
    title: "Events | Team Vegavath",
    description:
      "EmbedX, Ignition, Bootstrap and more -- technical events by Team Vegavath at PESU ECC.",
  },
};

export const revalidate = 60;

export default async function EventsPage() {
  let events: Event[] = [];

  try {
    events = await getEvents({ limit: 50 });
  } catch {
    events = [];
  }

  return (
    <main style={{ background: "var(--bg-base)", color: "var(--text-primary)", minHeight: "100vh" }}>
      <section style={{ width: "100%", padding: "9rem 0 6rem" }}>
        <Container>
          <header style={{ marginBottom: "3rem" }}>
            <p className="label-tech" style={{ color: "var(--accent)", marginBottom: "0.75rem" }}>
              Workshops, hackathons & competitions
            </p>
            <h1 className="heading" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, letterSpacing: "0.01em", textTransform: "uppercase" }}>
              Events
            </h1>
          </header>
          <EventsClient events={events} />
        </Container>
      </section>
    </main>
  );
}
