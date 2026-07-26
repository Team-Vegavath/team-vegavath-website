import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createInviteToken,
  createOpenViewerToken,
  getOpenViewerTokens,
  revokeOpenToken,
} from "@/lib/services/admin";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin || !session.user.isGodfather) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => null);

    // S48: one reusable, unnamed link that registers anyone as a viewer.
    // No invitee name to slugify, so it uses the flat /admin/register path.
    if (body?.type === "open") {
      const { token } = await createOpenViewerToken();
      return NextResponse.json({
        url: `${req.nextUrl.origin}/admin/register?token=${token}`,
        token,
        role: "viewer",
      });
    }

    const inviteeName = String(body?.inviteeName ?? "").trim();
    // Must slugify to something non-empty for the URL segment
    if (!inviteeName || !/[a-z0-9]/i.test(inviteeName)) {
      return NextResponse.json({ error: "Invitee name is required" }, { status: 400 });
    }

    // Only 'viewer' opts out of the default; an unknown value is never
    // trusted into a privilege level.
    const pendingRole = body?.role === "viewer" ? "viewer" : "admin";

    const { token, slug } = await createInviteToken(inviteeName, pendingRole);
    return NextResponse.json({
      url: `${req.nextUrl.origin}/admin/invite/${slug}/${token}`,
      role: pendingRole,
    });
  } catch (error) {
    console.error("[POST /api/admin/accounts/invite]", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}

/** GET /api/admin/accounts/invite?type=open -- active open viewer links.
 *  The accounts page server-renders the same list; this exists so the client
 *  can refresh it after a create/revoke without a full navigation. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin || !session.user.isGodfather) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (req.nextUrl.searchParams.get("type") !== "open") {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  try {
    const tokens = await getOpenViewerTokens();
    return NextResponse.json({
      tokens: tokens.map((t) => ({
        ...t,
        url: `${req.nextUrl.origin}/admin/register?token=${t.token}`,
      })),
    });
  } catch (error) {
    console.error("[GET /api/admin/accounts/invite]", error);
    return NextResponse.json({ error: "Failed to load open links" }, { status: 500 });
  }
}

/** DELETE /api/admin/accounts/invite?tokenId=xxx -- revoke an open link. */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin || !session.user.isGodfather) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  const tokenId = req.nextUrl.searchParams.get("tokenId");
  if (!tokenId) {
    return NextResponse.json({ error: "Missing tokenId" }, { status: 400 });
  }

  try {
    await revokeOpenToken(tokenId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/accounts/invite]", error);
    return NextResponse.json({ error: "Failed to revoke link" }, { status: 500 });
  }
}
