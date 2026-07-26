import { randomBytes, randomInt } from "crypto";

import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export interface BootstrapSession {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  map_image_url: string | null; // migration 008
  max_group_size?: number; // migration 015 - visitor cap per group
  stall_count?: number; // present on getBootstrapSessions() rows
}

export interface BootstrapStall {
  id: string;
  session_id: string;
  stall_number: number;
  stall_name: string;
  status: "free" | "occupied" | "queued";
  max_occupancy: number;
  claimed_by: string[] | null;
  queued_by: string | null; // migration 008 - who set the queue signal
  queued_at: string | null; // migration 009 - when the queue was set (wait timer)
  map_x: number | null; // migration 008 - % from left edge of map image
  map_y: number | null; // migration 008 - % from top edge
  lead_names: string | null; // migration 015 - informational, comma-separated
  updated_at: string;
}

// password_hash and current_session_token never leave this file.
// login_code is the deliberate exception (S35): it IS the volunteer's password,
// kept plaintext so the admin tables can show it - /bootstrap is low-stakes.
export interface BootstrapVolunteer {
  id: string;
  session_id: string;
  username: string;
  display_name: string;
  is_active: boolean;
  suggested_stall_id: string | null; // migration 009 - admin-assigned stall
  suggested_stall_name: string | null;
  role: "stall" | "lead"; // migration 014 - which dashboard the volunteer gets
  checkin_token?: string | null; // migration 015 - stable QR token (leads only)
  login_code?: string | null; // migration 016 - plaintext, admin-visible
  phone?: string | null; // migration 016 - self-registration contact
  srn?: string | null; // migration 016 - username is the lowercased SRN
  group_number?: number | null; // migration 016 - assigned FCFS on activation
  in_classroom?: boolean; // migration 016 - classroom-mode flag (leads)
  preferred_stall_name?: string | null; // migration 021 - free text, pool members
}

// migration 021 - a pre-registered volunteer with no session yet (session_id NULL)
export interface PoolVolunteer {
  id: string;
  display_name: string;
  username: string;
  srn: string | null;
  phone: string | null;
  preferred_stall_name: string | null;
  created_at: string;
}

// migration 014 - visitor groups walked by a lead volunteer
export interface BootstrapGroup {
  id: string;
  session_id: string;
  name: string;
  team_lead_id: string | null;
  lead_name: string | null;
  lead_username: string | null;
  visitor_count: number;
  created_at: string;
}

export interface BootstrapVisitor {
  id: string;
  session_id: string;
  name: string;
  prn: string;
  phone: string;
  group_id: string | null;
  group_name: string | null;
  arrived_at: string;
}

export interface BootstrapFeedbackSummary {
  total: number;
  avgOverall: number | null; // S36 - out of 10
  avgJoinLikelihood: number | null; // S36 - out of 5
  perStall: { stall_name: string; avg_rating: number; count: number }[];
  recentComments: { comment: string; rating: number | null; stall_name: string | null; submitted_at: string }[];
}

// 8 chars, no ambiguous characters (0/O, 1/l/I)
const CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
function generatePassword(length = 8): string {
  return Array.from(
    { length },
    () => CHARS[randomInt(0, CHARS.length)]
  ).join("");
}

// ---------------------------------------------------------------- sessions

export async function createBootstrapSession(
  name: string,
  maxGroupSize = 20
): Promise<BootstrapSession> {
  const rows = await sql`
    INSERT INTO bootstrap_sessions (name, max_group_size)
    VALUES (${name}, ${maxGroupSize}) RETURNING *`;
  return rows[0] as BootstrapSession;
}

// S49: admin can rename a session and change its visitor cap after creation.
// Only the fields present in `data` are written - the COALESCE keeps the rest.
export async function updateBootstrapSession(
  id: string,
  data: { name?: string; max_group_size?: number }
): Promise<BootstrapSession | null> {
  const rows = await sql`
    UPDATE bootstrap_sessions
    SET name           = COALESCE(${data.name ?? null}, name),
        max_group_size = COALESCE(${data.max_group_size ?? null}, max_group_size)
    WHERE id = ${id}
    RETURNING *`;
  return (rows[0] as BootstrapSession) ?? null;
}

export async function getBootstrapSessions(): Promise<BootstrapSession[]> {
  const rows = await sql`
    SELECT s.*, count(st.id)::int AS stall_count
    FROM bootstrap_sessions s
    LEFT JOIN bootstrap_stalls st ON st.session_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC LIMIT 50`;
  return rows as BootstrapSession[];
}

export async function getActiveBootstrapSession(): Promise<BootstrapSession | null> {
  const rows = await sql`
    SELECT * FROM bootstrap_sessions WHERE is_active = true LIMIT 1`;
  return (rows[0] as BootstrapSession) ?? null;
}

export async function deleteBootstrapSession(id: string): Promise<void> {
  // Refuse to delete an active session - must deactivate first
  const rows = await sql`
    SELECT is_active FROM bootstrap_sessions WHERE id = ${id}`;
  if (!rows.length) throw new Error("Session not found");
  if ((rows[0] as { is_active: boolean }).is_active) {
    throw new Error("Cannot delete an active session. Deactivate it first.");
  }
  // ON DELETE CASCADE (migration 007) removes stalls + volunteers with it
  await sql`DELETE FROM bootstrap_sessions WHERE id = ${id}`;
}

export async function setSessionActive(id: string, isActive: boolean): Promise<void> {
  if (isActive) {
    // single statement: activates this one, deactivates every other
    await sql`UPDATE bootstrap_sessions SET is_active = (id = ${id})`;
    // S35: group volunteers registered before the day starts; hand out group
    // numbers FCFS the moment the session goes live
    await assignGroupNumbers(id);
  } else {
    await sql`UPDATE bootstrap_sessions SET is_active = false WHERE id = ${id}`;
  }
}

// ------------------------------------------------------------------ stalls

// Positions measured from the colored annotation blobs in
// bootstrap_references/college1.png (S31, blob-centroid extraction).
// Percentages of the 1024x419 viewBox in BootstrapMapSVG - same image,
// so these land exactly on the drawn structures.
export const DEFAULT_STALL_POSITIONS: Record<string, { map_x: number; map_y: number }> = {
  // Go-kart showcase (red blob): west parking apron
  "go-kart":          { map_x: 15.7, map_y: 30.9 },
  "gokart":           { map_x: 15.7, map_y: 30.9 },
  // Engines / club room (orange blob): mech block, club room section
  "engines":          { map_x: 54.8, map_y: 83.9 },
  "club room":        { map_x: 54.8, map_y: 83.9 },
  // Sponsor stalls (white blobs): corridor center + east end
  "sponsor stall 1":  { map_x: 50.4, map_y: 59.7 },
  "sponsor stall 2":  { map_x: 82.1, map_y: 51.4 },
  "sponsor":          { map_x: 50.4, map_y: 59.7 },
  // Classroom sessions (green blobs, left/right): the two main-block wings
  "classroom (mech)": { map_x: 48.1, map_y: 25.2 },
  "classroom (main)": { map_x: 63.0, map_y: 18.2 },
  "sessions":         { map_x: 63.0, map_y: 18.2 },
  "classroom":        { map_x: 63.0, map_y: 18.2 },
  // S32 label swap: the east-end building is Avions; KUKA sits in the corridor
  "kuka":             { map_x: 63.0, map_y: 74.0 },
  "avions":           { map_x: 77.6, map_y: 69.2 },
  // Bikes showcase (magenta blob): corridor, north edge
  "bikes":            { map_x: 71.3, map_y: 39.0 },
  "bike":             { map_x: 71.3, map_y: 39.0 },
  // Go-kart parking / lawnmower engines (yellow blob): corridor
  "go-kart parking":  { map_x: 61.4, map_y: 52.9 },
  "lawnmower":        { map_x: 61.4, map_y: 52.9 },
  // Car stalls (blue blobs, left/right): corridor
  "car":              { map_x: 66.4, map_y: 50.4 },
  "maruti":           { map_x: 66.4, map_y: 50.4 },
  "lancer":           { map_x: 75.7, map_y: 49.0 },
  // Tyre demo (brown blob): between the car stalls
  "tyre":             { map_x: 70.9, map_y: 49.5 },
};

// longest key first so "go-kart parking" wins over "go-kart"
function defaultPositionFor(stallName: string): { map_x: number; map_y: number } | null {
  const name = stallName.toLowerCase();
  const match = Object.keys(DEFAULT_STALL_POSITIONS)
    .sort((a, b) => b.length - a.length)
    .find((key) => name.includes(key));
  return match ? (DEFAULT_STALL_POSITIONS[match] ?? null) : null;
}

// Returns the created rows so the caller can attach stall-lead accounts
// (S33) to the right stall via suggested_stall_id.
export async function createBootstrapStalls(
  sessionId: string,
  stalls: {
    stall_name: string;
    max_occupancy: number;
    stall_number: number;
    lead_names?: string[];
  }[]
): Promise<{ id: string; stall_name: string; lead_names: string[] }[]> {
  const created: { id: string; stall_name: string; lead_names: string[] }[] = [];
  for (const s of stalls) {
    // convenience only - admin can correct via the map setup panel
    const pos = defaultPositionFor(s.stall_name);
    const leadNames = (s.lead_names ?? []).map((n) => n.trim()).filter(Boolean);
    const rows = await sql`
      INSERT INTO bootstrap_stalls (session_id, stall_number, stall_name, max_occupancy, map_x, map_y, lead_names)
      VALUES (${sessionId}, ${s.stall_number}, ${s.stall_name}, ${s.max_occupancy},
              ${pos?.map_x ?? null}, ${pos?.map_y ?? null},
              ${leadNames.length ? leadNames.join(", ") : null})
      RETURNING id, stall_name`;
    const row = rows[0] as { id: string; stall_name: string };
    created.push({ id: row.id, stall_name: row.stall_name, lead_names: leadNames });
  }
  return created;
}

// S49: add a single stall to an existing session. stall_number is display order
// only, so it just continues past the current max (UNIQUE(session_id,
// stall_number) from migration 007 means we cannot reuse a deleted number).
export async function addStallToSession(
  sessionId: string,
  stallName: string,
  maxOccupancy: number
): Promise<BootstrapStall> {
  const maxRows = await sql`
    SELECT COALESCE(max(stall_number), 0)::int AS n
    FROM bootstrap_stalls WHERE session_id = ${sessionId}`;
  const nextNumber = (maxRows[0] as { n: number }).n + 1;
  const pos = defaultPositionFor(stallName);
  const rows = await sql`
    INSERT INTO bootstrap_stalls
      (session_id, stall_number, stall_name, max_occupancy, map_x, map_y)
    VALUES
      (${sessionId}, ${nextNumber}, ${stallName}, ${maxOccupancy},
       ${pos?.map_x ?? null}, ${pos?.map_y ?? null})
    RETURNING *`;
  return rows[0] as BootstrapStall;
}

// Refuses to delete a stall someone is currently standing at - the admin has to
// free it first, otherwise a volunteer loses their claim mid-session.
// Returns a reason instead of throwing so the route can pick 404 vs 409.
// sessionId scopes the lookup: the route is nested under a session, so a stall id
// from a different session must read as not-found rather than deleting.
export async function deleteStall(
  stallId: string,
  sessionId: string
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "occupied" }> {
  const rows = await sql`
    SELECT claimed_by FROM bootstrap_stalls
    WHERE id = ${stallId} AND session_id = ${sessionId} LIMIT 1`;
  if (!rows.length) return { ok: false, reason: "not_found" };
  const claimedBy = (rows[0] as { claimed_by: string[] | null }).claimed_by ?? [];
  if (claimedBy.length > 0) return { ok: false, reason: "occupied" };

  // volunteers pointed at this stall keep their session; only the suggestion goes
  await sql`
    UPDATE bootstrap_volunteers SET suggested_stall_id = NULL
    WHERE suggested_stall_id = ${stallId}`;
  await sql`DELETE FROM bootstrap_stalls WHERE id = ${stallId}`;
  return { ok: true };
}

export async function getBootstrapStalls(sessionId: string): Promise<BootstrapStall[]> {
  const rows = await sql`
    SELECT * FROM bootstrap_stalls
    WHERE session_id = ${sessionId}
    ORDER BY stall_number ASC LIMIT 50`;
  return rows as BootstrapStall[];
}

export type StallAction = "claim" | "release" | "mark_queued" | "unqueue" | "override";

/**
 * claim:       append username to claimed_by if not already present, status → occupied
 * release:     remove username; stall goes free when nobody is left;
 *              queued_by always clears (releasing the stall clears any queue)
 * mark_queued: status → queued, claimed_by untouched, queued_by = username;
 *              ANY volunteer may set it on an occupied stall
 * unqueue:     status → occupied, queued_by cleared (UI gates this to queued_by)
 * override:    admin sets status + claimed_by + queued_by directly (username is a
 *              comma-separated list of usernames here, "" clears it;
 *              queuedBy clears when status is "free" or omitted)
 */
export async function updateStallStatus(
  stallId: string,
  username: string,
  action: StallAction,
  status?: string, // override only - every other action implies its status
  queuedBy?: string // override only
): Promise<BootstrapStall> {
  let rows;
  if (action === "claim") {
    // CASE instead of a WHERE guard so a re-claim by a volunteer already
    // in claimed_by still updates the row.
    rows = await sql`
      UPDATE bootstrap_stalls
      SET status = 'occupied',
          claimed_by = CASE
            WHEN ${username} = ANY(coalesce(claimed_by, '{}')) THEN claimed_by
            ELSE array_append(coalesce(claimed_by, '{}'), ${username})
          END,
          updated_at = now()
      WHERE id = ${stallId}
      RETURNING *`;
  } else if (action === "release") {
    rows = await sql`
      UPDATE bootstrap_stalls
      SET claimed_by = array_remove(coalesce(claimed_by, '{}'), ${username}),
          status = CASE
            WHEN array_length(array_remove(coalesce(claimed_by, '{}'), ${username}), 1) IS NULL
            THEN 'free' ELSE status
          END,
          queued_by = NULL,
          queued_at = NULL,
          updated_at = now()
      WHERE id = ${stallId}
      RETURNING *`;
  } else if (action === "mark_queued") {
    // status guard: a stale card can't queue a stall that just went free
    rows = await sql`
      UPDATE bootstrap_stalls
      SET status = 'queued', queued_by = ${username}, queued_at = now(), updated_at = now()
      WHERE id = ${stallId} AND status = 'occupied'
      RETURNING *`;
  } else if (action === "unqueue") {
    rows = await sql`
      UPDATE bootstrap_stalls
      SET status = 'occupied', queued_by = NULL, queued_at = NULL, updated_at = now()
      WHERE id = ${stallId} AND status = 'queued'
      RETURNING *`;
  } else {
    // never pass a JS array as a driver param (spec rule) - build it in SQL
    // queued_at clears whenever override lands on a non-queued status
    rows = await sql`
      UPDATE bootstrap_stalls
      SET status = ${status ?? "free"},
          claimed_by = string_to_array(NULLIF(${username}, ''), ','),
          queued_by = NULLIF(${status === "free" ? "" : (queuedBy ?? "")}, ''),
          queued_at = CASE WHEN ${status ?? "free"} = 'queued' THEN coalesce(queued_at, now()) ELSE NULL END,
          updated_at = now()
      WHERE id = ${stallId}
      RETURNING *`;
  }
  if (rows.length === 0) {
    // guarded action raced a state change - hand back the current row so
    // the tapping volunteer's UI resyncs immediately instead of 404ing
    rows = await sql`SELECT * FROM bootstrap_stalls WHERE id = ${stallId} LIMIT 1`;
  }
  return rows[0] as BootstrapStall;
}

// map positions are percentages (0-100) from the top-left of the map image;
// null/null clears the pin (S33 pin-drop CLEAR action)
export async function setStallMapPosition(
  stallId: string,
  x: number | null,
  y: number | null
): Promise<void> {
  await sql`UPDATE bootstrap_stalls SET map_x = ${x}, map_y = ${y} WHERE id = ${stallId}`;
}

export async function setSessionMapImage(sessionId: string, imageUrl: string): Promise<void> {
  await sql`UPDATE bootstrap_sessions SET map_image_url = ${imageUrl} WHERE id = ${sessionId}`;
}

// -------------------------------------------------------------- volunteers

// S35 self-registration: username IS the SRN (lowercase, trimmed) - memorable
// and unique per person; password is the auto-generated login_code, stored
// plaintext alongside the hash so the admin tables can display it.

// S49: sessionId and stallId are nullable. With both null the volunteer lands in
// the pre-registration pool (migration 021) and carries preferredStallName as
// free text until an admin assigns them to a real session stall.
export async function registerStallVolunteer(
  sessionId: string | null,
  name: string,
  phone: string,
  srn: string,
  stallId: string | null,
  preferredStallName: string | null = null
): Promise<{ username: string; loginCode: string }> {
  const username = srn.toLowerCase().trim();
  const loginCode = generatePassword(8);
  const hash = await bcrypt.hash(loginCode, 10);

  // suggested_stall_id is the existing volunteer→stall link (S28/S33): it
  // drives the admin STALL column and the volunteer's own dashboard highlight
  await sql`
    INSERT INTO bootstrap_volunteers
      (session_id, username, display_name, password_hash,
       login_code, phone, srn, role, suggested_stall_id, preferred_stall_name)
    VALUES
      (${sessionId}, ${username}, ${name}, ${hash},
       ${loginCode}, ${phone}, ${srn}, 'stall', ${stallId}, ${preferredStallName})`;

  // S36: the stall is NOT claimed at registration - the volunteer hasn't
  // arrived yet. suggested_stall_id (set above) is enough for the admin STALL
  // column and the volunteer's dashboard highlight. The stall stays FREE until
  // the volunteer logs in and taps OCCUPIED when the first group arrives.

  return { username, loginCode };
}

// Group volunteers get a stable checkin_token at registration so their QR URL
// never changes (migration 015); the group number comes later, on activation.
export async function registerGroupVolunteer(
  sessionId: string,
  name: string,
  phone: string,
  srn: string
): Promise<{ username: string; loginCode: string }> {
  const username = srn.toLowerCase().trim();
  const loginCode = generatePassword(8);
  const hash = await bcrypt.hash(loginCode, 10);
  const token = randomBytes(20).toString("hex");

  await sql`
    INSERT INTO bootstrap_volunteers
      (session_id, username, display_name, password_hash,
       login_code, phone, srn, role, checkin_token)
    VALUES
      (${sessionId}, ${username}, ${name}, ${hash},
       ${loginCode}, ${phone}, ${srn}, 'lead', ${token})`;

  return { username, loginCode };
}

// FCFS group numbers, handed out when the session activates. Round-robin over
// the session's groups (Group A = 1, Group B = 2, ... in name order) so late
// registrations spread evenly. Idempotent: only fills NULL group_numbers, so
// re-activating a session never reshuffles anyone.
export async function assignGroupNumbers(sessionId: string): Promise<void> {
  const groups = await sql`
    SELECT id, team_lead_id FROM bootstrap_groups
    WHERE session_id = ${sessionId}
    ORDER BY name ASC LIMIT 50`;
  const groupCount = groups.length;
  if (groupCount === 0) return;

  const leads = await sql`
    SELECT id FROM bootstrap_volunteers
    WHERE session_id = ${sessionId}
      AND role = 'lead'
      AND group_number IS NULL
    ORDER BY created_at ASC, id ASC`;

  // offset past already-assigned leads so a second activation continues the
  // round-robin instead of restarting at group 1
  const assignedRows = await sql`
    SELECT count(*)::int AS n FROM bootstrap_volunteers
    WHERE session_id = ${sessionId} AND role = 'lead' AND group_number IS NOT NULL`;
  const offset = (assignedRows[0] as { n: number }).n;

  for (let i = 0; i < leads.length; i++) {
    const leadId = (leads[i] as { id: string }).id;
    const groupIdx = (offset + i) % groupCount;
    await sql`
      UPDATE bootstrap_volunteers
      SET group_number = ${groupIdx + 1}
      WHERE id = ${leadId}`;
    // first lead into a group becomes its team_lead_id, which is what the
    // QR check-in flow (getCheckinContext) resolves the group through
    const group = groups[groupIdx] as { id: string; team_lead_id: string | null };
    if (!group.team_lead_id) {
      await sql`
        UPDATE bootstrap_groups SET team_lead_id = ${leadId}
        WHERE id = ${group.id} AND team_lead_id IS NULL`;
      group.team_lead_id = leadId;
    }
  }
}

export async function getBootstrapVolunteers(sessionId: string): Promise<BootstrapVolunteer[]> {
  // login_code is plaintext by design (S35) - this function is only called
  // from admin-authenticated routes; never expose it on a public endpoint
  const rows = await sql`
    SELECT v.id, v.session_id, v.username, v.display_name, v.role,
           (v.current_session_token IS NOT NULL) AS is_active,
           v.suggested_stall_id, s.stall_name AS suggested_stall_name,
           v.login_code, v.phone, v.srn, v.group_number, v.in_classroom
    FROM bootstrap_volunteers v
    LEFT JOIN bootstrap_stalls s ON s.id = v.suggested_stall_id
    WHERE v.session_id = ${sessionId}
      AND v.login_code IS NOT NULL  -- S36: only self-registered volunteers; hides legacy CSV accounts
    ORDER BY v.display_name ASC LIMIT 200`;
  return rows as BootstrapVolunteer[];
}

export async function getVolunteerByUsername(
  sessionId: string,
  username: string
): Promise<BootstrapVolunteer | null> {
  const rows = await sql`
    SELECT id, session_id, username, display_name,
           (current_session_token IS NOT NULL) AS is_active
    FROM bootstrap_volunteers
    WHERE session_id = ${sessionId} AND username = ${username}
    LIMIT 1`;
  return (rows[0] as BootstrapVolunteer) ?? null;
}

export async function verifyVolunteerPassword(
  volunteerId: string,
  password: string
): Promise<boolean> {
  const rows = await sql`
    SELECT password_hash FROM bootstrap_volunteers WHERE id = ${volunteerId} LIMIT 1`;
  const hash = (rows[0] as { password_hash: string } | undefined)?.password_hash;
  if (!hash) return false;
  // bcrypt.compare throws on a malformed hash - treat as invalid, not a crash
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export async function claimVolunteerSession(
  volunteerId: string,
  token: string
): Promise<boolean> {
  // atomic claim - the conflict check and the write are one statement
  const rows = await sql`
    UPDATE bootstrap_volunteers
    SET current_session_token = ${token}
    WHERE id = ${volunteerId} AND current_session_token IS NULL
    RETURNING id`;
  return rows.length === 1;
}

export async function clearVolunteerSession(volunteerId: string): Promise<void> {
  // idempotent - clearing an already-NULL token still succeeds
  await sql`
    UPDATE bootstrap_volunteers
    SET current_session_token = NULL
    WHERE id = ${volunteerId}`;
}

export async function getVolunteerByToken(token: string): Promise<BootstrapVolunteer | null> {
  const rows = await sql`
    SELECT v.id, v.session_id, v.username, v.display_name, v.role, v.checkin_token,
           (v.current_session_token IS NOT NULL) AS is_active,
           v.suggested_stall_id, st.stall_name AS suggested_stall_name,
           v.group_number, v.in_classroom
    FROM bootstrap_volunteers v
    JOIN bootstrap_sessions s ON s.id = v.session_id
    LEFT JOIN bootstrap_stalls st ON st.id = v.suggested_stall_id
    WHERE v.current_session_token = ${token} AND s.is_active = true
    LIMIT 1`;
  return (rows[0] as BootstrapVolunteer) ?? null;
}

export async function setVolunteerRole(
  volunteerId: string,
  role: "stall" | "lead"
): Promise<void> {
  await sql`UPDATE bootstrap_volunteers SET role = ${role} WHERE id = ${volunteerId}`;
}

// S36: leads flip themselves into classroom mode from the dashboard, which
// suppresses redirect suggestions and queue actions while they run a session
export async function setClassroomMode(id: string, val: boolean): Promise<void> {
  await sql`UPDATE bootstrap_volunteers SET in_classroom = ${val} WHERE id = ${id}`;
}

// admin points a volunteer at a stall; null clears the suggestion
export async function suggestStallToVolunteer(
  volunteerId: string,
  stallId: string | null
): Promise<void> {
  await sql`
    UPDATE bootstrap_volunteers
    SET suggested_stall_id = ${stallId}
    WHERE id = ${volunteerId}`;
}

// ------------------------------------- pre-registration pool (S49, mig 021)

// Volunteers who registered before any session existed. They have no session_id,
// so they cannot log in yet - an admin assigns them to a session stall first.
export async function getUnassignedVolunteers(): Promise<PoolVolunteer[]> {
  const rows = await sql`
    SELECT id, display_name, username, srn, phone, preferred_stall_name, created_at
    FROM bootstrap_volunteers
    WHERE session_id IS NULL
    ORDER BY created_at ASC LIMIT 200`;
  return rows as PoolVolunteer[];
}

// UNIQUE(session_id, username) from 007 does not catch pool duplicates (Postgres
// treats NULLs as distinct), so the pool's one-account-per-SRN rule lives here.
export async function getPoolVolunteerBySrn(
  username: string
): Promise<{ id: string } | null> {
  const rows = await sql`
    SELECT id FROM bootstrap_volunteers
    WHERE session_id IS NULL AND username = ${username}
    LIMIT 1`;
  return (rows[0] as { id: string }) ?? null;
}

// The session_id IS NULL guard makes this a one-way door: an already-assigned
// volunteer cannot be moved by re-firing the assign route.
export async function assignVolunteerToSession(
  volunteerId: string,
  sessionId: string,
  stallId: string | null
): Promise<boolean> {
  const rows = await sql`
    UPDATE bootstrap_volunteers
    SET session_id = ${sessionId}, suggested_stall_id = ${stallId}
    WHERE id = ${volunteerId} AND session_id IS NULL
    RETURNING id`;
  return rows.length === 1;
}

// Best-effort sweep run right after a session's stalls are created: pool members
// whose typed preferred_stall_name matches a new stall name (case-insensitive)
// get pulled in automatically. Everyone else stays in the pool for manual
// assignment. Returns how many were assigned.
export async function autoAssignPoolMembers(sessionId: string): Promise<number> {
  const rows = await sql`
    UPDATE bootstrap_volunteers v
    SET session_id = ${sessionId},
        suggested_stall_id = s.id
    FROM bootstrap_stalls s
    WHERE v.session_id IS NULL
      AND s.session_id = ${sessionId}
      AND lower(trim(s.stall_name)) = lower(trim(v.preferred_stall_name))
    RETURNING v.id`;
  return rows.length;
}

// -------------------------------------------- visitor groups (S32, mig 014)

export async function getBootstrapGroups(sessionId: string): Promise<BootstrapGroup[]> {
  const rows = await sql`
    SELECT g.*, v.display_name AS lead_name, v.username AS lead_username,
           count(vis.id)::int AS visitor_count
    FROM bootstrap_groups g
    LEFT JOIN bootstrap_volunteers v ON v.id = g.team_lead_id
    LEFT JOIN bootstrap_visitors vis ON vis.group_id = g.id
    WHERE g.session_id = ${sessionId}
    GROUP BY g.id, v.display_name, v.username
    ORDER BY g.name ASC LIMIT 50`;
  return rows as BootstrapGroup[];
}

export async function createBootstrapGroups(
  sessionId: string,
  count: number,
  leadIds?: string[] // S33: Group A -> leadIds[0], Group B -> leadIds[1], ...
): Promise<void> {
  // "Group A".."Group Z" - callers clamp count to 1-26
  const names = Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
  for (const [i, name] of names.entries()) {
    await sql`
      INSERT INTO bootstrap_groups (session_id, name, team_lead_id)
      VALUES (${sessionId}, ${"Group " + name}, ${leadIds?.[i] ?? null})
      ON CONFLICT (session_id, name) DO NOTHING`;
  }
}

export async function assignLeadToGroup(
  groupId: string,
  leadId: string | null
): Promise<void> {
  await sql`UPDATE bootstrap_groups SET team_lead_id = ${leadId} WHERE id = ${groupId}`;
}

// S33: everything the per-lead check-in page needs, resolved from the stable
// checkin_token in the QR URL. Null = unknown token OR no active session.
export interface CheckinContext {
  volunteer_id: string;
  lead_name: string;
  session_id: string;
  session_name: string;
  max_group_size: number;
  group_id: string | null;
  group_name: string | null;
  visitor_count: number;
}

export async function getCheckinContext(token: string): Promise<CheckinContext | null> {
  const rows = await sql`
    SELECT v.id AS volunteer_id, v.display_name AS lead_name,
           v.session_id, s.name AS session_name,
           coalesce(s.max_group_size, 20)::int AS max_group_size,
           g.id AS group_id, g.name AS group_name,
           (SELECT count(*) FROM bootstrap_visitors WHERE group_id = g.id)::int AS visitor_count
    FROM bootstrap_volunteers v
    JOIN bootstrap_sessions s ON s.id = v.session_id
    LEFT JOIN bootstrap_groups g
      ON g.session_id = v.session_id
     AND (g.team_lead_id = v.id
          OR g.name = 'Group ' || chr(64 + v.group_number))
    WHERE v.checkin_token = ${token} AND s.is_active = true
    LIMIT 1`;
  return (rows[0] as CheckinContext) ?? null;
}

// S33: the token lookup already resolved the group, so check in directly to it;
// the capacity check and the INSERT are one statement, so two phones scanning
// the last slot at once can't both get in. Returns false when the group is full.
export async function checkinVisitorToGroup(
  sessionId: string,
  groupId: string,
  maxGroupSize: number,
  name: string,
  prn: string,
  phone: string
): Promise<boolean> {
  const rows = await sql`
    INSERT INTO bootstrap_visitors (session_id, name, prn, phone, group_id)
    SELECT ${sessionId}, ${name}, ${prn}, ${phone}, ${groupId}
    WHERE (SELECT count(*) FROM bootstrap_visitors WHERE group_id = ${groupId}) < ${maxGroupSize}
    RETURNING id`;
  return rows.length === 1;
}

export async function getBootstrapVisitors(sessionId: string): Promise<BootstrapVisitor[]> {
  const rows = await sql`
    SELECT v.*, g.name AS group_name
    FROM bootstrap_visitors v
    LEFT JOIN bootstrap_groups g ON g.id = v.group_id
    WHERE v.session_id = ${sessionId}
    ORDER BY v.arrived_at DESC LIMIT 1000`;
  return rows as BootstrapVisitor[];
}

// AUTO-BATCH: spread visitors that have no group across the session's groups.
// Round-robin over arrival order so early arrivals stay together-ish.
export async function assignUnassignedVisitors(sessionId: string): Promise<number> {
  const groups = await sql`
    SELECT id FROM bootstrap_groups
    WHERE session_id = ${sessionId} ORDER BY name ASC LIMIT 50`;
  if (!groups.length) return 0;
  const groupIds = (groups as { id: string }[]).map((g) => g.id);

  const visitors = await sql`
    SELECT id FROM bootstrap_visitors
    WHERE session_id = ${sessionId} AND group_id IS NULL
    ORDER BY arrived_at ASC`;
  if (!visitors.length) return 0;

  const idArr = (visitors as { id: string }[]).map((v) => v.id);
  const grpArr = idArr.map((_, i) => groupIds[i % groupIds.length]);
  await sql`
    UPDATE bootstrap_visitors SET group_id = data.grp
    FROM (
      SELECT unnest(${idArr}::uuid[]) AS id, unnest(${grpArr}::uuid[]) AS grp
    ) AS data
    WHERE bootstrap_visitors.id = data.id`;
  return idArr.length;
}

// ------------------------------------------------- feedback (S32, mig 014)

// S36: multi-question form. overall_rating (1-10) is the primary metric and is
// required; the old `rating` column now holds the optional per-stall 1-5 score.
// suggestions is the free-text field (the legacy `comment` column is left as-is
// for older rows and is unioned into the admin summary).
export async function submitBootstrapFeedback(
  sessionId: string,
  data: {
    overallRating: number;
    stallId: string | null;
    stallRating: number | null;
    joinLikelihood: number | null;
    memorableStall: string | null;
    suggestions: string | null;
  }
): Promise<void> {
  await sql`
    INSERT INTO bootstrap_feedback
      (session_id, stall_id, rating, overall_rating,
       join_likelihood, memorable_stall, suggestions)
    VALUES
      (${sessionId}, ${data.stallId}, ${data.stallRating}, ${data.overallRating},
       ${data.joinLikelihood}, ${data.memorableStall}, ${data.suggestions})`;
}

export async function getBootstrapFeedbackSummary(
  sessionId: string
): Promise<BootstrapFeedbackSummary> {
  const [totals, perStall, recent] = await Promise.all([
    sql`
      SELECT count(*)::int AS total,
             round(avg(overall_rating)::numeric, 2)::float AS avg_overall,
             round(avg(join_likelihood)::numeric, 2)::float AS avg_join
      FROM bootstrap_feedback WHERE session_id = ${sessionId}`,
    sql`
      SELECT coalesce(s.stall_name, '(no stall)') AS stall_name,
             round(avg(f.rating)::numeric, 2)::float AS avg_rating,
             count(*)::int AS count
      FROM bootstrap_feedback f
      LEFT JOIN bootstrap_stalls s ON s.id = f.stall_id
      WHERE f.session_id = ${sessionId} AND f.rating IS NOT NULL
      GROUP BY s.stall_name
      ORDER BY avg_rating DESC LIMIT 50`,
    sql`
      SELECT coalesce(f.suggestions, f.comment) AS comment,
             f.rating, s.stall_name, f.submitted_at
      FROM bootstrap_feedback f
      LEFT JOIN bootstrap_stalls s ON s.id = f.stall_id
      WHERE f.session_id = ${sessionId}
        AND coalesce(f.suggestions, f.comment) IS NOT NULL
        AND coalesce(f.suggestions, f.comment) <> ''
      ORDER BY f.submitted_at DESC LIMIT 20`,
  ]);
  const t = totals[0] as { total: number; avg_overall: number | null; avg_join: number | null };
  return {
    total: t.total,
    avgOverall: t.avg_overall,
    avgJoinLikelihood: t.avg_join,
    perStall: perStall as BootstrapFeedbackSummary["perStall"],
    recentComments: recent as BootstrapFeedbackSummary["recentComments"],
  };
}

// S38: raw feedback rows for the Gemini admin summary. Kept in the service
// layer (not inline in the route) per the architecture contract - the route
// only shapes the text and calls Gemini.
export interface BootstrapFeedbackRow {
  overall_rating: number | null;
  join_likelihood: number | null;
  memorable_stall: string | null;
  suggestions: string | null;
  stall_rating: number | null;
  comment: string | null;
  stall_name: string | null;
}

export async function getBootstrapFeedbackRaw(
  sessionId: string
): Promise<BootstrapFeedbackRow[]> {
  const rows = await sql`
    SELECT
      f.overall_rating,
      f.join_likelihood,
      f.memorable_stall,
      f.suggestions,
      f.rating        AS stall_rating,
      f.comment,
      s.stall_name
    FROM bootstrap_feedback f
    LEFT JOIN bootstrap_stalls s ON s.id = f.stall_id
    WHERE f.session_id = ${sessionId}
    ORDER BY f.submitted_at DESC
    LIMIT 500`;
  return rows as BootstrapFeedbackRow[];
}
