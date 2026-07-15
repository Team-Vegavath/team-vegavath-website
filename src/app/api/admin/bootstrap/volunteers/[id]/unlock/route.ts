import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearVolunteerSession } from "@/lib/services/bootstrap";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await clearVolunteerSession(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/volunteers/[id]/unlock]", error);
    return NextResponse.json({ error: "Failed to unlock volunteer" }, { status: 500 });
  }
}
