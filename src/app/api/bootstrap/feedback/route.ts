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
    // S36 multi-question form: overall_rating (1-10) is required; the rest optional.
    const overallRating = Number(body?.overall_rating);
    const stallId = body?.stall_id ? String(body.stall_id) : null;
    const stallRating = body?.stall_rating ? Number(body.stall_rating) : null;
    const joinLikelihood = body?.join_likelihood ? Number(body.join_likelihood) : null;
    const memorableStall = body?.memorable_stall
      ? String(body.memorable_stall).slice(0, 200).trim()
      : null;
    const suggestions = body?.suggestions
      ? String(body.suggestions).slice(0, 1000).trim()
      : null;

    if (!Number.isInteger(overallRating) || overallRating < 1 || overallRating > 10) {
      return NextResponse.json({ error: "Overall rating must be 1-10" }, { status: 400 });
    }
    if (stallRating !== null && (!Number.isInteger(stallRating) || stallRating < 1 || stallRating > 5)) {
      return NextResponse.json({ error: "Stall rating must be 1-5" }, { status: 400 });
    }
    if (
      joinLikelihood !== null &&
      (!Number.isInteger(joinLikelihood) || joinLikelihood < 1 || joinLikelihood > 5)
    ) {
      return NextResponse.json({ error: "Join likelihood must be 1-5" }, { status: 400 });
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

    await submitBootstrapFeedback(session.id, {
      overallRating,
      stallId,
      // a per-stall rating only makes sense when a stall was named
      stallRating: stallId ? stallRating : null,
      joinLikelihood,
      memorableStall,
      suggestions: suggestions || null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/bootstrap/feedback]", error);
    return NextResponse.json({ error: "Feedback failed" }, { status: 500 });
  }
}
