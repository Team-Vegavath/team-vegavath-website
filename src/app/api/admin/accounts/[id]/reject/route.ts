import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInviteById, setInviteStatus } from "@/lib/services/admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin || !session.user.isGodfather) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const invite = (await getInviteById(id)) as { status: string } | null;
    if (!invite || invite.status !== "pending_approval") {
      return NextResponse.json({ error: "No pending request for this id" }, { status: 400 });
    }
    await setInviteStatus(id, "rejected");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/admin/accounts/[id]/reject]", error);
    return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
  }
}
