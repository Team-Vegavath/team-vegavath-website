import bcrypt from "bcryptjs";

import { sql } from "@/lib/db";

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export type AdminLoginEntry = {
  id: string;
  attempted_at: string;
  success: boolean;
  ip_address: string | null;
  device_hint: string | null;
};

export async function logAdminLogin(params: {
  success: boolean;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const deviceHint = params.userAgent
    ? /mobile|android|iphone|ipad/i.test(params.userAgent)
      ? "Mobile"
      : "Desktop"
    : "Unknown";

  await sql`
    INSERT INTO admin_login_log (success, ip_address, user_agent, device_hint)
    VALUES (
      ${params.success},
      ${params.ip ?? null},
      ${params.userAgent ?? null},
      ${deviceHint}
    )
  `;
}

export async function getRecentLogins(limit = 10): Promise<AdminLoginEntry[]> {
  const rows = await sql`
    SELECT id, attempted_at, success, ip_address, device_hint
    FROM admin_login_log
    ORDER BY attempted_at DESC
    LIMIT ${limit}
  `;
  return rows as AdminLoginEntry[];
}

export async function countRecentFailedLogins(ip: string): Promise<number> {
  const rows = await sql`
    SELECT count(*)::int AS n
    FROM admin_login_log
    WHERE ip_address = ${ip}
      AND success = false
      AND attempted_at > now() - INTERVAL '15 minutes'
  `;
  return (rows[0] as { n: number }).n;
}

// ------------------------------------------------------- admin accounts (S27)

export type AdminAccount = {
  id: string;
  username: string;
  display_name: string;
  mobile_number: string | null;
  role: "admin" | "godfather";
  created_at: string;
};

export type AdminAccountAuthRow = {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: string;
};

export async function getAdminAccountForAuth(
  username: string
): Promise<AdminAccountAuthRow | null> {
  const rows = await sql`
    SELECT id, username, display_name, password_hash, role
    FROM admin_accounts
    WHERE username = ${username}
    LIMIT 1`;
  return (rows[0] as AdminAccountAuthRow | undefined) ?? null;
}

export async function getAdminTokenVersionById(
  id: string
): Promise<number | null> {
  const rows = await sql`
    SELECT token_version
    FROM admin_accounts
    WHERE id = ${id}
    LIMIT 1`;
  return (rows[0] as { token_version: number } | undefined)?.token_version ?? null;
}

export async function getAdminAccounts(): Promise<AdminAccount[]> {
  const rows = await sql`
    SELECT id, username, display_name, mobile_number, role, created_at
    FROM admin_accounts ORDER BY created_at ASC LIMIT 50`;
  return rows as AdminAccount[];
}

export async function createAdminAccount(
  username: string,
  displayName: string,
  passwordHash: string,
  mobile: string | null = null,
  role = "admin"
) {
  return sql`
    INSERT INTO admin_accounts (username, display_name, password_hash, mobile_number, role)
    VALUES (${username.toLowerCase()}, ${displayName}, ${passwordHash}, ${mobile}, ${role})
    RETURNING id`;
}

export async function getAdminAccountById(id: string): Promise<AdminAccount | null> {
  const rows = await sql`
    SELECT id, username, display_name, mobile_number, role, created_at
    FROM admin_accounts WHERE id = ${id}`;
  return (rows[0] as AdminAccount | undefined) ?? null;
}

export async function deleteAdminAccount(id: string): Promise<void> {
  await sql`DELETE FROM admin_accounts WHERE id = ${id}`;
}

export async function countAdminAccounts(): Promise<number> {
  const rows = await sql`SELECT count(*)::int AS n FROM admin_accounts`;
  return (rows[0] as { n: number }).n;
}

// -------------------------------------------------------- invite tokens (S27)

export type PendingRequest = {
  id: string;
  pending_username: string;
  pending_display_name: string;
  pending_email: string | null;
  pending_mobile: string | null;
  created_at: string;
};

export async function createInviteToken(
  inviteeName: string
): Promise<{ token: string; slug: string }> {
  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("hex");
  const slug = toSlug(inviteeName);
  await sql`
    INSERT INTO admin_invite_tokens (token, invitee_name, invitee_slug)
    VALUES (${token}, ${inviteeName}, ${slug})`;
  return { token, slug };
}

/** A token is only usable while still 'generated', unexpired, and matching
 *  the invitee slug baked into the URL. */
export async function getInviteToken(token: string, slug: string) {
  const rows = await sql`
    SELECT id, token, status, expires_at, invitee_name, invitee_slug
    FROM admin_invite_tokens
    WHERE token = ${token}
      AND invitee_slug = ${slug}
      AND status = 'generated'
      AND expires_at > now()`;
  return rows[0] ?? null;
}

// ---------------------------------------------------- password resets (S29)

/** Godfather-initiated. Replaces any outstanding reset token for the account. */
export async function createPasswordResetToken(accountId: string): Promise<string> {
  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("hex");
  await sql`DELETE FROM admin_password_reset_tokens WHERE account_id = ${accountId}`;
  await sql`
    INSERT INTO admin_password_reset_tokens (account_id, token)
    VALUES (${accountId}, ${token})`;
  return token;
}

export async function getPasswordResetToken(token: string) {
  const rows = await sql`
    SELECT r.*, a.username, a.display_name
    FROM admin_password_reset_tokens r
    JOIN admin_accounts a ON a.id = r.account_id
    WHERE r.token = ${token}
      AND r.used_at IS NULL
      AND r.expires_at > now()`;
  return rows[0] ?? null;
}

/** Sets the new password and bumps token_version, killing all live JWTs. */
export async function consumePasswordResetToken(
  token: string,
  newPassword: string
): Promise<void> {
  const row = await getPasswordResetToken(token);
  if (!row) throw new Error("Invalid or expired token");
  const hash = await bcrypt.hash(newPassword, 10);
  await sql`
    UPDATE admin_accounts
    SET password_hash = ${hash},
        token_version = token_version + 1
    WHERE id = ${(row as { account_id: string }).account_id}`;
  await sql`UPDATE admin_password_reset_tokens SET used_at = now() WHERE token = ${token}`;
}

/** Stores the registration on the token row; approval creates the account. */
export async function submitRegistration(
  token: string,
  fields: {
    username: string;
    displayName: string;
    email: string;
    mobile: string;
    passwordHash: string;
  }
): Promise<boolean> {
  const rows = await sql`
    UPDATE admin_invite_tokens
    SET status = 'pending_approval',
        pending_username = ${fields.username.toLowerCase()},
        pending_display_name = ${fields.displayName},
        pending_email = ${fields.email},
        pending_mobile = ${fields.mobile},
        pending_password_hash = ${fields.passwordHash}
    WHERE token = ${token} AND status = 'generated' AND expires_at > now()
    RETURNING id`;
  return rows.length > 0;
}

export async function getPendingRequests(): Promise<PendingRequest[]> {
  const rows = await sql`
    SELECT id, pending_username, pending_display_name, pending_email,
           pending_mobile, created_at
    FROM admin_invite_tokens
    WHERE status = 'pending_approval'
    ORDER BY created_at ASC LIMIT 50`;
  return rows as PendingRequest[];
}

export async function getInviteById(id: string) {
  const rows = await sql`SELECT * FROM admin_invite_tokens WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function setInviteStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<void> {
  await sql`UPDATE admin_invite_tokens SET status = ${status} WHERE id = ${id}`;
}
