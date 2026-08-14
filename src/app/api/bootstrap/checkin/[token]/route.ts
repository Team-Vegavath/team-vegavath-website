import { NextRequest, NextResponse } from "next/server";
import { checkinVisitorToGroup, getCheckinContext } from "@/lib/services/bootstrap";
import { normalisePhone } from "@/lib/utils/phone";
import { normaliseSrnPrn } from "@/lib/utils/srn";

// PUBLIC endpoint - visitors check in via a group lead's QR link, no account
// involved. Middleware never auth-gates /api/bootstrap/*, only /api/admin/*.
// The token in the URL is the gate: it resolves to exactly one lead's group
// in the active session (S33, migration 015).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const prn_raw = String(body?.prn ?? "").trim();
    const phone_raw = String(body?.phone ?? "").trim();
    // the field is labelled "PRN / SRN" and has no toggle, so accept either
    const prn = normaliseSrnPrn(prn_raw);
    const phone = normalisePhone(phone_raw);

    if (!name || !prn_raw || !phone_raw) {
      return NextResponse.json({ error: "Name, PRN and phone are all required" }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: "Field too long" }, { status: 400 });
    }
    if (!prn) {
      return NextResponse.json(
        { error: "PRN / SRN must look like PES2202400960 or PES2UG24CS019" },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { error: "Phone must be 10 digits (optionally prefixed with +91)" },
        { status: 400 }
      );
    }

    const ctx = await getCheckinContext(token);
    if (!ctx) {
      return NextResponse.json(
        { error: "Invalid check-in link or no active Bootstrap session" },
        { status: 404 }
      );
    }
    if (!ctx.group_id) {
      return NextResponse.json(
        { error: "This link has no group assigned yet - ask an organiser" },
        { status: 400 }
      );
    }

    const visitorId = await checkinVisitorToGroup(
      ctx.session_id,
      ctx.group_id,
      ctx.max_group_size,
      name,
      prn,
      phone
    );
    if (!visitorId) {
      return NextResponse.json(
        { error: "This group is full! Ask a different group lead to scan you in." },
        { status: 409 }
      );
    }
    return NextResponse.json({
      groupName: ctx.group_name,
      sessionName: ctx.session_name,
      // S72C (Section E): the NUMBER is what visitors are shown. group_name stays
      // "Group A" and remains the internal join key in getCheckinContext.
      groupNumber: ctx.group_number,
      // S72C (Section J): name and contact the lead the visitor is standing next
      // to. `v` (resolved by checkin_token), not g.team_lead_id - the person
      // holding the QR is the one who should be named. Either may be null.
      leadName: ctx.lead_name,
      leadPhone: ctx.lead_phone,
      // S73D (J1): the visitor's own row id, which is the bearer token for their
      // checklist page at /bootstrap/checklist/[id]. It is a UUID PK that already
      // existed, so the revisitable checklist needed no new schema. Returned only
      // to the person who just checked in, in the response to their own POST.
      visitorId,
    });
  } catch (error) {
    console.error("[POST /api/bootstrap/checkin/[token]]", error);
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  }
}
