import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deleteBootstrapSession,
  getBootstrapGroups,
  getBootstrapStalls,
  getBootstrapVolunteers,
} from "@/lib/services/bootstrap";

// Admin live-dashboard poll: stalls + volunteers + visitor groups (S32)
// in one request.
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
    const [stalls, volunteers, groups] = await Promise.all([
      getBootstrapStalls(id),
      getBootstrapVolunteers(id),
      getBootstrapGroups(id),
    ]);
    return NextResponse.json({ stalls, volunteers, groups });
  } catch (error) {
    console.error("[GET /api/admin/bootstrap/sessions/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

// Delete an inactive session (stalls + volunteers cascade with it).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteBootstrapSession(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
