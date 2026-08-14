import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setStallMaxGroups } from "@/lib/services/bootstrap";

// S73B (Section C): live per-stall group capacity. Sibling of ./position, and
// deliberately shaped like it - a bare single-column write that stays out of the
// stall status state machine.
//
// This is the WIDE-range widget. The setup-time tiles offer 1/2/3 to match
// max_occupancy's control; this one accepts 1-10, which is why migration 027
// carries no `CHECK BETWEEN 1 AND 3`. The DB CHECK backs this validation up, so a
// bad value fails even if a future caller skips the route.
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
    const n = Number(body?.max_groups);

    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return NextResponse.json(
        { error: "max_groups must be a whole number between 1 and 10" },
        { status: 400 }
      );
    }

    // Lowering is not retroactive: it gates new admissions only and never evicts
    // groups already at the stall, matching max_occupancy's existing precedent.
    await setStallMaxGroups(id, n);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/stalls/[id]/max-groups]", error);
    return NextResponse.json({ error: "Failed to set stall capacity" }, { status: 500 });
  }
}
