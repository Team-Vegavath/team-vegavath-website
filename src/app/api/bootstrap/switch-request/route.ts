import { NextRequest, NextResponse } from "next/server";
import { requestStallSwitch } from "@/lib/services/bootstrap";
import { getVolunteerFromCookie } from "../volunteer-auth";

// S72C: the sanctioned way for a stall volunteer to change stalls.
//
// S72B's A3 ownership gate locked each stall volunteer to their own
// suggested_stall_id, which correctly stopped them mutating other stalls but left
// no path to change stalls at all short of finding an admin in person. This route
// records the ASK; only PATCH /api/admin/bootstrap/volunteers/[id]/switch-request
// can act on it. Nothing here reassigns anything.
//
// Volunteer cookie is the whole auth model (middleware never gates
// /api/bootstrap/*), so the route writes the CALLER's own row only - the
// volunteer id comes from the cookie lookup, never from the body.
export async function POST(req: NextRequest) {
  const volunteer = await getVolunteerFromCookie();
  if (!volunteer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const stallId = body?.stall_id;
    if (typeof stallId !== "string" || !stallId) {
      return NextResponse.json({ error: "stall_id is required" }, { status: 400 });
    }

    // Role check here as well as in the service predicate: a lead gets a readable
    // 403 rather than the generic "could not request" a failed UPDATE produces.
    if (volunteer.role !== "stall") {
      return NextResponse.json(
        { error: "Only stall volunteers can request a stall switch" },
        { status: 403 }
      );
    }

    // requestStallSwitch carries the rest as WHERE predicates: the volunteer must
    // already have an assignment, the target must differ from it, and the target
    // must be a stall in this volunteer's own session. False means one of those
    // failed - deliberately one message, since the client only ever offers taps
    // that satisfy all of them and a crafted POST is owed no diagnostics.
    const ok = await requestStallSwitch(volunteer.id, stallId);
    if (!ok) {
      return NextResponse.json(
        { error: "That stall cannot be requested. Ask an admin to move you." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/bootstrap/switch-request]", error);
    return NextResponse.json({ error: "Failed to request switch" }, { status: 500 });
  }
}
