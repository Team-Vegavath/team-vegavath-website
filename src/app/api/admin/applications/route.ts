import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApplications, deleteApplication } from "@/lib/services/applications";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types/settings";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const statusParam = new URL(req.url).searchParams.get("status");
    if (statusParam && !APPLICATION_STATUSES.includes(statusParam as ApplicationStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const applications = await getApplications({
      status: (statusParam as ApplicationStatus | null) ?? undefined,
      limit: 200,
    });
    return NextResponse.json(applications);
  } catch (error) {
    console.error("[GET /api/admin/applications]", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await deleteApplication(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/applications]", error);
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}
