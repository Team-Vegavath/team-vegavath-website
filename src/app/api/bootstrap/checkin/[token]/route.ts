import { NextRequest, NextResponse } from "next/server";
import { checkinVisitorToGroup, getCheckinContext } from "@/lib/services/bootstrap";

// PUBLIC endpoint - visitors check in via a group lead's QR link, no account
// involved. Middleware never auth-gates /api/bootstrap/*, only /api/admin/*.
// The token in the URL is the gate: it resolves to exactly one lead's group
// in the active session (S33, migration 015).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const prn = String(body?.prn ?? "").trim();
    const phone = String(body?.phone ?? "").trim();

    if (!name || !prn || !phone) {
      return NextResponse.json({ error: "Name, PRN and phone are all required" }, { status: 400 });
    }
    if (name.length > 100 || prn.length > 30 || phone.length > 20) {
      return NextResponse.json({ error: "Field too long" }, { status: 400 });
    }

    const ctx = await getCheckinContext(token);
    if (!ctx) {
      return NextResponse.json(
        { error: "Invalid check-in link or no active Bootstrap session" },
        { status: 404 }
      );
    }
    if (!ctx.group_id) {
      return NextResponse.json(
        { error: "This link has no group assigned yet - ask an organiser" },
        { status: 400 }
      );
    }

    const ok = await checkinVisitorToGroup(
      ctx.session_id,
      ctx.group_id,
      ctx.max_group_size,
      name,
      prn,
      phone
    );
    if (!ok) {
      return NextResponse.json(
        { error: "This group is full! Ask a different group lead to scan you in." },
        { status: 409 }
      );
    }
    return NextResponse.json({ groupName: ctx.group_name, sessionName: ctx.session_name });
  } catch (error) {
    console.error("[POST /api/bootstrap/checkin/[token]]", error);
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  }
}
