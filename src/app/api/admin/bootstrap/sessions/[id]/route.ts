import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deleteBootstrapSession,
  getBootstrapGroups,
  getBootstrapStalls,
  getBootstrapVolunteers,
  updateBootstrapSession,
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

// S49: rename a session / change its visitor cap after creation. Both fields are
// optional - an empty body is rejected so a no-op PATCH cannot silently pass.
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

    const data: { name?: string; max_group_size?: number } = {};

    if (body?.name !== undefined) {
      const name = String(body.name).trim();
      if (!name || name.length > 100) {
        return NextResponse.json({ error: "Name must be 1–100 characters" }, { status: 400 });
      }
      data.name = name;
    }

    if (body?.max_group_size !== undefined) {
      const size = Number(body.max_group_size);
      if (!Number.isInteger(size) || size < 1 || size > 100) {
        return NextResponse.json({ error: "Max group size must be 1–100" }, { status: 400 });
      }
      data.max_group_size = size;
    }

    if (data.name === undefined && data.max_group_size === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await updateBootstrapSession(id, data);
    if (!updated) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/sessions/[id]]", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
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
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
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
