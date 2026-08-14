import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  getAdminAccountById,
  getAdminPasswordHashById,
  updateOwnAccountDetails,
  updateOwnPassword,
} from "@/lib/services/admin";
import { normalisePhone } from "@/lib/utils/phone";

/**
 * Self-service profile update (S67). PATCH only.
 *
 * Deliberately has NO isViewer guard, unlike every other mutating admin route.
 * The viewer guard exists to stop the read-only tier writing to shared site
 * data; this route can only ever write to the caller's own admin_accounts row,
 * scoped by session.user.accountId, which is never taken from the body. A
 * viewer who cannot change their own password would have no way to rotate a
 * credential the godfather issued them.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = session.user.accountId;

  // The env godfather has no admin_accounts row -- its id is the literal
  // "godfather" (auth.ts). Nothing to update, so say why rather than 404ing.
  if (!accountId || accountId === "godfather") {
    return NextResponse.json(
      {
        error:
          "This account is configured through environment variables and cannot be edited here.",
      },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    // ── password change ──
    if (body.currentPassword || body.newPassword) {
      const currentPassword = String(body.currentPassword ?? "");
      const newPassword = String(body.newPassword ?? "");

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: "Both the current and the new password are required" },
          { status: 400 }
        );
      }
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }

      const hash = await getAdminPasswordHashById(accountId);
      if (!hash) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      // Same catch-to-false as auth.ts: a malformed stored hash makes
      // bcrypt.compare throw, and that is a failed check, not a 500.
      const valid = await bcrypt.compare(currentPassword, hash).catch(() => false);
      if (!valid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        );
      }

      // Bumps token_version, which signs this account out everywhere including
      // here. The form warns about it; the flag lets the client act on it.
      await updateOwnPassword(accountId, newPassword);
      return NextResponse.json({ success: true, signedOut: true });
    }

    // ── account details ──
    if (body.displayName !== undefined || body.mobileNumber !== undefined) {
      const account = await getAdminAccountById(accountId);
      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const displayName = String(body.displayName ?? account.display_name).trim();
      if (!displayName) {
        return NextResponse.json({ error: "Display name is required" }, { status: 400 });
      }

      // Empty string clears the column. mobile_number is nullable and the form
      // must be able to blank it, so this is a plain write, not a COALESCE.
      const rawMobile =
        body.mobileNumber === undefined
          ? account.mobile_number
          : String(body.mobileNumber).trim();
      // Only a value the client actually sent is validated -- an untouched
      // legacy row must not block a display-name-only save.
      let mobile = rawMobile ? rawMobile : null;
      if (body.mobileNumber !== undefined && mobile !== null) {
        mobile = normalisePhone(mobile);
        if (mobile === null) {
          return NextResponse.json(
            { error: "Mobile must be 10 digits, no country code" },
            { status: 400 }
          );
        }
      }

      await updateOwnAccountDetails(accountId, displayName, mobile);
      return NextResponse.json({ success: true, displayName, mobileNumber: mobile });
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/admin/accounts/me]", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
