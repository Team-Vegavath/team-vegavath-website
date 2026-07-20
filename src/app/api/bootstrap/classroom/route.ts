import { NextRequest, NextResponse } from "next/server";
import { setClassroomMode } from "@/lib/services/bootstrap";
import { getVolunteerFromCookie } from "../volunteer-auth";

// S36: a group lead flips their own classroom-mode flag. Suppresses redirect
// suggestions and queue actions on the lead dashboard while they run a session.
export async function PATCH(req: NextRequest) {
  const volunteer = await getVolunteerFromCookie();
  if (!volunteer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => null);
    await setClassroomMode(volunteer.id, Boolean(body?.in_classroom));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/bootstrap/classroom]", error);
    return NextResponse.json({ error: "Failed to update classroom mode" }, { status: 500 });
  }
}
