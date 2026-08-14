import { NextResponse } from "next/server";
import { getGroupRoster } from "@/lib/services/bootstrap";
import { getVolunteerFromCookie } from "../volunteer-auth";

/**
 * S73D (H2): the lead's own group roster.
 *
 * The group is resolved SERVER-SIDE from the cookie volunteer and this route
 * takes no parameters at all - there is no group id to tamper with, which is the
 * strongest form of the "never from a request parameter" rule. It reuses the
 * `group_id` join S73B added to getVolunteerByToken rather than resolving the
 * group a second way.
 *
 * Name and SRN/PRN only; getGroupRoster never selects phone.
 */
export async function GET() {
  const volunteer = await getVolunteerFromCookie();
  if (!volunteer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (volunteer.role !== "lead") {
    return NextResponse.json({ error: "Leads only" }, { status: 403 });
  }
  if (!volunteer.group_id) {
    // Not an error: a lead who has not been swept into a group yet simply has an
    // empty roster, and their dashboard already says "Not assigned yet".
    return NextResponse.json({ roster: [] });
  }

  try {
    const roster = await getGroupRoster(volunteer.group_id);
    return NextResponse.json({ roster });
  } catch (error) {
    console.error("[GET /api/bootstrap/roster]", error);
    return NextResponse.json({ error: "Failed to load roster" }, { status: 500 });
  }
}
