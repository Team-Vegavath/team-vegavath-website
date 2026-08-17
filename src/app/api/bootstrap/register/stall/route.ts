import { NextRequest, NextResponse } from "next/server";
import {
  getActiveBootstrapSession,
  getBootstrapStalls,
  getVolunteerByUsername,
  registerVolunteer,
} from "@/lib/services/bootstrap";
import { normalisePhone } from "@/lib/utils/phone";
import { normaliseSrnPrn } from "@/lib/utils/srn";

// PUBLIC endpoint (S35) - stall volunteers register themselves before
// Bootstrap day and pick the stall they will manage.
//
// S74B: this route now requires an active session, exactly as
// /api/bootstrap/register/group has since S35. The pre-registration pool it used
// to fall into (S49, migration 021) has NOT gone away -- it moved to
// /api/bootstrap/register/pool, which is always open and asks which role the
// registrant intends. The capability is unchanged; only the door moved.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const phone = normalisePhone(String(body?.phone ?? ""));
    const srn_raw = String(body?.srn ?? "").trim();
    // S73F: the real SRN/PRN structure replaces the old alphanumeric-only rule.
    // Both formats are alphanumeric, so the username stays typeable either way.
    const srn = normaliseSrnPrn(srn_raw);
    const stallId = String(body?.stall_id ?? "");
    // S74B: preferred_stall_name is gone from this route. It only ever applied to
    // the pool branch, which now has its own endpoint, and a stall registered here
    // picks a real stall_id -- there is nothing left to prefer.

    if (!name || !srn_raw) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json(
        { error: "Phone must be 10 digits, no country code" },
        { status: 400 }
      );
    }
    if (name.length > 100) {
      return NextResponse.json({ error: "Field too long" }, { status: 400 });
    }
    if (!srn) {
      return NextResponse.json(
        { error: "SRN / PRN must look like PES1UG21CS999 or PES1201912345" },
        { status: 400 }
      );
    }

    const username = srn.toLowerCase();
    const session = await getActiveBootstrapSession();
    // Same guard, same status and same message as the group route: this endpoint
    // is for registering INTO a live session, and without one there is nothing to
    // register into. Pre-registration lives at /api/bootstrap/register/pool.
    if (!session) {
      return NextResponse.json({ error: "Registration is not open yet" }, { status: 404 });
    }

    if (!stallId) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // a stall id from a stale form (or a forged one) must belong to THIS session
    const stalls = await getBootstrapStalls(session.id);
    if (!stalls.some((s) => s.id === stallId)) {
      return NextResponse.json({ error: "Unknown stall" }, { status: 400 });
    }

    // one account per SRN per session - re-registering is rejected, the admin
    // dashboard shows the existing login code if someone loses theirs
    const existing = await getVolunteerByUsername(session.id, username);
    if (existing) {
      return NextResponse.json(
        { error: "This SRN is already registered. Ask an admin for your login code." },
        { status: 409 }
      );
    }

    const result = await registerVolunteer(session.id, name, phone, srn, stallId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/bootstrap/register/stall]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
