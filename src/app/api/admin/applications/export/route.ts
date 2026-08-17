import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApplications } from "@/lib/services/applications";
import { applicationsTable, toCsv } from "@/lib/utils/exportTables";
import type { ApplicationStatus } from "@/types/settings";

// S73K: the column list and the RFC 4180 quoting moved to lib/utils/exportTables
// so the Google Sheets destination cannot drift from this one. Behaviour here is
// unchanged -- same columns, same order, same headers.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const apps = await getApplications({
    status: (status as ApplicationStatus) || undefined,
    limit: 500,
  });

  const table = applicationsTable(apps);

  return new NextResponse(toCsv(table), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table.name}-${Date.now()}.csv"`,
    },
  });
}
