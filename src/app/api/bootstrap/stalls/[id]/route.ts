import { NextRequest, NextResponse } from "next/server";
import { updateStallStatus } from "@/lib/services/bootstrap";
import { getVolunteerFromCookie } from "../../volunteer-auth";

// mark_queued is cooperative - any volunteer may signal a queue on any
// occupied stall, no claim required. unqueue is gated in the UI to the
// volunteer recorded in queued_by (not re-checked here; a stale tap is
// harmless and the next poll self-corrects). Only release checks membership
// (implicitly: array_remove of an absent name is a no-op).
const ACTIONS = ["claim", "release", "mark_queued", "unqueue"] as const;
type VolunteerAction = (typeof ACTIONS)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const volunteer = await getVolunteerFromCookie();
  if (!volunteer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const action = body?.action as VolunteerAction;
    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const stall = await updateStallStatus(id, volunteer.username, action);
    if (!stall) {
      return NextResponse.json({ error: "Stall not found" }, { status: 404 });
    }
    return NextResponse.json(stall);
  } catch (error) {
    console.error("[PATCH /api/bootstrap/stalls/[id]]", error);
    return NextResponse.json({ error: "Failed to update stall" }, { status: 500 });
  }
}
