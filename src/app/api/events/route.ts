import { NextRequest, NextResponse } from "next/server";
import { getEvents, getUpcomingEvents, getPastEvents } from "@/lib/services/events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    if (status === "upcoming") {
      const events = await getUpcomingEvents(limit);
      return NextResponse.json(events);
    }

    if (status === "past") {
      const events = await getPastEvents(limit);
      return NextResponse.json(events);
    }

    const events = await getEvents({ limit });
    return NextResponse.json(events);
  } catch (error) {
    console.error("[GET /api/events]", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}