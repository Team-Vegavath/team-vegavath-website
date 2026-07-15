import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setInterviewGroup } from "@/lib/services/applications";
import { INTERVIEW_GROUPS, type InterviewGroup } from "@/types/settings";

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
    const body = (await req.json()) as { group?: unknown };
    const group = body.group;

    if (group !== null && !INTERVIEW_GROUPS.includes(group as InterviewGroup)) {
      return NextResponse.json({ error: "Invalid group" }, { status: 400 });
    }

    await setInterviewGroup(id, group as string | null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/admin/applications/[id]/group]", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}
