import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  countAdminAccounts,
  deleteAdminAccount,
  getAdminAccounts,
  getPendingRequests,
} from "@/lib/services/admin";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [accounts, pending] = await Promise.all([
      getAdminAccounts(),
      getPendingRequests(),
    ]);
    // service selects never include password_hash / pending_password_hash
    return NextResponse.json({ accounts, pending });
  } catch (error) {
    console.error("[GET /api/admin/accounts]", error);
    return NextResponse.json({ error: "Failed to load accounts" }, { status: 500 });
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
    const count = await countAdminAccounts();
    if (count <= 1) {
      return NextResponse.json({ error: "Cannot delete the last admin account" }, { status: 400 });
    }
    await deleteAdminAccount(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/accounts]", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
