import type { Metadata } from "next";
import { getEvents } from "@/lib/services/events";
import type { Event } from "@/types/event";
import EventsClient from "@/components/events/EventsClient";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Events | Team Vegavath",
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
    <main className="bg-[#121212] text-[#EBEBEB]">
      <section style={{ width: "100%", padding: "6rem 0 8rem" }}>
        <Container>
          <div className="space-y-8">
            <header style={{ width: "100%", textAlign: "center", marginBottom: "1rem" }}>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.02em", color: "#EBEBEB", textAlign: "center" }}>
                Events
              </h1>
            </header>
            <EventsClient events={events} />
          </div>
        </Container>
      </section>
    </main>
  );
}


