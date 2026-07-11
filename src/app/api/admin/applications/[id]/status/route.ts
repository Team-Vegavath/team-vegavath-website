import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateApplicationStatus } from "@/lib/services/applications";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types/settings";

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
    const body = await req.json() as { status?: unknown };
    const status = typeof body.status === "string" ? body.status : "";

    if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await updateApplicationStatus(id, status as ApplicationStatus);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/admin/applications/[id]/status]", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
