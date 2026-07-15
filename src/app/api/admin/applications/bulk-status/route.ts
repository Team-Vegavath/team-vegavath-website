import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bulkSetStatus } from "@/lib/services/applications";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types/settings";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { ids?: unknown; status?: unknown };
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((v): v is string => typeof v === "string")
      : [];
    const status = typeof body.status === "string" ? body.status : "";

    if (ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }
    if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await bulkSetStatus(ids, status as ApplicationStatus);
    return NextResponse.json({ success: true, updated: updated.length });
  } catch (error) {
    console.error("[POST /api/admin/applications/bulk-status]", error);
    return NextResponse.json({ error: "Bulk update failed" }, { status: 500 });
  }
}
