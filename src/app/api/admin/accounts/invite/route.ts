import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createInviteToken } from "@/lib/services/admin";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin || !session.user.isGodfather) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const inviteeName = String(body?.inviteeName ?? "").trim();
    // Must slugify to something non-empty for the URL segment
    if (!inviteeName || !/[a-z0-9]/i.test(inviteeName)) {
      return NextResponse.json({ error: "Invitee name is required" }, { status: 400 });
    }

    const { token, slug } = await createInviteToken(inviteeName);
    return NextResponse.json({
      url: `${req.nextUrl.origin}/admin/invite/${slug}/${token}`,
    });
  } catch (error) {
    console.error("[POST /api/admin/accounts/invite]", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
