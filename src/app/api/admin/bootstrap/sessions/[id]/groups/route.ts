import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  assignUnassignedVisitors,
  createBootstrapGroups,
} from "@/lib/services/bootstrap";

// AUTO-BATCH: ensure N groups exist, then round-robin every unassigned
// visitor across the session's groups.
export async function POST(
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
    const count = Number(body?.count);
    if (!Number.isInteger(count) || count < 1 || count > 26) {
      return NextResponse.json({ error: "count must be 1-26" }, { status: 400 });
    }
    await createBootstrapGroups(id, count);
    const assigned = await assignUnassignedVisitors(id);
    return NextResponse.json({ ok: true, assigned });
  } catch (error) {
    console.error("[POST /api/admin/bootstrap/sessions/[id]/groups]", error);
    return NextResponse.json({ error: "Failed to create groups" }, { status: 500 });
  }
}
