import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBootstrapVolunteers } from "@/lib/services/bootstrap";

// Usernames + display names only — passwords are hashed and returned exactly
// once at creation. Lost the CSV? Use POST .../regenerate.
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
    const volunteers = await getBootstrapVolunteers(id);
    const csv = [
      "display_name,username",
      ...volunteers.map((v) => `${v.display_name},${v.username}`),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="bootstrap-credentials.csv"',
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/bootstrap/sessions/[id]/credentials]", error);
    return NextResponse.json({ error: "Failed to fetch credentials" }, { status: 500 });
  }
}
