import { NextResponse } from "next/server";
import { suggestStallToVolunteer } from "@/lib/services/bootstrap";
import { getVolunteerFromCookie } from "../../volunteer-auth";

export async function POST() {
  const volunteer = await getVolunteerFromCookie();
  if (!volunteer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await suggestStallToVolunteer(volunteer.id, null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/bootstrap/suggestion/dismiss]", error);
    return NextResponse.json({ error: "Failed to dismiss suggestion" }, { status: 500 });
  }
}
