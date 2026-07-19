import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setVolunteerRole } from "@/lib/services/bootstrap";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const role = body?.role;
    if (role !== "stall" && role !== "lead") {
      return NextResponse.json({ error: "role must be 'stall' or 'lead'" }, { status: 400 });
    }
    await setVolunteerRole(id, role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/volunteers/[id]/role]", error);
    return NextResponse.json({ error: "Failed to set role" }, { status: 500 });
  }
}
