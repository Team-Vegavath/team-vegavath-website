import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStallLeadVolunteers } from "@/lib/services/bootstrap";

// S33 carry-forward preview: the role='stall' accounts a new session would
// copy from this source session (no passwords - hashes never leave the DB).
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
    const stallLeads = await getStallLeadVolunteers(id);
    return NextResponse.json({ stallLeads });
  } catch (error) {
    console.error("[GET /api/admin/bootstrap/sessions/[id]/stall-leads]", error);
    return NextResponse.json({ error: "Failed to fetch stall leads" }, { status: 500 });
  }
}
