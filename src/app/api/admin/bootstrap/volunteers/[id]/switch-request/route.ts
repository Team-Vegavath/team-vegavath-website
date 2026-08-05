import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveStallSwitch } from "@/lib/services/bootstrap";

// S72C: admin side of the switch-request flow. approve reassigns through the same
// service function the MOVE STALL dropdown uses, deny just drops the request.
//
// Both layers, per the standing rule: middleware guards /api/admin/* AND this
// route re-checks. Mutating, so it carries the viewer guard too.
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
    const action = body?.action;
    if (action !== "approve" && action !== "deny") {
      return NextResponse.json(
        { error: 'action must be "approve" or "deny"' },
        { status: 400 }
      );
    }

    // False means there was no pending request on that row - either it was
    // already resolved by another admin on the same 4s poll, or the target stall
    // was deleted and the FK cleared it. Both read the same way to the admin:
    // the request is gone, refresh.
    const ok = await resolveStallSwitch(id, action);
    if (!ok) {
      return NextResponse.json(
        { error: "No pending switch request for this volunteer" },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/volunteers/[id]/switch-request]", error);
    return NextResponse.json({ error: "Failed to resolve switch request" }, { status: 500 });
  }
}
