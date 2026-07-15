import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPasswordResetToken, getAdminAccountById } from "@/lib/services/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin || !session.user.isGodfather) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const account = await getAdminAccountById(id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const token = await createPasswordResetToken(id);
    return NextResponse.json({
      url: `${req.nextUrl.origin}/admin/${account.username}/credentials/${token}`,
    });
  } catch (error) {
    console.error("[POST /api/admin/accounts/[id]/reset-token]", error);
    return NextResponse.json({ error: "Failed to create reset link" }, { status: 500 });
  }
}
