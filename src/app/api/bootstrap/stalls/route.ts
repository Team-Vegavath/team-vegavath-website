import { NextResponse } from "next/server";
import { getActiveBootstrapSession, getBootstrapStalls } from "@/lib/services/bootstrap";
import { getVolunteerFromCookie } from "../volunteer-auth";

export async function GET() {
  const volunteer = await getVolunteerFromCookie();
  if (!volunteer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // volunteer cookie lookup already joins on the active session, so the
    // active session IS the volunteer's session - one extra tiny query
    const [stalls, session] = await Promise.all([
      getBootstrapStalls(volunteer.session_id),
      getActiveBootstrapSession(),
    ]);
    return NextResponse.json({
      stalls,
      session: { map_image_url: session?.map_image_url ?? null },
      mySuggestion: volunteer.suggested_stall_name ?? null,
    });
  } catch (error) {
    console.error("[GET /api/bootstrap/stalls]", error);
    return NextResponse.json({ error: "Failed to fetch stalls" }, { status: 500 });
  }
}
