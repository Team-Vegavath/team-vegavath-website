import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getActiveBootstrapSession,
  getVolunteerByUsername,
  verifyVolunteerPassword,
  claimVolunteerSession,
} from "@/lib/services/bootstrap";
import { VOLUNTEER_COOKIE } from "../volunteer-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body?.username ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (!username || !password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const session = await getActiveBootstrapSession();
    if (!session) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    const volunteer = await getVolunteerByUsername(session.id, username);
    if (!volunteer) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyVolunteerPassword(volunteer.id, password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = crypto.randomUUID();
    const claimed = await claimVolunteerSession(volunteer.id, token);
    if (!claimed) {
      return NextResponse.json({ error: "Account in use" }, { status: 409 });
    }

    const cookieStore = await cookies();
    cookieStore.set(VOLUNTEER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // credentials are per-day
    });

    return NextResponse.json({ ok: true, display_name: volunteer.display_name });
  } catch (error) {
    console.error("[POST /api/bootstrap/login]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
