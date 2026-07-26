import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import {
  getInviteToken,
  getOpenInviteToken,
  submitOpenRegistration,
  submitRegistration,
} from "@/lib/services/admin";

// PUBLIC route (exempted in middleware) - the invite token is the gate.
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

    // Open links (S48) have no invitee slug -- the registrant's own display
    // name stands in for the name that a named invite bakes into the URL.
    const isOpen = body?.open === true;

    if (!token || (!isOpen && !nameSlug) || !username || !displayName || !email || !mobile || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const invalid = NextResponse.json(
      { error: "Invite link is invalid, expired, or already used" },
      { status: 400 }
    );

    if (isOpen) {
      const open = await getOpenInviteToken(token);
      if (!open) return invalid;

      const passwordHash = await bcrypt.hash(password, 10);
      // Writes a fresh named row; the open token itself stays reusable.
      const ok = await submitOpenRegistration(token, {
        name: displayName, username, displayName, email, mobile, passwordHash,
      });
      if (!ok) return invalid;
    } else {
      const invite = await getInviteToken(token, nameSlug);
      if (!invite) return invalid;

      const passwordHash = await bcrypt.hash(password, 10);
      const ok = await submitRegistration(token, {
        username, displayName, email, mobile, passwordHash,
      });
      if (!ok) return invalid;
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
