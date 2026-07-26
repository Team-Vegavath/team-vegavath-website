import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setSessionMapImage } from "@/lib/services/bootstrap";

// Admin sets the session's map image URL (paste an R2 or other https URL).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const url = String(body?.map_image_url ?? "").trim();
    if (!url) {
      return NextResponse.json({ error: "map_image_url required" }, { status: 400 });
    }

    await setSessionMapImage(id, url);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/sessions/[id]/map]", error);
    return NextResponse.json({ error: "Failed to set map image" }, { status: 500 });
  }
}
