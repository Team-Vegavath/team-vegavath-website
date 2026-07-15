import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateStallStatus } from "@/lib/services/bootstrap";

const STATUSES = ["free", "occupied", "queued"] as const;

// Admin override - sets status and claimed_by directly, no conflict check.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const status = body?.status as string;
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // claimed_by arrives as a comma-separated string ("" clears the list).
    // Freeing a stall always clears it - admin never has to empty the field.
    const claimedBy =
      status === "free"
        ? ""
        : Array.isArray(body?.claimed_by)
          ? body.claimed_by.join(",")
          : String(body?.claimed_by ?? "");

    // optional queued_by pass-through - the service clears it when status is "free"
    const queuedBy = body?.queued_by ? String(body.queued_by) : undefined;

    const stall = await updateStallStatus(id, claimedBy, "override", status, queuedBy);
    if (!stall) {
      return NextResponse.json({ error: "Stall not found" }, { status: 404 });
    }
    return NextResponse.json(stall);
  } catch (error) {
    console.error("[PATCH /api/admin/bootstrap/stalls/[id]]", error);
    return NextResponse.json({ error: "Failed to update stall" }, { status: 500 });
  }
}
