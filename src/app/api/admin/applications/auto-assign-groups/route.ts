import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { autoAssignInterviewGroups } from "@/lib/services/applications";

// Round-robins every interview applicant without a panel into A..N.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const panelCount = Number(body?.panel_count);
    if (![1, 2, 3, 4].includes(panelCount)) {
      return NextResponse.json({ error: "panel_count must be 1-4" }, { status: 400 });
    }
    const assigned = await autoAssignInterviewGroups(panelCount);
    return NextResponse.json({ assigned });
  } catch (error) {
    console.error("[POST /api/admin/applications/auto-assign-groups]", error);
    return NextResponse.json({ error: "Auto-assign failed" }, { status: 500 });
  }
}
