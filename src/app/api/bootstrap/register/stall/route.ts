import { NextRequest, NextResponse } from "next/server";
import {
  getActiveBootstrapSession,
  getBootstrapStalls,
  getPoolVolunteerBySrn,
  getVolunteerByUsername,
  registerStallVolunteer,
} from "@/lib/services/bootstrap";
import { normalisePhone } from "@/lib/utils/phone";
import { normaliseSrnPrn } from "@/lib/utils/srn";

// PUBLIC endpoint (S35) - stall volunteers register themselves before
// Bootstrap day and pick the stall they will manage.
// S49: with no active session the registration still goes through, into the
// pre-registration pool (session_id NULL, migration 021). There are no stalls to
// pick from yet, so the form sends a free-text preferred_stall_name instead.
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
    const preferredStallName = String(body?.preferred_stall_name ?? "").trim();

    if (!name || !srn_raw) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json(
        { error: "Phone must be 10 digits, no country code" },
        { status: 400 }
      );
    }
    if (name.length > 100 || preferredStallName.length > 60) {
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

    // ---- pre-registration pool: no session exists yet -----------------------
    if (!session) {
      const existingPool = await getPoolVolunteerBySrn(username);
      if (existingPool) {
        return NextResponse.json(
          { error: "This SRN is already pre-registered. Ask an admin for your login code." },
          { status: 409 }
        );
      }
      const pooled = await registerStallVolunteer(
        null,
        name,
        phone,
        srn,
        null,
        preferredStallName || null
      );
      return NextResponse.json({ ...pooled, pooled: true });
    }

    // ---- normal path: an active session with real stalls --------------------
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

    const result = await registerStallVolunteer(session.id, name, phone, srn, stallId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/bootstrap/register/stall]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
