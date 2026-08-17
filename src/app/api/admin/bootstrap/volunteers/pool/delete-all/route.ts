import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteAllPoolVolunteers } from "@/lib/services/bootstrap";

// S73K: wipe the pre-registration pool between events. Irreversible -- the UI
// confirms and offers the CSV export first, but nothing here can undo it.
//
// POST rather than DELETE: it targets no single resource, and a GET/DELETE with
// no id is the shape a stray prefetch or a link-scanner can trip.
export async function POST() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    // The service's `session_id IS NULL` predicate is the only thing standing
    // between this and every volunteer in every session, which is why it lives
    // in the SQL rather than being assembled here.
    const deleted = await deleteAllPoolVolunteers();
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    console.error("[POST /api/admin/bootstrap/volunteers/pool/delete-all]", error);
    return NextResponse.json({ error: "Failed to clear the pool" }, { status: 500 });
  }
}
