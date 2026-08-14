import { NextRequest, NextResponse } from "next/server";
import {
  acceptQueuePlacement,
  addToQueue,
  closeStallVisit,
  getStallById,
  recordStallVisit,
  removeFromQueue,
  updateStallStatus,
} from "@/lib/services/bootstrap";
import { getVolunteerFromCookie } from "../../volunteer-auth";

// The wire-level action names are unchanged from S72; what they DO underneath
// changed in S73B.
// S73D adds accept_queued: the lead confirming an admin auto-placement.
// Declining one is plain `unqueue` - it deletes the row, so no third action.
const ACTIONS = ["claim", "release", "mark_queued", "unqueue", "accept_queued"] as const;
type VolunteerAction = (typeof ACTIONS)[number];

// S72B (Section A). Before this, the ONLY check on this route was "is there a
// valid volunteer cookie". volunteer.role was read out of the DB and then never
// consulted, so a group lead could claim and occupy every stall in the session
// from their own dashboard - which is exactly what the live test reproduced
// (10/10 stalls occupied under one login). Stall status belongs to the volunteer
// physically standing at that stall, so claim/release are stall-role only, and
// only for their OWN stall.
const STALL_ONLY_ACTIONS: readonly VolunteerAction[] = ["claim", "release"];

/**
 * S73B: queue actions are now LEAD-ONLY, which is a real behaviour change.
 *
 * Before: mark_queued was cooperative - ANY volunteer of either role could set
 * queued_by on any occupied stall, because the queue was a single scalar column
 * holding one username and "who is waiting" was whoever tapped last.
 *
 * After: a queue entry is a GROUP waiting at a stall. A stall volunteer has no
 * group, so there is nothing for them to enqueue - the action is not merely
 * discouraged for them, it is unrepresentable. The group is resolved server-side
 * from the cookie volunteer (getVolunteerByToken's group_id), never from the
 * request body, so one lead cannot queue or unqueue another lead's group.
 */
const LEAD_ONLY_ACTIONS: readonly VolunteerAction[] = [
  "mark_queued",
  "unqueue",
  "accept_queued",
];

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

    if (LEAD_ONLY_ACTIONS.includes(action)) {
      if (volunteer.role !== "lead") {
        return NextResponse.json(
          { error: "Only group leads can queue for a stall" },
          { status: 403 }
        );
      }
      // A lead whose group_number has not been swept yet (or whose group was
      // deleted) resolves to no group. 400 with the reason rather than a silent
      // no-op, so the volunteer knows to find an admin.
      if (!volunteer.group_id) {
        return NextResponse.json(
          { error: "You have no group assigned yet - ask an admin" },
          { status: 400 }
        );
      }

      if (action === "mark_queued") {
        // Session scoping and the "somebody is actually at this stall" guard are
        // both WHERE predicates inside addToQueue, so they cannot be skipped by a
        // future caller. False means one of them failed.
        const queued = await addToQueue(
          id,
          volunteer.group_id,
          volunteer.id,
          volunteer.session_id
        );
        if (!queued) {
          // Already queued here is the common case and is a success from the
          // volunteer's point of view - their group IS in the queue. Fall through
          // to the fresh-row response rather than erroring on a double-tap.
          const stall = await getStallById(id, volunteer.session_id);
          if (!stall) {
            return NextResponse.json({ error: "Stall not found" }, { status: 404 });
          }
          const alreadyQueued = stall.queue.some(
            (e) => e.group_id === volunteer.group_id
          );
          if (!alreadyQueued) {
            return NextResponse.json(
              { error: "Nobody is at that stall right now - head over instead" },
              { status: 409 }
            );
          }
          return NextResponse.json(stall);
        }
      } else if (action === "accept_queued") {
        // S73D (I5) "HEADING THERE". Scoped to the caller's own group inside the
        // service, so a lead can only ever confirm their own placement.
        await acceptQueuePlacement(id, volunteer.group_id);
      } else {
        // unqueue, which is also I5's "NOT NOW" - declining an advisory placement
        // deletes the row, so it needs no action of its own.
        await removeFromQueue(id, volunteer.group_id);
      }

      const stall = await getStallById(id, volunteer.session_id);
      if (!stall) {
        return NextResponse.json({ error: "Stall not found" }, { status: 404 });
      }
      return NextResponse.json(stall);
    }

    // S73C: claim and release now also move a GROUP through the visit table.
    // group_id is optional on both, and its absence means different things:
    //   claim   - the "unlisted group" escape (F2). Every group has already
    //             visited this stall, so there is nobody left to name; the stall
    //             is marked occupied and NO visit row is written.
    //   release - a single-group stall's one-tap release, or a stall claimed
    //             through that escape and so having no visit to close.
    const groupId = body?.group_id ? String(body.group_id) : null;

    if (action === "claim" && groupId) {
      // Visit FIRST, then claim. If the visit is rejected nothing has changed
      // yet, so the volunteer can pick again from a clean state. The reverse
      // order would leave a stall claimed after a failed naming. The residual
      // risk is the opposite ordering's mirror - a visit logged while the claim
      // then fails the occupancy cap - but hitting that cap means max_occupancy
      // volunteers are already on the stall, so it reads occupied regardless.
      const visit = await recordStallVisit(
        id,
        groupId,
        volunteer.id,
        volunteer.session_id
      );
      if (!visit.ok && visit.reason !== "already_here") {
        const messages = {
          revisited: "That group has already been to this stall",
          full: "This stall is already at its group capacity",
          invalid: "That group is not part of this session",
        } as const;
        return NextResponse.json(
          { error: messages[visit.reason] },
          { status: visit.reason === "invalid" ? 400 : 409 }
        );
      }
      // "already_here" falls through: the group IS at the stall, which is what
      // the volunteer was asserting, so a double-tap is a success.
    }

    if (action === "release") {
      const stallNow = await getStallById(id, volunteer.session_id);
      if (!stallNow) {
        return NextResponse.json({ error: "Stall not found" }, { status: 404 });
      }
      const open = stallNow.occupants;
      // With one group here the client need not name it; with several it must,
      // which is exactly when the UI shows the per-group picker.
      const leaving = groupId ?? (open.length === 1 ? open[0]!.group_id : null);
      if (!leaving && open.length > 1) {
        return NextResponse.json(
          { error: "Say which group is leaving" },
          { status: 400 }
        );
      }
      if (leaving) await closeStallVisit(id, leaving);

      // The volunteer only steps off the stall once the LAST group has gone.
      // On a max_groups = 1 stall that is identical to the pre-S73C one-tap
      // behaviour; on a multi-group stall it stops "Group 3 is leaving" from
      // silently abandoning Group 5.
      const stillHere = open.filter((o) => o.group_id !== leaving);
      if (stillHere.length > 0) {
        const fresh = await getStallById(id, volunteer.session_id);
        return NextResponse.json(fresh);
      }
    }

    // A2 - session scoping happens inside the service, on every branch.
    const stall = await updateStallStatus(
      id,
      volunteer.username,
      action as "claim" | "release",
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
