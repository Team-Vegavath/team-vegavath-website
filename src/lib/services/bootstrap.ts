import { randomInt } from "crypto";

import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export interface BootstrapSession {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  map_image_url: string | null; // migration 008
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
}

export interface VolunteerCredential {
  username: string;
  password: string;
  display_name: string;
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

export async function createBootstrapSession(name: string): Promise<BootstrapSession> {
  const rows = await sql`
    INSERT INTO bootstrap_sessions (name) VALUES (${name}) RETURNING *`;
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

export async function setSessionActive(id: string, isActive: boolean): Promise<void> {
  if (isActive) {
    // single statement: activates this one, deactivates every other
    await sql`UPDATE bootstrap_sessions SET is_active = (id = ${id})`;
  } else {
    await sql`UPDATE bootstrap_sessions SET is_active = false WHERE id = ${id}`;
  }
}

// ------------------------------------------------------------------ stalls

// Default positions derived from annotated satellite image (BY25 layout)
// Percentages of the 1000x700 SVG viewBox in BootstrapMapSVG
export const DEFAULT_STALL_POSITIONS: Record<string, { map_x: number; map_y: number }> = {
  // Go-kart showcase: far left/west, near the road - outside the main campus buildings
  "go-kart":          { map_x: 8,  map_y: 65 },
  "gokart":           { map_x: 8,  map_y: 65 },
  // Engines / club room: G floor area, lower section of main block
  "engines":          { map_x: 47, map_y: 72 },
  "club room":        { map_x: 47, map_y: 72 },
  // Sponsor stalls: Bootstrap corridor, center-left
  "sponsor":          { map_x: 36, map_y: 50 },
  // Classroom sessions: main academic block upper wings
  "sessions":         { map_x: 60, map_y: 22 },
  "classroom":        { map_x: 60, map_y: 22 },
  // KUKA experience: near KUKA building, south-east end of corridor
  "kuka":             { map_x: 82, map_y: 60 },
  "avions":           { map_x: 78, map_y: 55 },
  // Bikes showcase: corridor, center
  "bikes":            { map_x: 54, map_y: 46 },
  "bike":             { map_x: 54, map_y: 46 },
  // Go-kart parking / lawnmower engines: corridor
  "go-kart parking":  { map_x: 46, map_y: 52 },
  "lawnmower":        { map_x: 46, map_y: 52 },
  // Car stalls: corridor, slightly east of center
  "car":              { map_x: 57, map_y: 53 },
  "maruti":           { map_x: 57, map_y: 53 },
  "lancer":           { map_x: 63, map_y: 53 },
  // Tyre demo: between car stalls
  "tyre":             { map_x: 60, map_y: 56 },
  // BMW / Mahindra sponsored stalls: eastern corridor
  "bmw":              { map_x: 68, map_y: 50 },
  "mahindra":         { map_x: 72, map_y: 52 },
};

// longest key first so "go-kart parking" wins over "go-kart"
function defaultPositionFor(stallName: string): { map_x: number; map_y: number } | null {
  const name = stallName.toLowerCase();
  const match = Object.keys(DEFAULT_STALL_POSITIONS)
    .sort((a, b) => b.length - a.length)
    .find((key) => name.includes(key));
  return match ? (DEFAULT_STALL_POSITIONS[match] ?? null) : null;
}

export async function createBootstrapStalls(
  sessionId: string,
  stalls: { stall_name: string; max_occupancy: number; stall_number: number }[]
): Promise<void> {
  for (const s of stalls) {
    // convenience only - admin can correct via the map setup panel
    const pos = defaultPositionFor(s.stall_name);
    await sql`
      INSERT INTO bootstrap_stalls (session_id, stall_number, stall_name, max_occupancy, map_x, map_y)
      VALUES (${sessionId}, ${s.stall_number}, ${s.stall_name}, ${s.max_occupancy},
              ${pos?.map_x ?? null}, ${pos?.map_y ?? null})`;
  }
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

// map positions are percentages (0-100) from the top-left of the map image
export async function setStallMapPosition(stallId: string, x: number, y: number): Promise<void> {
  await sql`UPDATE bootstrap_stalls SET map_x = ${x}, map_y = ${y} WHERE id = ${stallId}`;
}

export async function setSessionMapImage(sessionId: string, imageUrl: string): Promise<void> {
  await sql`UPDATE bootstrap_sessions SET map_image_url = ${imageUrl} WHERE id = ${sessionId}`;
}

// -------------------------------------------------------------- volunteers

export async function createBootstrapVolunteers(
  sessionId: string,
  count: number
): Promise<VolunteerCredential[]> {
  const credentials: VolunteerCredential[] = Array.from({ length: count }, (_, i) => ({
    username: `vol-${i + 1}`,
    password: generatePassword(),
    display_name: `Volunteer ${i + 1}`,
  }));
  for (const c of credentials) {
    const hash = await bcrypt.hash(c.password, 10);
    await sql`
      INSERT INTO bootstrap_volunteers (session_id, username, password_hash, display_name)
      VALUES (${sessionId}, ${c.username}, ${hash}, ${c.display_name})`;
  }
  return credentials; // plain passwords - returned ONCE, only hashes are stored
}

export async function getBootstrapVolunteers(sessionId: string): Promise<BootstrapVolunteer[]> {
  const rows = await sql`
    SELECT v.id, v.session_id, v.username, v.display_name,
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
    SELECT v.id, v.session_id, v.username, v.display_name,
           (v.current_session_token IS NOT NULL) AS is_active,
           v.suggested_stall_id, st.stall_name AS suggested_stall_name
    FROM bootstrap_volunteers v
    JOIN bootstrap_sessions s ON s.id = v.session_id
    LEFT JOIN bootstrap_stalls st ON st.id = v.suggested_stall_id
    WHERE v.current_session_token = ${token} AND s.is_active = true
    LIMIT 1`;
  return (rows[0] as BootstrapVolunteer) ?? null;
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
