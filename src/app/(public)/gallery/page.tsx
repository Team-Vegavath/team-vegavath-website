import type { Metadata } from "next";
import { getEvents } from "@/lib/services/events";
import { getGalleryItems, getGalleryEvents } from "@/lib/services/gallery";
import type { Event } from "@/types/event";
import type { GalleryItem } from "@/types/gallery";
import GalleryClient from "@/components/gallery/GalleryClient";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Gallery",
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
    <main style={{ background: "var(--bg-base)", color: "var(--text-primary)", overflowX: "hidden", minHeight: "100vh" }}>
      <section style={{ width: "100%", padding: "9rem 0 6rem" }}>
        <Container>
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            <header>
              <p className="label-tech" style={{ color: "var(--accent)", marginBottom: "0.75rem" }}>
                Builds, events & everything between
              </p>
              <h1 className="heading" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                Gallery
              </h1>
            </header>
            <GalleryClient items={galleryItems} filters={filters} />
          </div>
        </Container>
      </section>
    </main>
  );
}
