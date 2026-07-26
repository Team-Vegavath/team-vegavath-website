import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBootstrapFeedbackRaw } from "@/lib/services/bootstrap";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // No DB write here, but it spends paid Gemini quota -- gated with the other
  // POSTs rather than treated as a read.
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  const { id } = await params;

  // SQL lives in the service layer per the architecture contract.
  const rows = await getBootstrapFeedbackRaw(id);

  if (!rows.length) {
    return NextResponse.json({ error: "No feedback to summarize" }, { status: 404 });
  }

  // Build a compact text representation for Gemini
  const overallScores = rows
    .map((r) => r.overall_rating)
    .filter((v): v is number => v != null);
  const joinScores = rows
    .map((r) => r.join_likelihood)
    .filter((v): v is number => v != null);

  const avgOverall = overallScores.length
    ? (overallScores.reduce((sum, v) => sum + v, 0) / overallScores.length).toFixed(1)
    : "N/A";
  const avgJoin = joinScores.length
    ? (joinScores.reduce((sum, v) => sum + v, 0) / joinScores.length).toFixed(1)
    : "N/A";

  const feedbackText = rows
    .map((r, i) => {
      const parts: string[] = [];
      if (r.overall_rating) parts.push(`Overall: ${r.overall_rating}/10`);
      if (r.stall_name && r.stall_rating) parts.push(`${r.stall_name} stall: ${r.stall_rating}/5`);
      if (r.memorable_stall) parts.push(`Memorable: ${r.memorable_stall}`);
      if (r.join_likelihood) parts.push(`Likely to join: ${r.join_likelihood}/5`);
      if (r.suggestions) parts.push(`Suggestions: ${r.suggestions}`);
      if (r.comment) parts.push(`Comment: ${r.comment}`);
      return `[${i + 1}] ${parts.join(" | ")}`;
    })
    .join("\n");

  const prompt = `You are summarizing visitor feedback from a student club showcase event called Bootstrap at PESU ECC, run by Team Vegavath. Visitors (mostly freshers) walked through stalls run by club members.

DATA:
- Total responses: ${rows.length}
- Average overall experience: ${avgOverall}/10
- Average likelihood to join the club: ${avgJoin}/5
- Individual responses (overall rating / join likelihood / memorable stall / suggestions):

${feedbackText}

Write a concise leadership summary using exactly these five sections, each introduced by a level-3 markdown heading with the label in capitals:

### OVERALL EXPERIENCE
2-3 sentences on the general mood and the rating spread.

### WHAT WORKED
2-3 sentences on positive patterns across stalls and logistics.

### WHAT NEEDS IMPROVEMENT
2-3 sentences on recurring complaints. Ignore one-off or incoherent feedback.

### RECRUITMENT SIGNAL
1-2 sentences on the join-likelihood score and what it means for next recruitment.

### TOP ACTIONS
A numbered list of 3 specific, actionable items the team can act on before the next Bootstrap.

Use prose inside each section -- no bullet symbols or bold emphasis except the numbered list under TOP ACTIONS. Keep the entire response under 400 words. Ignore feedback that is clearly nonsensical or contains only random characters.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            // 1024 truncated the 5-section summary mid-sentence
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      console.error("[Gemini API error]", err);
      return NextResponse.json(
        { error: "Gemini API error" },
        { status: 502 }
      );
    }

    const data = await geminiRes.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!summary) {
      return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });
    }

    return NextResponse.json({
      summary,
      responseCount: rows.length,
      avgOverall,
      avgJoin,
      // the raw rows travel back with the summary so the admin can see what
      // Gemini normalized away (typos, broken English, junk submissions)
      feedbackRows: rows.map((r) => ({
        overall: r.overall_rating ?? null,
        join: r.join_likelihood ?? null,
        stall: r.memorable_stall ?? r.stall_name ?? null,
        text: r.suggestions ?? r.comment ?? null,
      })),
    });
  } catch (error) {
    console.error("[POST /api/admin/bootstrap/sessions/[id]/summarize]", error);
    return NextResponse.json({ error: "Summary failed" }, { status: 500 });
  }
}
