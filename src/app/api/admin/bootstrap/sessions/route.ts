import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createBootstrapSession,
  createBootstrapStalls,
  createBootstrapVolunteers,
} from "@/lib/services/bootstrap";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const stalls = body?.stalls as { stall_name: string; max_occupancy: number }[];
    const volunteerCount = Number(body?.volunteer_count);

    if (!name || !Array.isArray(stalls) || stalls.length === 0) {
      return NextResponse.json({ error: "Name and at least 1 stall required" }, { status: 400 });
    }
    if (!Number.isInteger(volunteerCount) || volunteerCount < 1 || volunteerCount > 100) {
      return NextResponse.json({ error: "Volunteer count must be 1–100" }, { status: 400 });
    }
    if (stalls.some((s) => !s.stall_name?.trim() || ![1, 2, 3].includes(s.max_occupancy))) {
      return NextResponse.json({ error: "Every stall needs a name and occupancy 1–3" }, { status: 400 });
    }

    const bootstrapSession = await createBootstrapSession(name);
    await createBootstrapStalls(
      bootstrapSession.id,
      stalls.map((s, i) => ({
        stall_name: s.stall_name.trim(),
        max_occupancy: s.max_occupancy,
        stall_number: i + 1,
      }))
    );
    const credentials = await createBootstrapVolunteers(bootstrapSession.id, volunteerCount);

    return NextResponse.json({ session: bootstrapSession, credentials });
  } catch (error) {
    console.error("[POST /api/admin/bootstrap/sessions]", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
