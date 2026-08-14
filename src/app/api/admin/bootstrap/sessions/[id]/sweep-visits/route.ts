import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sweepOpenVisits } from "@/lib/services/bootstrap";

/**
 * S73C (G3): close every still-open visit in a session.
 *
 * Visits only get a left_at when a volunteer taps RELEASE, and at the end of a
 * real event people walk away instead. Without this sweep those rows stay open
 * forever and S73D's checklist would show the stalls as never finished.
 *
 * Deliberately its own explicit action rather than logic hung off session
 * deactivation: "the session ended" and "every group finished at every stall"
 * are different claims, and only a human should assert the second.
 */
export async function POST(
  _req: NextRequest,
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
    const closed = await sweepOpenVisits(id);
    return NextResponse.json({ closed });
  } catch (error) {
    console.error("[POST /api/admin/bootstrap/sessions/[id]/sweep-visits]", error);
    return NextResponse.json({ error: "Failed to close visits" }, { status: 500 });
  }
}
