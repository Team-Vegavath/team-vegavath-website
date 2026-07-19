import { NextRequest, NextResponse } from "next/server";
import {
  getActiveBootstrapSession,
  getBootstrapStalls,
  submitBootstrapFeedback,
} from "@/lib/services/bootstrap";

// PUBLIC endpoint - visitor feedback, no account involved.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rating = Number(body?.rating);
    const stallId = body?.stall_id ? String(body.stall_id) : null;
    const comment = body?.comment ? String(body.comment).slice(0, 2000).trim() : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const session = await getActiveBootstrapSession();
    if (!session) {
      return NextResponse.json({ error: "No active Bootstrap session" }, { status: 404 });
    }

    // a stall id from a stale form (or a forged one) must belong to THIS session
    if (stallId) {
      const stalls = await getBootstrapStalls(session.id);
      if (!stalls.some((s) => s.id === stallId)) {
        return NextResponse.json({ error: "Unknown stall" }, { status: 400 });
      }
    }

    await submitBootstrapFeedback(session.id, rating, stallId, comment || null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/bootstrap/feedback]", error);
    return NextResponse.json({ error: "Feedback failed" }, { status: 500 });
  }
}
