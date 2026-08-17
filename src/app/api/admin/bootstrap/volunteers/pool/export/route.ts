import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUnassignedVolunteers } from "@/lib/services/bootstrap";
import { poolVolunteersTable, toCsv } from "@/lib/utils/exportTables";

// S73K: the whole pre-registration pool in one file. GET + isAdmin only, no
// viewer guard -- this reads, and read-only admins are meant to be able to read.
// Its main job is being the "export first" escape hatch beside the bulk delete.
export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // getUnassignedVolunteers' own LIMIT 200 applies. That is the same set the
  // admin pool table shows, so the export can never silently disagree with the
  // list the delete button is about to wipe.
  const table = poolVolunteersTable(await getUnassignedVolunteers());

  return new NextResponse(toCsv(table), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table.name}-${Date.now()}.csv"`,
    },
  });
}
