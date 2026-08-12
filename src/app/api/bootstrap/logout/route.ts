import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearVolunteerSession } from "@/lib/services/bootstrap";
import { getVolunteerFromCookie, VOLUNTEER_COOKIE } from "../volunteer-auth";

export async function POST() {
  try {
    const volunteer = await getVolunteerFromCookie();
    if (volunteer) {
      await clearVolunteerSession(volunteer.id);
    }
  } catch (error) {
    console.error("[POST /api/bootstrap/logout]", error);
  }
  // idempotent ∙ always clear the cookie and return 200
  const cookieStore = await cookies();
  cookieStore.delete(VOLUNTEER_COOKIE);
  return NextResponse.json({ ok: true });
}
