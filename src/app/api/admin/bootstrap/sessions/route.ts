import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  autoAssignPoolMembers,
  createBootstrapGroups,
  createBootstrapSession,
  createBootstrapStalls,
} from "@/lib/services/bootstrap";

// S35: no volunteer accounts are created here anymore - both stall and group
// volunteers self-register at /bootstrap/register/{stall,group} once the
// session is active. The response is just { session }.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const stalls = body?.stalls as {
      stall_name: string;
      max_occupancy: number;
      lead_names?: string[];
    }[];
    // visitor groups are created up front; group volunteers are spread over
    // them FCFS as they register (groups are lettered A-Z, so cap at 26)
    const groupCount = body?.group_count === undefined ? 4 : Number(body.group_count);
    const maxGroupSize = body?.max_group_size === undefined ? 20 : Number(body.max_group_size);

    if (!name || !Array.isArray(stalls) || stalls.length === 0) {
      return NextResponse.json({ error: "Name and at least 1 stall required" }, { status: 400 });
    }
    if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > 26) {
      return NextResponse.json({ error: "Group count must be 1–26" }, { status: 400 });
    }
    if (!Number.isInteger(maxGroupSize) || maxGroupSize < 1 || maxGroupSize > 100) {
      return NextResponse.json({ error: "Max group size must be 1–100" }, { status: 400 });
    }
    if (stalls.some((s) => !s.stall_name?.trim() || ![1, 2, 3].includes(s.max_occupancy))) {
      return NextResponse.json({ error: "Every stall needs a name and occupancy 1–3" }, { status: 400 });
    }
    for (const s of stalls) {
      // lead names are informational only now (shown on stall cards) -
      // they no longer create accounts
      const leads = (s.lead_names ?? []).map((n) => String(n).trim()).filter(Boolean);
      if (leads.length > 3) {
        return NextResponse.json({ error: "Max 3 lead names per stall" }, { status: 400 });
      }
      if (leads.some((n) => n.length > 100)) {
        return NextResponse.json({ error: "Lead names max 100 chars" }, { status: 400 });
      }
    }

    const bootstrapSession = await createBootstrapSession(name, maxGroupSize);
    await createBootstrapStalls(
      bootstrapSession.id,
      stalls.map((s, i) => ({
        stall_name: s.stall_name.trim(),
        max_occupancy: s.max_occupancy,
        stall_number: i + 1,
        lead_names: s.lead_names,
      }))
    );
    await createBootstrapGroups(bootstrapSession.id, groupCount);

    // S49: pool members (migration 021) who typed a stall name matching one of
    // these stalls are pulled in automatically. Best-effort - a failure here must
    // not lose the session that was just created, and unmatched members simply
    // stay in the pool for manual assignment.
    let autoAssigned = 0;
    try {
      autoAssigned = await autoAssignPoolMembers(bootstrapSession.id);
    } catch (error) {
      console.error("[POST /api/admin/bootstrap/sessions] auto-assign failed", error);
    }

    return NextResponse.json({ session: bootstrapSession, autoAssigned });
  } catch (error) {
    console.error("[POST /api/admin/bootstrap/sessions]", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
