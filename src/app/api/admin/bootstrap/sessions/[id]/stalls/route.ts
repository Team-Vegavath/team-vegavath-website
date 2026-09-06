import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addStallToSession, deleteStall } from "@/lib/services/bootstrap";

// S49: stalls used to be fixed at session creation. Admin can now add one late
// (a sponsor turns up) or drop one that never happened.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const stallName = String(body?.stallName ?? "").trim();
    const maxOccupancy = Number(body?.maxOccupancy);
    // S73B - optional, defaults to 1. Raising it past 3 is the live override
    // route's job (./stalls/[id]/max-groups), not this form's.
    const maxGroups = body?.maxGroups === undefined ? 1 : Number(body.maxGroups);

    if (!stallName || stallName.length > 60) {
      return NextResponse.json({ error: "Stall name must be 1–60 characters" }, { status: 400 });
    }
    // S77 - 1-4 matches the segmented occupancy control (raised from 3). Late-
    // added stalls carry no time limit; the column defaults to NULL (no timer).
    if (![1, 2, 3, 4].includes(maxOccupancy)) {
      return NextResponse.json({ error: "Occupancy must be 1, 2, 3 or 4" }, { status: 400 });
    }
    if (![1, 2, 3].includes(maxGroups)) {
      return NextResponse.json({ error: "Groups must be 1, 2 or 3" }, { status: 400 });
    }

    const stall = await addStallToSession(id, stallName, maxOccupancy, maxGroups);
    if (!stall) {
      return NextResponse.json({ error: "Failed to add stall" }, { status: 500 });
    }
    return NextResponse.json({ stall });
  } catch (error) {
    console.error("[POST /api/admin/bootstrap/sessions/[id]/stalls]", error);
    return NextResponse.json({ error: "Failed to add stall" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const stallId = new URL(req.url).searchParams.get("stallId");
    if (!stallId) {
      return NextResponse.json({ error: "stallId is required" }, { status: 400 });
    }

    // scoped to this session - a stall id from another session reads as 404
    const result = await deleteStall(stallId, id);
    if (!result.ok) {
      if (result.reason === "not_found") {
        return NextResponse.json({ error: "Stall not found" }, { status: 404 });
      }
      // S72B (Section K): 409 with the names, because deleting this stall would
      // have silently wiped their registration choice via the FK's
      // ON DELETE SET NULL. Re-point them with MOVE STALL first.
      if (result.reason === "assigned") {
        return NextResponse.json(
          {
            error: `${result.volunteers.length} volunteer(s) are assigned to this stall: ${result.volunteers.join(", ")}. Move them to another stall before deleting it.`,
          },
          { status: 409 }
        );
      }
      // 409: someone is standing at it - free the stall first
      return NextResponse.json(
        { error: "Stall is occupied. Free it before deleting." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/bootstrap/sessions/[id]/stalls]", error);
    return NextResponse.json({ error: "Failed to delete stall" }, { status: 500 });
  }
}
