import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  assignVolunteerToSession,
  getBootstrapStalls,
} from "@/lib/services/bootstrap";

// S49: pull a pre-registration pool member (session_id NULL) into a real session
// and point them at one of its stalls. The service's IS NULL guard makes this a
// one-way door - an already-assigned volunteer is never silently moved.
export async function PATCH(
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
    const sessionId = String(body?.sessionId ?? "").trim();
    const stallId = body?.stallId ? String(body.stallId).trim() : null;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // a stall id from a stale form must belong to the session it is being
    // assigned into - same guard as the public stall registration route
    if (stallId) {
      const stalls = await getBootstrapStalls(sessionId);
      if (!stalls.some((s) => s.id === stallId)) {
        return NextResponse.json({ error: "Unknown stall for this session" }, { status: 400 });
      }
    }

    const assigned = await assignVolunteerToSession(id, sessionId, stallId);
    if (!assigned) {
      return NextResponse.json(
        { error: "Volunteer not found or already assigned to a session" },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/volunteers/[id]/assign]", error);
    return NextResponse.json({ error: "Failed to assign volunteer" }, { status: 500 });
  }
}
