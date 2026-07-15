import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createMilestone, deleteMilestone, getMilestones } from "@/lib/services/about";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ milestones: await getMilestones() });
  } catch (error) {
    console.error("[GET /api/admin/milestones]", error);
    return NextResponse.json({ error: "Failed to load milestones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const dateLabel = String(body?.date_label ?? "").trim();
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const sortOrder = Number(body?.sort_order ?? 0);

    if (!dateLabel || !title || !description || !Number.isFinite(sortOrder)) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const rows = await createMilestone(dateLabel, title, description, sortOrder);
    return NextResponse.json({ milestone: rows[0] });
  } catch (error) {
    console.error("[POST /api/admin/milestones]", error);
    return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await deleteMilestone(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/milestones]", error);
    return NextResponse.json({ error: "Failed to delete milestone" }, { status: 500 });
  }
}
