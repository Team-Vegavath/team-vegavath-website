import { NextRequest, NextResponse } from "next/server";
import {
  clearStallVisitManually,
  getGroupStallChecklist,
  markStallVisitedManually,
} from "@/lib/services/bootstrap";
import { getVolunteerFromCookie } from "../../volunteer-auth";

/**
 * S73G: the lead-facing half of the manual checklist backup.
 *
 * The group is resolved SERVER-SIDE from the cookie volunteer (S73B's group_id
 * join on getVolunteerByToken) and never read from the body, so a lead can only
 * ever correct their own group's record. That is the one hard difference from
 * the admin route, which takes an explicit group because there is no cookie
 * group on that side.
 *
 * This is a BACKUP path. The stall volunteer's occupy/release flow is unchanged
 * and remains the source of truth for live occupancy.
 */

async function requireLeadGroup() {
  const volunteer = await getVolunteerFromCookie();
  if (!volunteer) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (volunteer.role !== "lead") {
    return {
      error: NextResponse.json(
        { error: "Only group leads can edit their group's checklist" },
        { status: 403 }
      ),
    };
  }
  if (!volunteer.group_id) {
    return {
      error: NextResponse.json(
        { error: "You have no group assigned yet - ask an admin" },
        { status: 400 }
      ),
    };
  }
  return { volunteer, groupId: volunteer.group_id };
}

export async function GET() {
  const ctx = await requireLeadGroup();
  if ("error" in ctx) return ctx.error;

  try {
    const stalls = await getGroupStallChecklist(
      ctx.volunteer.session_id,
      ctx.groupId
    );
    return NextResponse.json({ stalls });
  } catch (error) {
    console.error("[GET /api/bootstrap/checklist/manual]", error);
    return NextResponse.json({ error: "Failed to load checklist" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireLeadGroup();
  if ("error" in ctx) return ctx.error;

  try {
    const body = await req.json();
    const stallId = body?.stall_id ? String(body.stall_id) : "";
    const visited = Boolean(body?.visited);
    if (!stallId) {
      return NextResponse.json({ error: "stall_id is required" }, { status: 400 });
    }

    if (visited) {
      // volunteer_id is the acting lead, so a manual tick carries who made it.
      await markStallVisitedManually(ctx.groupId, stallId, ctx.volunteer.id);
    } else {
      const cleared = await clearStallVisitManually(ctx.groupId, stallId);
      if (!cleared) {
        // Zero rows means either nothing was there, or the row is OPEN. Only the
        // second is worth an error, and it must not read as a silent success.
        const stalls = await getGroupStallChecklist(
          ctx.volunteer.session_id,
          ctx.groupId
        );
        const row = stalls.find((s) => s.id === stallId);
        if (row?.is_open) {
          return NextResponse.json(
            {
              error:
                "Your group is currently marked present at this stall. Ask the stall volunteer to mark you as moved on first.",
            },
            { status: 409 }
          );
        }
        // Already absent - the caller wanted it unticked and it is. Fall through.
      }
    }

    const stalls = await getGroupStallChecklist(ctx.volunteer.session_id, ctx.groupId);
    return NextResponse.json({ stalls });
  } catch (error) {
    console.error("[PATCH /api/bootstrap/checklist/manual]", error);
    return NextResponse.json({ error: "Failed to update checklist" }, { status: 500 });
  }
}
