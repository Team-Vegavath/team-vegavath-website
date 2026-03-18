import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEvents, createEvent, updateEvent, archiveEvent } from "@/lib/services/events";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const events = await getEvents({ limit: 100 });
    return NextResponse.json(events);
  } catch (error) {
    console.error("[GET /api/admin/events]", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const event = await createEvent({
      ...body,
      slug: slugify(body.title as string),
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/events]", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...input } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const event = await updateEvent(id as string, input);
    return NextResponse.json(event);
  } catch (error) {
    console.error("[PATCH /api/admin/events]", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await archiveEvent(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/events]", error);
    return NextResponse.json({ error: "Failed to archive event" }, { status: 500 });
  }
}