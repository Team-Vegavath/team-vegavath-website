import { NextRequest, NextResponse } from "next/server";
import { getGalleryItems, getGalleryByEvent, getGalleryEvents } from "@/lib/services/gallery";

export const revalidate = 120;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const eventsOnly = searchParams.get("eventsOnly");
    const limit = parseInt(searchParams.get("limit") ?? "30", 10);

    if (eventsOnly === "true") {
      const events = await getGalleryEvents();
      return NextResponse.json(events);
    }

    if (eventId) {
      const items = await getGalleryByEvent(eventId);
      return NextResponse.json(items);
    }

    const items = await getGalleryItems(limit);
    return NextResponse.json(items);
  } catch (error) {
    console.error("[GET /api/gallery]", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery items" },
      { status: 500 }
    );
  }
}