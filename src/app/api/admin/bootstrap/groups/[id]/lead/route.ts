import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assignLeadToGroup } from "@/lib/services/bootstrap";

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
    const leadId = body?.lead_id ?? null;
    if (leadId !== null && typeof leadId !== "string") {
      return NextResponse.json({ error: "lead_id must be a string or null" }, { status: 400 });
    }
    await assignLeadToGroup(id, leadId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/groups/[id]/lead]", error);
    return NextResponse.json({ error: "Failed to assign lead" }, { status: 500 });
  }
}
