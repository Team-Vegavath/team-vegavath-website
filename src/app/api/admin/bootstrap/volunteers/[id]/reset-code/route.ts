import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resetVolunteerLoginCode } from "@/lib/services/bootstrap";

// S55C: issue a volunteer a new login code. POST rather than a PATCH action flag
// on the parent route -- it generates a value instead of writing one the caller
// supplied, and the sibling action routes (unlock, role, assign) already set the
// precedent that an action lives in its own sub-route.
export async function POST(
  _req: NextRequest,
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
    const login_code = await resetVolunteerLoginCode(id);
    if (!login_code) {
      return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });
    }
    return NextResponse.json({ login_code });
  } catch (error) {
    console.error("[POST /api/admin/bootstrap/volunteers/[id]/reset-code]", error);
    return NextResponse.json({ error: "Failed to reset login code" }, { status: 500 });
  }
}
