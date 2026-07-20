import { NextRequest, NextResponse } from "next/server";
import {
  assignGroupNumbers,
  getActiveBootstrapSession,
  getVolunteerByUsername,
  registerGroupVolunteer,
} from "@/lib/services/bootstrap";
import { normalisePhone } from "@/lib/utils/phone";

// PUBLIC endpoint (S35) - group volunteers register themselves before
// Bootstrap day; group numbers are assigned FCFS when the session activates.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const phone = normalisePhone(String(body?.phone ?? ""));
    const srn = String(body?.srn ?? "").trim();

    if (!name || !srn) {
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
    if (!/^[a-zA-Z0-9]+$/.test(srn)) {
      return NextResponse.json({ error: "SRN must be letters and digits only" }, { status: 400 });
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
