import { NextRequest, NextResponse } from "next/server";
import {
  getActiveBootstrapSession,
  getBootstrapStalls,
  getVolunteerByUsername,
  registerStallVolunteer,
} from "@/lib/services/bootstrap";
import { normalisePhone } from "@/lib/utils/phone";

// PUBLIC endpoint (S35) - stall volunteers register themselves before
// Bootstrap day and pick the stall they will manage.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const phone = normalisePhone(String(body?.phone ?? ""));
    const srn = String(body?.srn ?? "").trim();
    const stallId = String(body?.stall_id ?? "");

    if (!name || !srn || !stallId) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json(
        { error: "Phone must be 10 digits (optionally prefixed with +91)" },
        { status: 400 }
      );
    }
    if (name.length > 100 || srn.length > 30) {
      return NextResponse.json({ error: "Field too long" }, { status: 400 });
    }
    // SRN becomes the username - letters/digits only keeps logins typeable
    if (!/^[a-zA-Z0-9]+$/.test(srn)) {
      return NextResponse.json({ error: "SRN must be letters and digits only" }, { status: 400 });
    }

    const session = await getActiveBootstrapSession();
    if (!session) {
      return NextResponse.json({ error: "Registration is not open yet" }, { status: 404 });
    }

    // a stall id from a stale form (or a forged one) must belong to THIS session
    const stalls = await getBootstrapStalls(session.id);
    if (!stalls.some((s) => s.id === stallId)) {
      return NextResponse.json({ error: "Unknown stall" }, { status: 400 });
    }

    // one account per SRN per session - re-registering is rejected, the admin
    // dashboard shows the existing login code if someone loses theirs
    const existing = await getVolunteerByUsername(session.id, srn.toLowerCase());
    if (existing) {
      return NextResponse.json(
        { error: "This SRN is already registered. Ask an admin for your login code." },
        { status: 409 }
      );
    }

    const result = await registerStallVolunteer(session.id, name, phone, srn, stallId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/bootstrap/register/stall]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
