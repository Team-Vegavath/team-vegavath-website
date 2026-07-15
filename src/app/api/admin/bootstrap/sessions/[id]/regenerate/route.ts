import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { regenerateVolunteerCredentials } from "@/lib/services/bootstrap";

// New passwords for every volunteer + all session tokens cleared.
// Old CSV becomes worthless; plain passwords returned once, client builds the CSV.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const credentials = await regenerateVolunteerCredentials(id);
    return NextResponse.json({ credentials });
  } catch (error) {
    console.error("[POST /api/admin/bootstrap/sessions/[id]/regenerate]", error);
    return NextResponse.json({ error: "Failed to regenerate credentials" }, { status: 500 });
  }
}
