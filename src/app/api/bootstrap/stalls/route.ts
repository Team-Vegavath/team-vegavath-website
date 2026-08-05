import { NextResponse } from "next/server";
import {
  getActiveBootstrapSession,
  getBootstrapStalls,
  getSessionVolunteerNames,
} from "@/lib/services/bootstrap";
import { getVolunteerFromCookie } from "../volunteer-auth";

export async function GET() {
  const volunteer = await getVolunteerFromCookie();
  if (!volunteer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // volunteer cookie lookup already joins on the active session, so the
    // active session IS the volunteer's session - one extra tiny query
    const [stalls, session, volunteerNames] = await Promise.all([
      getBootstrapStalls(volunteer.session_id),
      getActiveBootstrapSession(),
      // S72C (Section D1): username -> display_name only. getBootstrapVolunteers
      // is NOT usable here - it selects login_code in plaintext and this endpoint
      // is volunteer-authenticated. See getSessionVolunteerNames' own comment.
      getSessionVolunteerNames(volunteer.session_id),
    ]);
    return NextResponse.json({
      stalls,
      session: { map_image_url: session?.map_image_url ?? null },
      mySuggestion: volunteer.suggested_stall_name ?? null,
      // S72B: the id, not just the name. The server enforces the ownership gate
      // (A3) either way, but without the id the client cannot tell which stall is
      // the volunteer's own, so the stall-volunteer picker offered every stall
      // and every tap but one would 403 silently. 72C's lock-in rewrite uses this.
      mySuggestionId: volunteer.suggested_stall_id ?? null,
      // S72C - the volunteer's own pending stall-switch request. The id is the
      // pending predicate (migration 025: the FK nulls it alone, so the timestamp
      // can outlive it); the name is for the "pending" label.
      switchRequestStallId: volunteer.switch_requested_stall_id ?? null,
      switchRequestStallName: volunteer.switch_requested_stall_name ?? null,
      // S72C (Section D1) - names for the release-confirmation dialog, so it can
      // say "Kethan K B is queued here" rather than an SRN.
      volunteerNames,
      volunteerRole: volunteer.role ?? "stall", // S32 - picks the dashboard view
      checkinToken: volunteer.checkin_token ?? null, // S33 - lead's stable QR token
      groupNumber: volunteer.group_number ?? null, // S35 - assigned FCFS on activation
      inClassroom: volunteer.in_classroom ?? false, // S36 - lead classroom-mode flag
    });
  } catch (error) {
    console.error("[GET /api/bootstrap/stalls]", error);
    return NextResponse.json({ error: "Failed to fetch stalls" }, { status: 500 });
  }
}
