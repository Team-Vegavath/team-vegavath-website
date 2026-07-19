import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  copyStallLeadVolunteers,
  createBootstrapGroups,
  createBootstrapSession,
  createBootstrapStalls,
  createGroupLeadVolunteers,
  createStallLeadVolunteers,
  type StallLeadCredential,
} from "@/lib/services/bootstrap";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const stalls = body?.stalls as {
      stall_name: string;
      max_occupancy: number;
      lead_names?: string[];
    }[];
    // S33: volunteer_count now means GROUP LEAD accounts (lead-1, lead-2, ...);
    // stall-lead accounts come from the per-stall lead_names instead.
    const groupLeadCount = Number(body?.volunteer_count);
    const maxGroupSize = body?.max_group_size === undefined ? 20 : Number(body.max_group_size);
    const copyFrom =
      typeof body?.copy_stall_leads_from === "string" && body.copy_stall_leads_from
        ? body.copy_stall_leads_from
        : null;

    if (!name || !Array.isArray(stalls) || stalls.length === 0) {
      return NextResponse.json({ error: "Name and at least 1 stall required" }, { status: 400 });
    }
    // groups are lettered Group A-Z, one per lead, so the cap is 26 not 100
    if (!Number.isInteger(groupLeadCount) || groupLeadCount < 1 || groupLeadCount > 26) {
      return NextResponse.json({ error: "Group lead count must be 1–26" }, { status: 400 });
    }
    if (!Number.isInteger(maxGroupSize) || maxGroupSize < 1 || maxGroupSize > 100) {
      return NextResponse.json({ error: "Max group size must be 1–100" }, { status: 400 });
    }
    if (stalls.some((s) => !s.stall_name?.trim() || ![1, 2, 3].includes(s.max_occupancy))) {
      return NextResponse.json({ error: "Every stall needs a name and occupancy 1–3" }, { status: 400 });
    }
    for (const s of stalls) {
      const leads = (s.lead_names ?? []).map((n) => String(n).trim()).filter(Boolean);
      if (leads.length > 3) {
        return NextResponse.json({ error: "Max 3 lead names per stall" }, { status: 400 });
      }
      // usernames are generated from latin letters in the name
      if (leads.some((n) => n.length > 100 || !/[a-zA-Z]/.test(n))) {
        return NextResponse.json(
          { error: "Every stall lead name needs at least one letter (max 100 chars)" },
          { status: 400 }
        );
      }
    }

    const bootstrapSession = await createBootstrapSession(name, maxGroupSize);
    const createdStalls = await createBootstrapStalls(
      bootstrapSession.id,
      stalls.map((s, i) => ({
        stall_name: s.stall_name.trim(),
        max_occupancy: s.max_occupancy,
        stall_number: i + 1,
        // carry-forward copies the source session's leads - ignore form names
        lead_names: copyFrom ? [] : s.lead_names,
      }))
    );

    let stallLeadCredentials: StallLeadCredential[] = [];
    let copiedStallLeads = 0;
    if (copyFrom) {
      // identical usernames + password hashes - the Day 1 CSV stays valid
      copiedStallLeads = await copyStallLeadVolunteers(copyFrom, bootstrapSession.id);
    } else {
      stallLeadCredentials = await createStallLeadVolunteers(
        bootstrapSession.id,
        createdStalls.filter((s) => s.lead_names.length > 0)
      );
    }

    const { credentials: groupLeadCredentials, ids: leadIds } = await createGroupLeadVolunteers(
      bootstrapSession.id,
      groupLeadCount
    );
    // one group per lead, pre-assigned: Group A -> lead-1, Group B -> lead-2, ...
    await createBootstrapGroups(bootstrapSession.id, groupLeadCount, leadIds);

    return NextResponse.json({
      session: bootstrapSession,
      stallLeadCredentials,
      groupLeadCredentials,
      copiedStallLeads,
    });
  } catch (error) {
    console.error("[POST /api/admin/bootstrap/sessions]", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
