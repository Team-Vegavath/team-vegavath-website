import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBootstrapVisitors } from "@/lib/services/bootstrap";

// Full visitor list for a session, newest arrivals first, with group names.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const visitors = await getBootstrapVisitors(id);
    return NextResponse.json({ visitors });
  } catch (error) {
    console.error("[GET /api/admin/bootstrap/sessions/[id]/visitors]", error);
    return NextResponse.json({ error: "Failed to fetch visitors" }, { status: 500 });
  }
}
