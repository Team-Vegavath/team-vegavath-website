import { NextRequest, NextResponse } from "next/server";
import {
  assignGroupNumbers,
  getActiveBootstrapSession,
  getVolunteerByUsername,
  registerGroupVolunteer,
} from "@/lib/services/bootstrap";
import { normalisePhone } from "@/lib/utils/phone";
import { normaliseSrnPrn } from "@/lib/utils/srn";

// PUBLIC endpoint (S35) - group volunteers register themselves before
// Bootstrap day; group numbers are assigned FCFS when the session activates.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const phone = normalisePhone(String(body?.phone ?? ""));
    const srn_raw = String(body?.srn ?? "").trim();
    // S73F: the real SRN/PRN structure replaces the old alphanumeric-only rule.
    // Both formats are alphanumeric, so the username stays typeable either way.
    const srn = normaliseSrnPrn(srn_raw);

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
        { error: "SRN / PRN must look like PES2UG24CS019 or PES2202400960" },
        { status: 400 }
      );
    }

    const session = await getActiveBootstrapSession();
    if (!session) {
      return NextResponse.json({ error: "Registration is not open yet" }, { status: 404 });
    }

    const existing = await getVolunteerByUsername(session.id, srn.toLowerCase());
    if (existing) {
      return NextResponse.json(
        { error: "This SRN is already registered. Ask an admin for your login code." },
        { status: 409 }
      );
    }

    const result = await registerGroupVolunteer(session.id, name, phone, srn);
    // registration only opens once the session is active, which is also when
    // group numbers are handed out - so number each lead as they arrive
    // (assignGroupNumbers is idempotent and continues the FCFS round-robin)
    await assignGroupNumbers(session.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/bootstrap/register/group]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
