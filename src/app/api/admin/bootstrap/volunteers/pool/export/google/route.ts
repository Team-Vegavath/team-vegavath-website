import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUnassignedVolunteers } from "@/lib/services/bootstrap";
import { exportTableToGoogleSheets } from "@/lib/services/googleExport";
import { poolVolunteersTable } from "@/lib/utils/exportTables";

// S73K: sibling of the pool CSV export. Same viewer-guard reasoning as the
// applications Google export -- it writes a file into the team's Drive.
export async function POST() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  const table = poolVolunteersTable(await getUnassignedVolunteers());

  const result = await exportTableToGoogleSheets(table);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, url: result.url, name: result.name });
}
