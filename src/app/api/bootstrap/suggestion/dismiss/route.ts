import { NextResponse } from "next/server";
import { suggestStallToVolunteer } from "@/lib/services/bootstrap";
import { getVolunteerFromCookie } from "../../volunteer-auth";

export async function POST() {
  const volunteer = await getVolunteerFromCookie();
  if (!volunteer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // S72B (Section K, second path). suggested_stall_id does double duty: for a
  // STALL volunteer it is their assignment, written when they picked a stall at
  // self-registration; for a LEAD it is only the dismissible "ADMIN SUGGESTS"
  // banner. This route nulls the column, so a volunteer who was flipped TO GROUP,
  // saw their own registration stall in that banner, tapped x to clear the noise,
  // and was flipped back to TO STALL came out unassigned - with nothing recording
  // why. The banner only ever renders on the lead dashboard
  // (BootstrapDashboard's lead branch), so restricting the route to leads matches
  // what the UI can actually reach and takes the destructive path off the table
  // for the role whose assignment it is.
  if (volunteer.role !== "lead") {
    return NextResponse.json(
      { error: "Only group volunteers can dismiss a stall suggestion" },
      { status: 403 }
    );
  }

  try {
    await suggestStallToVolunteer(volunteer.id, null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/bootstrap/suggestion/dismiss]", error);
    return NextResponse.json({ error: "Failed to dismiss suggestion" }, { status: 500 });
  }
}
