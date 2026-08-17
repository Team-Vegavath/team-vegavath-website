import { NextRequest, NextResponse } from "next/server";
import { getPoolVolunteerBySrn, registerVolunteer } from "@/lib/services/bootstrap";
import { normalisePhone } from "@/lib/utils/phone";
import { normaliseSrnPrn } from "@/lib/utils/srn";

// PUBLIC endpoint (S74B) - the pre-registration pool's own door.
//
// This is the pool branch that used to live inside the stall route, moved out
// verbatim apart from the role. The stall route accepted a pre-session submission
// as a side effect of there being no session, which meant the pool's entire
// entry condition was "the other thing was closed" and everyone who came through
// was recorded as a stall volunteer. Here the registrant says which they mean.
//
// No session lookup at all: unlike /stall and /group this endpoint is always open,
// and a pool row is by definition one with session_id NULL. Registering while a
// session happens to be running is legitimate -- it means "put me in the next one".
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const phone = normalisePhone(String(body?.phone ?? ""));
    const srn_raw = String(body?.srn ?? "").trim();
    // S73F: the real SRN/PRN structure replaces the old alphanumeric-only rule.
    // Both formats are alphanumeric, so the username stays typeable either way.
    const srn = normaliseSrnPrn(srn_raw);
    const preferredStallName = String(body?.preferred_stall_name ?? "").trim();
    // Anything other than an explicit 'lead' is a stall volunteer: that was the
    // only outcome before this route existed, so an absent or junk role degrades
    // to the historical behaviour rather than to an error.
    const role = body?.role === "lead" ? "lead" : "stall";

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

    // UNIQUE(session_id, username) does not constrain pool rows -- Postgres treats
    // NULLs as distinct (migration 021) -- so the one-account-per-SRN rule for the
    // pool has to be checked here.
    const existingPool = await getPoolVolunteerBySrn(username);
    if (existingPool) {
      return NextResponse.json(
        { error: "This SRN is already pre-registered. Ask an admin for your login code." },
        { status: 409 }
      );
    }

    // A lead has no stall to prefer; storing one would be dead data that the
    // session-creation sweep could then match on.
    const pooled = await registerVolunteer(
      null,
      name,
      phone,
      srn,
      null,
      role === "lead" ? null : preferredStallName || null,
      role
    );
    return NextResponse.json({ ...pooled, pooled: true });
  } catch (error) {
    console.error("[POST /api/bootstrap/register/pool]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
