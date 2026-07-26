import { NextResponse, type NextRequest } from "next/server";

// S52B: shared-password gate for /docs. The cookie value IS the password --
// no session table, no JWT. The goal is keeping the internal architecture docs
// off the open internet, not authenticating a person. Rotating DOCS_PASSWORD
// invalidates every existing cookie, which is the intended revocation
// mechanism. Threat model: docs/superpowers/plans/2026-07-26-docs-password-gate.md
export async function POST(req: NextRequest) {
  const correct = process.env.DOCS_PASSWORD;

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
  }

  // Unset DOCS_PASSWORD means no submission can be correct. The middleware
  // fails OPEN on the same condition on purpose - it is asking a different
  // question ("should I guard this route") than this route is ("is this the
  // right password"). Returning 200 here with no password set would hand a
  // valid cookie to anyone.
  if (!correct || typeof password !== "string" || password !== correct) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("docs_session", correct, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
