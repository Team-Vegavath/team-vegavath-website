import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBootstrapFeedbackSummary } from "@/lib/services/bootstrap";

// Feedback summary: totals, per-stall averages, recent comments.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const summary = await getBootstrapFeedbackSummary(id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[GET /api/admin/bootstrap/sessions/[id]/feedback]", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}
