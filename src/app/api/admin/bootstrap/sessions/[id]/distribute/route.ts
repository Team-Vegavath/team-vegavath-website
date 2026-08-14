import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { distributeGroups } from "@/lib/services/bootstrap";

/**
 * S73D (I1): spread unplaced groups across stalls as advisory placements.
 *
 * Re-runnable and idempotent - the candidate set is groups with no queue row
 * anywhere, so a second tap only fills gaps and never reshuffles. Returns
 * "placed N of M" (I4); there is no refusal on overflow, and groups that fit
 * nowhere simply get no row.
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
    const result = await distributeGroups(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/admin/bootstrap/sessions/[id]/distribute]", error);
    return NextResponse.json({ error: "Failed to distribute groups" }, { status: 500 });
  }
}
