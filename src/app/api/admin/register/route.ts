import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getInviteToken, submitRegistration } from "@/lib/services/admin";

// PUBLIC route (exempted in middleware) - the one-time invite token is the gate.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? "").trim();
    const nameSlug = String(body?.nameSlug ?? "").trim();
    const username = String(body?.username ?? "").trim().toLowerCase();
    const displayName = String(body?.displayName ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const mobile = String(body?.mobile ?? "").trim();
    const password = String(body?.password ?? "");
    const confirmPassword = String(body?.confirmPassword ?? "");

    if (!token || !nameSlug || !username || !displayName || !email || !mobile || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const invite = await getInviteToken(token, nameSlug);
    if (!invite) {
      return NextResponse.json(
        { error: "Invite link is invalid, expired, or already used" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const ok = await submitRegistration(token, {
      username, displayName, email, mobile, passwordHash,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Invite link is invalid, expired, or already used" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Request submitted. Awaiting admin approval.",
    });
  } catch (error) {
    console.error("[POST /api/admin/register]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
