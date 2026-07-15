import { NextRequest, NextResponse } from "next/server";

import { usePasswordResetToken } from "@/lib/services/admin";

// PUBLIC route (exempted in middleware) - the one-time reset token is the gate.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? "").trim();
    const password = String(body?.password ?? "");
    const confirmPassword = String(body?.confirmPassword ?? "");

    if (!token || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await usePasswordResetToken(token, password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid or expired token") {
      return NextResponse.json(
        { error: "Reset link is invalid, expired, or already used" },
        { status: 400 }
      );
    }
    console.error("[POST /api/admin/credentials/reset]", error);
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}
