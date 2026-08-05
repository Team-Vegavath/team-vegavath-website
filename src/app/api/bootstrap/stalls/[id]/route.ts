import { NextRequest, NextResponse } from "next/server";
import { updateStallStatus } from "@/lib/services/bootstrap";
import { getVolunteerFromCookie } from "../../volunteer-auth";

// mark_queued is cooperative - any volunteer, either role, may signal a queue on
// any occupied stall in their session: that is the group lead's whole job (see
// docs/bootstrap-spec.md, "group volunteers get queue"). unqueue is likewise open
// to both, still gated in the UI to the volunteer recorded in queued_by (a stale
// tap is harmless and the next poll self-corrects).
//
// claim/release are NOT cooperative. See STALL_ONLY_ACTIONS below.
const ACTIONS = ["claim", "release", "mark_queued", "unqueue"] as const;
type VolunteerAction = (typeof ACTIONS)[number];

// S72B (Section A). Before this, the ONLY check on this route was "is there a
// valid volunteer cookie". volunteer.role was read out of the DB and then never
// consulted, so a group lead could claim and occupy every stall in the session
// from their own dashboard - which is exactly what the live test reproduced
// (10/10 stalls occupied under one login). Stall status belongs to the volunteer
// physically standing at that stall, so claim/release are stall-role only, and
// only for their OWN stall.
const STALL_ONLY_ACTIONS: readonly VolunteerAction[] = ["claim", "release"];

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

    if (STALL_ONLY_ACTIONS.includes(action)) {
      // A1 - role gate.
      if (volunteer.role !== "stall") {
        return NextResponse.json(
          { error: "Group volunteers cannot claim or release a stall" },
          { status: 403 }
        );
      }
      // A3 - ownership gate. This, not the UI dropping its picker, is what
      // actually stops a stall volunteer reaching a stall that is not theirs.
      //
      // Null-guarded on purpose: suggested_stall_id is nullable (an unmatched
      // pre-registration pool member, or a volunteer whose stall was deleted -
      // see Section K). With no assignment there is nothing to enforce, so they
      // keep the pre-S72B behaviour rather than being locked out of every stall.
      if (volunteer.suggested_stall_id && volunteer.suggested_stall_id !== id) {
        return NextResponse.json(
          { error: "You can only update the stall you are assigned to" },
          { status: 403 }
        );
      }
    }

    // A2 - session scoping happens inside the service, on every branch.
    const stall = await updateStallStatus(
      id,
      volunteer.username,
      action,
      volunteer.session_id
    );
    if (!stall) {
      return NextResponse.json({ error: "Stall not found" }, { status: 404 });
    }
    return NextResponse.json(stall);
  } catch (error) {
    console.error("[PATCH /api/bootstrap/stalls/[id]]", error);
    return NextResponse.json({ error: "Failed to update stall" }, { status: 500 });
  }
}
