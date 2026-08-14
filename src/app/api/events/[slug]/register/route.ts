import { NextRequest, NextResponse } from "next/server";

import {
  createEventRegistration,
  findEventRegistrationByEmail,
  getEventBySlug,
} from "@/lib/services/events";
import { isNoRegistrationEvent, isValidEmail } from "@/lib/utils";
import { normalisePhone } from "@/lib/utils/phone";
import { normaliseSrnPrn } from "@/lib/utils/srn";

/** Public: no auth. Native event registration (S47) -- replaces the external
 *  registration_form_url link that the event page used to point at. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Same guard as the public page: these events never take registrations.
    if (isNoRegistrationEvent(slug)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const phone_raw = String(body?.phone ?? "").trim();
    const phone = normalisePhone(phone_raw);
    const srn_raw = String(body?.srn ?? "").trim();
    // optional field: absent stays absent, present must be a real SRN or PRN
    const srn = srn_raw ? normaliseSrnPrn(srn_raw) : null;
    const message = String(body?.message ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json(
        { error: "Phone must be 10 digits, no country code" },
        { status: 400 }
      );
    }
    if (srn_raw && !srn) {
      return NextResponse.json(
        { error: "SRN / PRN must look like PES1UG21CS999 or PES1201912345" },
        { status: 400 }
      );
    }

    const event = await getEventBySlug(slug);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (!event.registration_open) {
      return NextResponse.json(
        { error: "Registration is closed for this event" },
        { status: 409 }
      );
    }

    const existing = await findEventRegistrationByEmail(event.id, email);
    if (existing) {
      return NextResponse.json(
        { error: "This email is already registered for this event" },
        { status: 409 }
      );
    }

    await createEventRegistration(event.id, {
      name,
      email,
      phone,
      srn: srn || undefined,
      message: message || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/events/[slug]/register]", error);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}
