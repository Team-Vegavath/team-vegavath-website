import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateMilestone } from "@/lib/services/about";

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
    const dateLabel = String(body?.date_label ?? "").trim();
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const sortOrder = Number(body?.sort_order ?? 0);

    if (!dateLabel || !title || !description || !Number.isFinite(sortOrder)) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const rows = await updateMilestone(id, dateLabel, title, description, sortOrder);
    return NextResponse.json({ milestone: rows[0] ?? null });
  } catch (error) {
    console.error("[PATCH /api/admin/milestones/[id]]", error);
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
  }
}
