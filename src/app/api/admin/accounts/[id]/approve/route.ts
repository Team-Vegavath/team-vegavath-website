import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createAdminAccount,
  getInviteById,
  setInviteStatus,
} from "@/lib/services/admin";

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
    const invite = (await getInviteById(id)) as {
      status: string;
      pending_username: string | null;
      pending_display_name: string | null;
      pending_mobile: string | null;
      pending_password_hash: string | null;
      pending_role: string | null;
    } | null;

    if (!invite || invite.status !== "pending_approval"
      || !invite.pending_username || !invite.pending_display_name
      || !invite.pending_password_hash) {
      return NextResponse.json({ error: "No pending request for this id" }, { status: 400 });
    }

    // The role was fixed when the godfather generated the invite; anything
    // other than 'viewer' (including a null from a pre-019 token) is 'admin'.
    const role = invite.pending_role === "viewer" ? "viewer" : "admin";

    await createAdminAccount(
      invite.pending_username,
      invite.pending_display_name,
      invite.pending_password_hash,
      invite.pending_mobile,
      role
    );
    await setInviteStatus(id, "approved");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/admin/accounts/[id]/approve]", error);
    return NextResponse.json(
      { error: "Failed to approve (username may already exist)" },
      { status: 500 }
    );
  }
}
