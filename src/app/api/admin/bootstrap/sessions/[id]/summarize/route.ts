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

  const prompt = `You are analyzing Bootstrap feedback from ${rows.length} students who visited Team Vegavath's club showcase at PESU ECC Electronic City. Bootstrap is a 5-day open event where clubs showcase their projects and vehicles.

Stats: Average overall experience: ${avgOverall}/10, Average likelihood to join Vegavath: ${avgJoin}/5

Raw feedback (${rows.length} responses):
${feedbackText}

Write a concise admin summary (250-350 words) covering:
1. **Overall Experience** — what the numbers say and the general mood
2. **What Worked** — recurring positive themes from the feedback
3. **What Needs Improvement** — recurring pain points or suggestions
4. **Stall Insights** — which stalls got the most love and which had issues
5. **Recruitment Signal** — likelihood-to-join data and what it means
6. **Top 3 Actionable Suggestions** — specific things to act on for next year

Be direct and useful. This is for the club leadership to read after the event.`;

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
            maxOutputTokens: 1024,
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
    });
  } catch (error) {
    console.error("[POST /api/admin/bootstrap/sessions/[id]/summarize]", error);
    return NextResponse.json({ error: "Summary failed" }, { status: 500 });
  }
}
