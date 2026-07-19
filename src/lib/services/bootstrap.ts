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
  perStall: { stall_name: string; avg_rating: number; count: number }[];
  recentComments: { comment: string; rating: number | null; stall_name: string | null; submitted_at: string }[];
}

export interface VolunteerCredential {
  username: string;
  password: string;
  display_name: string;
}

// stall-lead accounts carry their stall so the CSV can be split by stall
export interface StallLeadCredential extends VolunteerCredential {
  stall: string;
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

// "Sharanya N" -> "sharanyan", "Kethan K B" -> "kethankb",
// "Abhigyan Dutta" -> "abhigyandu"; collisions get a numeric suffix.
function generateUsername(fullName: string, existing: Set<string>): string {
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  const first = (parts[0] ?? "").replace(/[^a-z]/g, "");
  // concatenate all remaining parts (handles initials like "K B")
  const rest = parts.slice(1).join("").replace(/[^a-z]/g, "");
  const base = first + rest.slice(0, 2);
  let candidate = base;
  let n = 2;
  while (existing.has(candidate)) {
    candidate = base + n;
    n++;
  }
  existing.add(candidate);
  return candidate;
}

// S33: stall leads are real accounts (role='stall') named after the people
// the admin typed into the stall builder; suggested_stall_id ties each one
// to their stall (reuses the S28 suggestion mechanism, no new column).
export async function createStallLeadVolunteers(
  sessionId: string,
  stalls: { id: string; stall_name: string; lead_names: string[] }[]
): Promise<StallLeadCredential[]> {
  const existing = new Set<string>();
  const credentials: StallLeadCredential[] = [];
  for (const stall of stalls) {
    for (const name of stall.lead_names) {
      const username = generateUsername(name, existing);
      const password = generatePassword();
      const hash = await bcrypt.hash(password, 10);
      await sql`
        INSERT INTO bootstrap_volunteers
          (session_id, username, password_hash, display_name, role, suggested_stall_id)
        VALUES (${sessionId}, ${username}, ${hash}, ${name}, 'stall', ${stall.id})`;
      credentials.push({ stall: stall.stall_name, display_name: name, username, password });
    }
  }
  return credentials; // plain passwords - returned ONCE, only hashes are stored
}

// Group leads walk with visitor groups; each gets a stable checkin_token at
// creation so their QR URL never changes (migration 015).
export async function createGroupLeadVolunteers(
  sessionId: string,
  count: number
): Promise<{ credentials: VolunteerCredential[]; ids: string[] }> {
  const credentials: VolunteerCredential[] = Array.from({ length: count }, (_, i) => ({
    username: `lead-${i + 1}`,
    password: generatePassword(),
    display_name: `Group Lead ${i + 1}`,
  }));
  const ids: string[] = [];
  for (const c of credentials) {
    const hash = await bcrypt.hash(c.password, 10);
    const token = randomBytes(20).toString("hex");
    const rows = await sql`
      INSERT INTO bootstrap_volunteers
        (session_id, username, password_hash, display_name, role, checkin_token)
      VALUES (${sessionId}, ${c.username}, ${hash}, ${c.display_name}, 'lead', ${token})
      RETURNING id`;
    ids.push((rows[0] as { id: string }).id);
  }
  return { credentials, ids }; // plain passwords - returned ONCE
}

// S33 carry-forward: Bootstrap runs 5 days with (mostly) the same stall leads.
// Copies role='stall' accounts with IDENTICAL usernames AND password hashes so
// the Day 1 CSV keeps working; checkin_token is NOT copied (globally UNIQUE,
// and stall leads don't run QR check-in). Stall association re-links by name.
export async function copyStallLeadVolunteers(
  fromSessionId: string,
  toSessionId: string
): Promise<number> {
  const copied = await sql`
    INSERT INTO bootstrap_volunteers
      (session_id, username, password_hash, display_name, role, suggested_stall_id)
    SELECT ${toSessionId}, v.username, v.password_hash, v.display_name, 'stall',
           (SELECT ns.id FROM bootstrap_stalls ns
            WHERE ns.session_id = ${toSessionId}
              AND lower(ns.stall_name) = lower(os.stall_name)
            LIMIT 1)
    FROM bootstrap_volunteers v
    LEFT JOIN bootstrap_stalls os ON os.id = v.suggested_stall_id
    WHERE v.session_id = ${fromSessionId} AND v.role = 'stall'
    RETURNING id`;
  // carry the informational lead names shown on stall cards too
  await sql`
    UPDATE bootstrap_stalls ns
    SET lead_names = os.lead_names
    FROM bootstrap_stalls os
    WHERE ns.session_id = ${toSessionId}
      AND os.session_id = ${fromSessionId}
      AND lower(ns.stall_name) = lower(os.stall_name)
      AND os.lead_names IS NOT NULL`;
  return copied.length;
}

// carry-forward preview: who would be copied from a source session
export async function getStallLeadVolunteers(
  sessionId: string
): Promise<{ id: string; username: string; display_name: string; stall_name: string | null }[]> {
  const rows = await sql`
    SELECT v.id, v.username, v.display_name, s.stall_name
    FROM bootstrap_volunteers v
    LEFT JOIN bootstrap_stalls s ON s.id = v.suggested_stall_id
    WHERE v.session_id = ${sessionId} AND v.role = 'stall'
    ORDER BY s.stall_name ASC NULLS LAST, v.display_name ASC LIMIT 100`;
  return rows as { id: string; username: string; display_name: string; stall_name: string | null }[];
}

export async function getBootstrapVolunteers(sessionId: string): Promise<BootstrapVolunteer[]> {
  const rows = await sql`
    SELECT v.id, v.session_id, v.username, v.display_name, v.role,
           (v.current_session_token IS NOT NULL) AS is_active,
           v.suggested_stall_id, s.stall_name AS suggested_stall_name
    FROM bootstrap_volunteers v
    LEFT JOIN bootstrap_stalls s ON s.id = v.suggested_stall_id
    WHERE v.session_id = ${sessionId}
    ORDER BY v.username ASC LIMIT 100`;
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
           v.suggested_stall_id, st.stall_name AS suggested_stall_name
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
    LEFT JOIN bootstrap_groups g ON g.team_lead_id = v.id
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

export async function submitBootstrapFeedback(
  sessionId: string,
  rating: number,
  stallId: string | null,
  comment: string | null
): Promise<void> {
  await sql`
    INSERT INTO bootstrap_feedback (session_id, stall_id, rating, comment)
    VALUES (${sessionId}, ${stallId}, ${rating}, ${comment})`;
}

export async function getBootstrapFeedbackSummary(
  sessionId: string
): Promise<BootstrapFeedbackSummary> {
  const [totals, perStall, recent] = await Promise.all([
    sql`SELECT count(*)::int AS total FROM bootstrap_feedback WHERE session_id = ${sessionId}`,
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
      SELECT f.comment, f.rating, s.stall_name, f.submitted_at
      FROM bootstrap_feedback f
      LEFT JOIN bootstrap_stalls s ON s.id = f.stall_id
      WHERE f.session_id = ${sessionId}
        AND f.comment IS NOT NULL AND f.comment <> ''
      ORDER BY f.submitted_at DESC LIMIT 20`,
  ]);
  return {
    total: (totals[0] as { total: number }).total,
    perStall: perStall as BootstrapFeedbackSummary["perStall"],
    recentComments: recent as BootstrapFeedbackSummary["recentComments"],
  };
}

export async function regenerateVolunteerCredentials(
  sessionId: string
): Promise<VolunteerCredential[]> {
  const volunteers = await getBootstrapVolunteers(sessionId);
  const credentials: VolunteerCredential[] = [];
  for (const v of volunteers) {
    const password = generatePassword();
    const hash = await bcrypt.hash(password, 10);
    await sql`
      UPDATE bootstrap_volunteers
      SET password_hash = ${hash}, current_session_token = NULL
      WHERE id = ${v.id}`;
    credentials.push({ username: v.username, password, display_name: v.display_name });
  }
  return credentials;
}
