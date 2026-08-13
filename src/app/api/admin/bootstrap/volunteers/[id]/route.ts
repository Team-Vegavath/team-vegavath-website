import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deletePoolVolunteer,
  getPoolVolunteerBySrn,
  updateVolunteer,
} from "@/lib/services/bootstrap";
import { normalisePhone } from "@/lib/utils/phone";
import { normaliseSrnPrn } from "@/lib/utils/srn";

// S55: admin corrects a volunteer's own registration details -- name, phone,
// SRN. Password (login_code / password_hash) is not touched here; resetting a
// login is a separate path.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    // Empty strings are dropped, not forwarded. The service uses COALESCE, so a
    // blank field means "leave alone" -- it cannot clear a column, and letting
    // "" through would blank a name or an SRN instead.
    const str = (v: unknown) => {
      const s = typeof v === "string" ? v.trim() : "";
      return s.length > 0 ? s : undefined;
    };
    const display_name = str(body?.display_name);
    const phone_raw = str(body?.phone);
    const srn_raw = str(body?.srn);

    if (!display_name && !phone_raw && !srn_raw) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // An admin correcting a typo goes through the same validation as the
    // volunteer's own registration -- otherwise this route is a hole straight
    // past it. undefined (field absent) still means "leave alone".
    const phone = phone_raw === undefined ? undefined : normalisePhone(phone_raw);
    const srn = srn_raw === undefined ? undefined : normaliseSrnPrn(srn_raw);

    if (phone === null) {
      return NextResponse.json(
        { error: "Phone must be 10 digits (optionally prefixed with +91)" },
        { status: 400 }
      );
    }
    if (srn === null) {
      return NextResponse.json(
        { error: "SRN / PRN must look like PES2UG24CS019 or PES2202400960" },
        { status: 400 }
      );
    }

    // One pool account per SRN (see getPoolVolunteerBySrn -- Postgres treats
    // NULL session_ids as distinct, so no unique index covers the pool). A typo
    // fix must not create the duplicate the registration route prevents.
    // Assigned volunteers are covered by UNIQUE(session_id, username) instead.
    if (srn) {
      const clash = await getPoolVolunteerBySrn(srn.toLowerCase());
      if (clash && clash.id !== id) {
        return NextResponse.json(
          { error: "Another pre-registered volunteer already uses that SRN" },
          { status: 409 }
        );
      }
    }

    await updateVolunteer(id, { display_name, phone, srn });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/volunteers/[id]]", error);
    return NextResponse.json({ error: "Failed to update volunteer" }, { status: 500 });
  }
}

// S55B: remove a pre-registration entry. Pool rows only -- the service's
// session_id IS NULL guard is what enforces that, so an assigned volunteer's id
// falls through to the 409 below rather than deleting anything.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const deleted = await deletePoolVolunteer(id);
    if (!deleted) {
      return NextResponse.json(
        {
          error:
            "Not found, or already assigned to a session. Delete the session instead.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/bootstrap/volunteers/[id]]", error);
    return NextResponse.json({ error: "Failed to delete volunteer" }, { status: 500 });
  }
}
