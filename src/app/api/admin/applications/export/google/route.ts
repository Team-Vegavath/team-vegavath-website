import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApplications } from "@/lib/services/applications";
import { exportTableToGoogleSheets } from "@/lib/services/googleExport";
import { applicationsTable } from "@/lib/utils/exportTables";
import type { ApplicationStatus } from "@/types/settings";

// S73K: sibling of the CSV export, same data, different destination. POST rather
// than GET because it creates a file in the team's Drive.
//
// Viewer guard, even though the underlying data is readable by viewers: this
// writes to a shared Drive folder, and a read-only account creating files in the
// team's Drive is a side effect the tier is meant not to have. Viewers keep the
// CSV download.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const apps = await getApplications({
    status: (status as ApplicationStatus) || undefined,
    limit: 500,
  });

  // Never throws -- see exportTableToGoogleSheets. 502 marks it as an upstream
  // failure rather than a bad request, and the message is already admin-safe.
  const result = await exportTableToGoogleSheets(applicationsTable(apps));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, url: result.url, name: result.name });
}
