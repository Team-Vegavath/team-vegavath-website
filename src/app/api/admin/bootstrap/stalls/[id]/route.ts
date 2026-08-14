import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateStallStatus } from "@/lib/services/bootstrap";

// S73B: "queued" is gone from the admin override. It used to write the scalar
// queued_by column; a queue entry is now a real group with a real row, so
// "manually mark this stall queued" would have to ask WHICH group - a different
// control on a different grain, and not one the admin has ever needed. The
// override's job is unsticking a stall someone walked away from, which is
// free/occupied. Nothing here clears the queue either: release stopped clearing
// it (that was the whole point of S73B Section B), so there is nothing to mirror.
const STATUSES = ["free", "occupied"] as const;

// Admin override - sets status and claimed_by directly, no conflict check.
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
    const status = body?.status as string;
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // claimed_by arrives as a comma-separated string ("" clears the list).
    // Freeing a stall always clears it - admin never has to empty the field.
    const claimedBy =
      status === "free"
        ? ""
        : Array.isArray(body?.claimed_by)
          ? body.claimed_by.join(",")
          : String(body?.claimed_by ?? "");

    // sessionId null = deliberately unscoped. The admin override is the one
    // caller allowed to reach any stall in any session (S72B added session
    // scoping to every other path); this route is nested under /admin and
    // already carries both the isAdmin and the viewer guard above.
    const stall = await updateStallStatus(id, claimedBy, "override", null, status);
    if (!stall) {
      return NextResponse.json({ error: "Stall not found" }, { status: 404 });
    }
    return NextResponse.json(stall);
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/stalls/[id]]", error);
    return NextResponse.json({ error: "Failed to update stall" }, { status: 500 });
  }
}
