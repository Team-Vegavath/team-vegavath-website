import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setSessionActive } from "@/lib/services/bootstrap";

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
    await setSessionActive(id, Boolean(body?.is_active));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/sessions/[id]/active]", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
