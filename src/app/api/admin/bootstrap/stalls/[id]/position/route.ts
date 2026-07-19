import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setStallMapPosition } from "@/lib/services/bootstrap";

// Admin sets a stall's map position as percentages from the image top-left.
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
    const body = await req.json();
    // null/null removes the pin (S33 pin-drop CLEAR)
    if (body?.map_x === null && body?.map_y === null) {
      await setStallMapPosition(id, null, null);
      return NextResponse.json({ ok: true });
    }
    const x = Number(body?.map_x);
    const y = Number(body?.map_y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
      return NextResponse.json(
        { error: "map_x and map_y must be numbers between 0 and 100" },
        { status: 400 }
      );
    }

    await setStallMapPosition(id, x, y);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/stalls/[id]/position]", error);
    return NextResponse.json({ error: "Failed to set stall position" }, { status: 500 });
  }
}
