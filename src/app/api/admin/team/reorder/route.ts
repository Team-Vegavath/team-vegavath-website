import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reorderTeamMembers } from "@/lib/services/team";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => null);
    const tier = typeof body?.tier === "string" ? body.tier : "";
    const ids: unknown = body?.ids;

    if (!tier || !Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
      return NextResponse.json(
        { error: "tier (string) and ids (string[]) are required" },
        { status: 400 }
      );
    }

    await reorderTeamMembers(tier, ids as string[]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/admin/team/reorder]", error);
    return NextResponse.json({ error: "Failed to reorder members" }, { status: 500 });
  }
}
