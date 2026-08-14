import { NextRequest, NextResponse } from "next/server";
import { getUnvisitedGroups } from "@/lib/services/bootstrap";
import { getVolunteerFromCookie } from "../../../volunteer-auth";

/**
 * S73C (F1): the groups this stall may still receive - every group in the
 * session that has not been here yet.
 *
 * Carries the same role and ownership gates as the claim it feeds. Without them
 * any volunteer could enumerate a session's groups from any stall; with them the
 * list a volunteer can see matches the list they can act on. It is only a
 * convenience either way - the claim re-validates the chosen group server-side
 * (recordStallVisit), so a stale or crafted list buys nothing.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const volunteer = await getVolunteerFromCookie();
  if (!volunteer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (volunteer.role !== "stall") {
    return NextResponse.json(
      { error: "Only stall volunteers log group arrivals" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    if (volunteer.suggested_stall_id && volunteer.suggested_stall_id !== id) {
      return NextResponse.json(
        { error: "You can only update the stall you are assigned to" },
        { status: 403 }
      );
    }

    const groups = await getUnvisitedGroups(id, volunteer.session_id);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("[GET /api/bootstrap/stalls/[id]/groups]", error);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}
