import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { suggestStallToVolunteer } from "@/lib/services/bootstrap";

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
    const stallId = body.stall_id;
    if (stallId !== null && typeof stallId !== "string") {
      return NextResponse.json({ error: "stall_id must be a string or null" }, { status: 400 });
    }
    await suggestStallToVolunteer(id, stallId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/volunteers/[id]/suggest]", error);
    return NextResponse.json({ error: "Failed to set suggestion" }, { status: 500 });
  }
}
