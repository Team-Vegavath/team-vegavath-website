import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  clearStallVisitManually,
  getGroupStallChecklist,
  markStallVisitedManually,
} from "@/lib/services/bootstrap";

/**
 * S73G: the admin-facing half of the manual checklist backup.
 *
 * PATH: deliberately session-nested rather than the flat
 * /api/admin/bootstrap/groups/[groupId]/checklist the brief sketched. Every other
 * per-session admin action in this codebase is nested this way
 * (sessions/[id]/stalls, sessions/[id]/distribute, sessions/[id]/sweep-visits),
 * and nesting hands the route its session id for free instead of needing a
 * lookup to find it.
 *
 * The one intended difference from the lead route: group_id comes from the URL,
 * because there is no cookie-resolved group on the admin side. Admin has full
 * override authority over any group's record.
 *
 * The one place that authority deliberately STOPS: clearing a mark on an OPEN
 * visit is refused here exactly as it is for a lead. An open visit is live state
 * that a stall volunteer is looking at right now, and this backup path does not
 * silently contradict it - the existing release flow and stall-override tools
 * are the correct instruments for that. The refusal is a predicate inside
 * clearStallVisitManually, so it is not something this route could forget.
 */

async function guard() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const { id, groupId } = await params;
    const stalls = await getGroupStallChecklist(id, groupId);
    return NextResponse.json({ stalls });
  } catch (error) {
    console.error("[GET /api/admin/bootstrap/sessions/[id]/groups/[groupId]/checklist]", error);
    return NextResponse.json({ error: "Failed to load checklist" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Viewer guard: this is a WRITE, so the read-only admin tier is blocked here
  // exactly as on every other mutating admin route.
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const { id, groupId } = await params;
    const body = await req.json();
    const stallId = body?.stall_id ? String(body.stall_id) : "";
    const visited = Boolean(body?.visited);
    if (!stallId) {
      return NextResponse.json({ error: "stall_id is required" }, { status: 400 });
    }

    if (visited) {
      // volunteer_id stays NULL: no volunteer is performing an admin edit. The
      // column is write-only on this table (nothing reads it), and the
      // volunteer_id IS NULL advisory signal from S73D lives on
      // bootstrap_stall_queue, a different table - so there is no collision.
      await markStallVisitedManually(groupId, stallId, null);
    } else {
      const cleared = await clearStallVisitManually(groupId, stallId);
      if (!cleared) {
        const current = await getGroupStallChecklist(id, groupId);
        const row = current.find((s) => s.id === stallId);
        if (row?.is_open) {
          return NextResponse.json(
            {
              error:
                "This group is currently marked present at that stall. Use the stall controls to release them first.",
            },
            { status: 409 }
          );
        }
        // Nothing was there to clear - the requested end state already holds.
      }
    }

    const stalls = await getGroupStallChecklist(id, groupId);
    return NextResponse.json({ stalls });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/sessions/[id]/groups/[groupId]/checklist]", error);
    return NextResponse.json({ error: "Failed to update checklist" }, { status: 500 });
  }
}
