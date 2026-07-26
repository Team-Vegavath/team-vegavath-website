import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  updateEventRegistrationStatus,
  type EventRegistrationStatus,
} from "@/lib/services/events";

const STATUSES: EventRegistrationStatus[] = [
  "pending",
  "confirmed",
  "rejected",
  "waitlisted",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; regId: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const { regId } = await params;
    const body = await req.json().catch(() => null);
    const status = body?.status as EventRegistrationStatus | undefined;

    if (!status || !STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    await updateEventRegistrationStatus(regId, status);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/admin/events/[id]/registrations/[regId]]", error);
    return NextResponse.json(
      { error: "Failed to update registration status" },
      { status: 500 }
    );
  }
}
