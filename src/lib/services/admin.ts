import bcrypt from "bcryptjs";

import { sql } from "@/lib/db";

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Hex token from the Web Crypto API (S48). Same entropy as node's
 *  randomBytes(n), but with no "crypto" module import -- Next's static tracer
 *  flags that import on every route it can reach, even ones that never run at
 *  the edge. globalThis.crypto exists in Node 19+ and all edge runtimes. */
function generateSecureToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
  role: "admin" | "godfather" | "viewer";
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
  pending_role: "admin" | "viewer" | null;
  created_at: string;
};

/** pendingRole is the role the account gets on approval (S47): 'admin' or
 *  the read-only 'viewer' tier. Stored on the token so the invitee cannot
 *  choose their own privilege level during registration. */
export async function createInviteToken(
  inviteeName: string,
  pendingRole: "admin" | "viewer" = "admin"
): Promise<{ token: string; slug: string }> {
  const token = generateSecureToken(32);
  const slug = toSlug(inviteeName);
  await sql`
    INSERT INTO admin_invite_tokens (token, invitee_name, invitee_slug, pending_role)
    VALUES (${token}, ${inviteeName}, ${slug}, ${pendingRole})`;
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

// ------------------------------------------------- open viewer tokens (S48)

export type OpenViewerToken = {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
};

/** One reusable link that anyone can register through as a viewer. Named
 *  invites don't scale past a handful of people; this replaces 30 of them.
 *  Longer-lived than a named invite (30d vs 48h) because it stays posted in a
 *  group chat rather than being handed to one person. */
export async function createOpenViewerToken(): Promise<{ token: string }> {
  const token = generateSecureToken(32);
  await sql`
    INSERT INTO admin_invite_tokens
      (token, expires_at, status, pending_role, is_open)
    VALUES
      (${token}, now() + INTERVAL '30 days', 'generated', 'viewer', true)`;
  return { token };
}

/** Soft-delete: 'rejected' takes the token out of every 'generated' lookup,
 *  so existing links stop working without losing the audit row. */
export async function revokeOpenToken(tokenId: string): Promise<void> {
  await sql`
    UPDATE admin_invite_tokens
    SET status = 'rejected'
    WHERE id = ${tokenId} AND is_open = true`;
}

export async function getOpenViewerTokens(): Promise<OpenViewerToken[]> {
  const rows = await sql`
    SELECT id, token, created_at, expires_at
    FROM admin_invite_tokens
    WHERE is_open = true
      AND status = 'generated'
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 20`;
  return rows as OpenViewerToken[];
}

/** Looks an open token up by token alone -- there is no invitee slug to
 *  match against, unlike getInviteToken. */
export async function getOpenInviteToken(token: string): Promise<{
  id: string;
  token: string;
  pending_role: "admin" | "viewer" | null;
} | null> {
  const rows = await sql`
    SELECT id, token, pending_role
    FROM admin_invite_tokens
    WHERE token = ${token}
      AND is_open = true
      AND status = 'generated'
      AND expires_at > now()`;
  return (rows[0] as { id: string; token: string; pending_role: "admin" | "viewer" | null } | undefined) ?? null;
}

/** Slug for a still-valid NAMED token, looked up by token alone. Only used to
 *  bounce someone who pasted a named token into the flat /admin/register URL
 *  over to its canonical /admin/invite/[slug]/[token] page. */
export async function getNamedInviteSlug(token: string): Promise<string | null> {
  const rows = await sql`
    SELECT invitee_slug
    FROM admin_invite_tokens
    WHERE token = ${token}
      AND is_open = false
      AND invitee_slug IS NOT NULL
      AND status = 'generated'
      AND expires_at > now()`;
  return (rows[0] as { invitee_slug: string } | undefined)?.invitee_slug ?? null;
}

/** Writes one registration made through an open link. The open token row is
 *  left untouched (it must stay reusable), so the pending data goes into a
 *  fresh named row -- is_open = false -- which the approval queue then treats
 *  exactly like a named invite. */
export async function submitOpenRegistration(
  openToken: string,
  fields: {
    name: string;
    username: string;
    displayName: string;
    email: string;
    mobile: string;
    passwordHash: string;
  }
): Promise<boolean> {
  const open = await getOpenInviteToken(openToken);
  if (!open) return false;

  const role = open.pending_role === "admin" ? "admin" : "viewer";
  const rows = await sql`
    INSERT INTO admin_invite_tokens
      (token, expires_at, status, pending_role, is_open,
       invitee_name, invitee_slug,
       pending_username, pending_display_name,
       pending_email, pending_mobile, pending_password_hash)
    VALUES
      (${generateSecureToken(16)},
       now() + INTERVAL '48 hours',
       'pending_approval',
       ${role},
       false,
       ${fields.name}, ${toSlug(fields.name)},
       ${fields.username.toLowerCase()}, ${fields.displayName},
       ${fields.email}, ${fields.mobile}, ${fields.passwordHash})
    RETURNING id`;
  return rows.length > 0;
}

// ---------------------------------------------------- password resets (S29)

/** Godfather-initiated. Replaces any outstanding reset token for the account. */
export async function createPasswordResetToken(accountId: string): Promise<string> {
  const token = generateSecureToken(32);
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
           pending_mobile, pending_role, created_at
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
