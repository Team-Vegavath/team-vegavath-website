import type { Metadata } from "next";
import { getEvents } from "@/lib/services/events";
import { getGalleryItems, getGalleryEvents } from "@/lib/services/gallery";
import type { Event } from "@/types/event";
import type { GalleryItem } from "@/types/gallery";
import GalleryClient from "@/components/gallery/GalleryClient";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Gallery | Team Vegavath",
};

export const revalidate = 120;

type GalleryEventFilter = {
  event_label: string;
  event_id: string | null;
};

type FilterOption = {
  id: string | "all";
  label: string;
};

export default async function GalleryPage() {
  let galleryItems: GalleryItem[] = [];
  let galleryEvents: GalleryEventFilter[] = [];
  let events: Event[] = [];

  try {
    [galleryItems, galleryEvents, events] = await Promise.all([
      getGalleryItems(),
      getGalleryEvents(),
      getEvents({ limit: 100 }),
    ]);
  } catch {
    galleryItems = [];
    galleryEvents = [];
    events = [];
  }

  const galleryEventIds = new Set(
    galleryEvents
      .map((event) => event.event_id)
      .filter((eventId): eventId is string => Boolean(eventId))
  );

  const filters: FilterOption[] = [
    { id: "all", label: "All" },
    ...events
      .filter((event) => galleryEventIds.has(event.id))
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((event) => ({
        id: event.id,
        label: event.title,
      })),
  ];

  return (
    <main style={{ background: "#121212", color: "#EBEBEB", overflowX: "hidden" }}>
      <section style={{ width: "100%", paddingTop: "6rem", paddingBottom: "6rem" }}>
        <Container>
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            <header style={{ width: "100%", textAlign: "center" }}>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, letterSpacing: "0.15em", color: "#EBEBEB", textAlign: "center" }}>
                GALLERY
              </h1>
              <p style={{ margin: "1rem auto 0", maxWidth: "48rem", fontSize: "1rem", color: "#9a9a9a", textAlign: "center" }}>
                A visual journey through our projects, events, workshops, and memorable moments
              </p>
            </header>
            <GalleryClient items={galleryItems} filters={filters} />
          </div>
        </Container>
      </section>
    </main>
  );
}


