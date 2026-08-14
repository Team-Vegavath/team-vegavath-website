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

// S73B (migration 027): one group waiting at one stall. Unordered waiting SET,
// never a promised position - queued_at exists for the wait timer and as a sort
// hint, and must never be rendered as an ordinal ("you are 2nd in line").
export interface StallQueueEntry {
  group_id: string;
  group_name: string;
  lead_name: string | null; // display only; null once the lead who queued is gone
  queued_at: string;
  accepted_at: string | null; // S73D advisory placement; unused in S73B
}

// S73C (migration 028): a group currently AT a stall, i.e. a visit row whose
// left_at is still NULL. There is no separate "current occupants" concept -
// this IS the visit table, filtered.
export interface StallOccupant {
  group_id: string;
  group_name: string;
  arrived_at: string;
}

export interface BootstrapStall {
  id: string;
  session_id: string;
  stall_number: number;
  stall_name: string;
  // S73B: DERIVED on read, not the raw column. See getBootstrapStalls.
  status: "free" | "occupied" | "queued";
  max_occupancy: number;
  // S73B (migration 027): how many groups may be AT this stall at once, as
  // opposed to max_occupancy, which caps volunteers standing behind it. Nothing
  // enforces it yet - the visit table that admits groups lands in S73C.
  max_groups: number;
  claimed_by: string[] | null;
  // S73B: the queue that replaced queued_by / queued_at. Always present (empty
  // array when nobody is waiting), so callers never null-check it.
  queue: StallQueueEntry[];
  // S73C: groups AT the stall right now (open visit rows). Distinct from
  // claimed_by, which is the VOLUNTEERS manning it - the two answer different
  // questions and a stall can have either without the other.
  occupants: StallOccupant[];
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
  // migration 025 (S72C) - pending stall-switch request, awaiting an admin.
  // switch_requested_stall_id IS NOT NULL is the ONLY "is there a request"
  // predicate: the FK is ON DELETE SET NULL and nulls the id alone, so a deleted
  // target leaves switch_requested_at behind. Never gate on the timestamp.
  switch_requested_stall_id?: string | null;
  switch_requested_stall_name?: string | null;
  switch_requested_at?: string | null;
  // S73B - the lead's resolved group, set only by getVolunteerByToken. This is
  // the server-side identity a queue action is scoped to; never accept it from a
  // request body. Null for stall volunteers, who have no group.
  group_id?: string | null;
}

// migration 021 - a pre-registered volunteer with no session yet (session_id NULL)
export interface PoolVolunteer {
  id: string;
  display_name: string;
  username: string;
  srn: string | null;
  phone: string | null;
  preferred_stall_name: string | null;
  login_code: string | null; // S55C - plaintext, same deal as BootstrapVolunteer
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
    // S73B - optional so existing callers and older seed data keep working; the
    // column's own DEFAULT 1 is the same answer.
    max_groups?: number;
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
      INSERT INTO bootstrap_stalls (session_id, stall_number, stall_name, max_occupancy, max_groups, map_x, map_y, lead_names)
      VALUES (${sessionId}, ${s.stall_number}, ${s.stall_name}, ${s.max_occupancy},
              ${s.max_groups ?? 1},
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
  maxOccupancy: number,
  maxGroups = 1
): Promise<BootstrapStall | null> {
  const maxRows = await sql`
    SELECT COALESCE(max(stall_number), 0)::int AS n
    FROM bootstrap_stalls WHERE session_id = ${sessionId}`;
  const nextNumber = (maxRows[0] as { n: number }).n + 1;
  const pos = defaultPositionFor(stallName);
  const rows = await sql`
    INSERT INTO bootstrap_stalls
      (session_id, stall_number, stall_name, max_occupancy, max_groups, map_x, map_y)
    VALUES
      (${sessionId}, ${nextNumber}, ${stallName}, ${maxOccupancy}, ${maxGroups},
       ${pos?.map_x ?? null}, ${pos?.map_y ?? null})
    RETURNING id`;
  // S73B: re-read through selectStalls rather than RETURNING *, so the row handed
  // to the admin table carries the derived status and the (empty) queue array
  // that every other stall row has. Without this the newly added stall would be
  // the one row in the table with `queue` undefined.
  const id = (rows[0] as { id: string }).id;
  return getStallById(id, sessionId);
}

// Refuses to delete a stall someone is currently standing at - the admin has to
// free it first, otherwise a volunteer loses their claim mid-session.
// Returns a reason instead of throwing so the route can pick 404 vs 409.
// sessionId scopes the lookup: the route is nested under a session, so a stall id
// from a different session must read as not-found rather than deleting.
//
// S72B (Section K root cause): also refuses while any volunteer is ASSIGNED to
// the stall via suggested_stall_id, not just while someone has it claimed. That
// column carries the FK `REFERENCES bootstrap_stalls(id) ON DELETE SET NULL`
// (migration 009), so deleting the stall made Postgres itself silently wipe the
// registration choice of every volunteer who picked it - they then showed as
// unassigned with no trace of why. Because the null-out is enforced in the
// SCHEMA, the only way to prevent it from application code is to never let the
// DELETE happen while assignees exist. The old application-level
// `UPDATE bootstrap_volunteers SET suggested_stall_id = NULL` that used to sit
// here is gone: it duplicated the FK, and it is now unreachable by construction.
export async function deleteStall(
  stallId: string,
  sessionId: string
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_found" | "occupied" }
  | { ok: false; reason: "assigned"; volunteers: string[] }
> {
  const rows = await sql`
    SELECT claimed_by FROM bootstrap_stalls
    WHERE id = ${stallId} AND session_id = ${sessionId} LIMIT 1`;
  if (!rows.length) return { ok: false, reason: "not_found" };
  const claimedBy = (rows[0] as { claimed_by: string[] | null }).claimed_by ?? [];
  if (claimedBy.length > 0) return { ok: false, reason: "occupied" };

  // Named, not just counted: the admin needs to know WHO to re-point before the
  // stall can go, and re-pointing is a one-tap MOVE STALL on the same screen.
  const assigned = await sql`
    SELECT display_name FROM bootstrap_volunteers
    WHERE suggested_stall_id = ${stallId}
    ORDER BY display_name ASC LIMIT 20`;
  if (assigned.length > 0) {
    return {
      ok: false,
      reason: "assigned",
      volunteers: (assigned as { display_name: string }[]).map((v) => v.display_name),
    };
  }

  await sql`DELETE FROM bootstrap_stalls WHERE id = ${stallId}`;
  return { ok: true };
}

/**
 * S73B: the ONE stall SELECT. Every read of a stall goes through here so the
 * derived `status` and the attached `queue` can never disagree between a polled
 * list and the single row a mutation hands back.
 *
 * Both filters are optional predicates rather than a built WHERE clause: the
 * neon tagged template interpolates VALUES, not SQL fragments, so a dynamic
 * clause is not expressible. Passing stallId returns exactly that stall (still
 * session-scoped when sessionId is given); passing sessionId alone returns the
 * session's list.
 *
 * `status` is DERIVED, not read from the column. Before S73B it was a written
 * column maintained by four separate branches of updateStallStatus, which is
 * what let it drift out of step with claimed_by. Now:
 *   nobody claimed        -> free
 *   claimed + queue rows  -> queued
 *   claimed, no queue     -> occupied
 * The raw column is still written (see updateStallStatus) so a human reading the
 * table in the Neon console sees something sane, but nothing reads it.
 *
 * Note the ordering: an EMPTY stall with groups still queued reads FREE, not
 * queued. That is the whole point of S73B - a released stall keeps its queue, and
 * the waiting groups need to see it go free.
 */
async function selectStalls(
  sessionId: string | null,
  stallId: string | null
): Promise<BootstrapStall[]> {
  const rows = await sql`
    SELECT st.id, st.session_id, st.stall_number, st.stall_name,
           st.max_occupancy, st.max_groups, st.claimed_by,
           st.map_x, st.map_y, st.lead_names, st.updated_at,
           CASE
             WHEN coalesce(array_length(st.claimed_by, 1), 0) = 0 THEN 'free'
             WHEN EXISTS (
               SELECT 1 FROM bootstrap_stall_queue bq2 WHERE bq2.stall_id = st.id
             ) THEN 'queued'
             ELSE 'occupied'
           END AS status,
           COALESCE((
             SELECT json_agg(
                      json_build_object(
                        'group_id',    g.id,
                        'group_name',  g.name,
                        'lead_name',   lv.display_name,
                        'queued_at',   bq.queued_at,
                        'accepted_at', bq.accepted_at
                      ) ORDER BY bq.queued_at ASC
                    )
             FROM bootstrap_stall_queue bq
             JOIN bootstrap_groups g ON g.id = bq.group_id
             LEFT JOIN bootstrap_volunteers lv ON lv.id = bq.volunteer_id
             WHERE bq.stall_id = st.id
           ), '[]'::json) AS queue,
           -- S73C: who is HERE now. left_at IS NULL is the whole predicate; no
           -- separate occupancy table exists or is wanted.
           COALESCE((
             SELECT json_agg(
                      json_build_object(
                        'group_id',   vg.id,
                        'group_name', vg.name,
                        'arrived_at', vis.arrived_at
                      ) ORDER BY vis.arrived_at ASC
                    )
             FROM bootstrap_stall_visits vis
             JOIN bootstrap_groups vg ON vg.id = vis.group_id
             WHERE vis.stall_id = st.id AND vis.left_at IS NULL
           ), '[]'::json) AS occupants
    FROM bootstrap_stalls st
    WHERE (${sessionId}::uuid IS NULL OR st.session_id = ${sessionId}::uuid)
      AND (${stallId}::uuid IS NULL OR st.id = ${stallId}::uuid)
    ORDER BY st.stall_number ASC
    LIMIT 50`;
  return rows as BootstrapStall[];
}

export async function getBootstrapStalls(sessionId: string): Promise<BootstrapStall[]> {
  return selectStalls(sessionId, null);
}

// ------------------------------------------------ stall queue (S73B, mig 027)

/**
 * A group joins a stall's queue. Idempotent: UNIQUE(stall_id, group_id) turns a
 * double-tap into a no-op rather than a duplicate row or an error.
 *
 * Every precondition is a WHERE predicate rather than a JS check, the same
 * reasoning requestStallSwitch uses - a future caller inherits the guards
 * instead of having to remember them:
 *   stall is in the caller's own session  - stops a crafted stall UUID from
 *                                           another (or a past) session
 *   group is in that same session         - same, for the group side
 *   somebody is actually at the stall     - queueing for an empty stall is
 *                                           meaningless; walk over instead
 * Returns false when any of them fails, which the route turns into a 409.
 */
export async function addToQueue(
  stallId: string,
  groupId: string,
  volunteerId: string,
  sessionId: string
): Promise<boolean> {
  const rows = await sql`
    INSERT INTO bootstrap_stall_queue (stall_id, group_id, volunteer_id)
    SELECT ${stallId}::uuid, ${groupId}::uuid, ${volunteerId}::uuid
    WHERE EXISTS (
      SELECT 1 FROM bootstrap_stalls st
      WHERE st.id = ${stallId}::uuid
        AND st.session_id = ${sessionId}::uuid
        AND coalesce(array_length(st.claimed_by, 1), 0) > 0
    )
    AND EXISTS (
      SELECT 1 FROM bootstrap_groups g
      WHERE g.id = ${groupId}::uuid AND g.session_id = ${sessionId}::uuid
    )
    ON CONFLICT (stall_id, group_id) DO NOTHING
    RETURNING id`;
  return rows.length === 1;
}

/**
 * A group leaves a stall's queue. The delete predicate is (stall_id, group_id),
 * with group_id resolved server-side from the cookie volunteer by the caller -
 * never from a request parameter, or one lead could unqueue another group.
 *
 * No status guard and no session guard: group_id is already server-resolved and
 * scoped to the caller's own session, so the worst a crafted stall_id can do is
 * delete a row this group put there itself. Deleting a queue entry that is
 * already gone is a successful no-op, which is what a stale double-tap wants.
 */
export async function removeFromQueue(stallId: string, groupId: string): Promise<void> {
  await sql`
    DELETE FROM bootstrap_stall_queue
    WHERE stall_id = ${stallId}::uuid AND group_id = ${groupId}::uuid`;
}

/**
 * S73B (Section C): live per-stall group capacity. Mirrors setStallMapPosition
 * exactly - a bare single-column UPDATE with no involvement in the status state
 * machine, because capacity is a property of the stall, not of who is standing
 * at it. The 1-10 range is enforced by migration 027's CHECK as well as by the
 * route, so a bad value fails at the database even if a caller forgets.
 *
 * LOWERING is deliberately not retroactive, matching max_occupancy's existing
 * precedent (see updateStallStatus's claim branch: the new-claimant arm is
 * guarded, the re-claim arm is not). Capacity gates new admissions; it never
 * evicts groups already at the stall.
 */
export async function setStallMaxGroups(stallId: string, n: number): Promise<void> {
  await sql`UPDATE bootstrap_stalls SET max_groups = ${n} WHERE id = ${stallId}`;
}

// ----------------------------------------------- stall visits (S73C, mig 028)

/**
 * S73C (F1): the groups a stall volunteer may name when a group arrives.
 *
 * The session's groups MINUS any that already have a visit row for this stall -
 * an anti-join against the visit table, which is the hard revisit ban made
 * visible in the UI rather than only enforced at the INSERT. Deliberately NOT
 * the queue: a group that walked up without queueing is still a legitimate
 * arrival, so the picker has to offer everyone who has not been yet.
 *
 * Queued groups sort to the top as a HINT only. They carry no priority - the
 * queue is an unordered waiting set and this ordering must never be read as a
 * turn order.
 *
 * Selects only id and name (plus the sort flag). No lead phone, no login_code -
 * same discipline getBootstrapGroups already follows.
 */
export async function getUnvisitedGroups(
  stallId: string,
  sessionId: string
): Promise<{ id: string; name: string; is_queued: boolean }[]> {
  const rows = await sql`
    SELECT g.id, g.name,
           EXISTS (
             SELECT 1 FROM bootstrap_stall_queue q
             WHERE q.stall_id = ${stallId}::uuid AND q.group_id = g.id
           ) AS is_queued
    FROM bootstrap_groups g
    WHERE g.session_id = ${sessionId}::uuid
      AND NOT EXISTS (
        SELECT 1 FROM bootstrap_stall_visits v
        WHERE v.stall_id = ${stallId}::uuid AND v.group_id = g.id
      )
    ORDER BY is_queued DESC, g.name ASC
    LIMIT 50`;
  return rows as { id: string; name: string; is_queued: boolean }[];
}

export type RecordVisitResult =
  | { ok: true }
  | { ok: false; reason: "already_here" } // idempotent re-tap, treat as success
  | { ok: false; reason: "revisited" } // hard ban: this group has been before
  | { ok: false; reason: "full" } // max_groups reached
  | { ok: false; reason: "invalid" }; // stall or group not in this session

/**
 * S73C (F2/F3): log a group arriving at a stall.
 *
 * F3's server-side validation is the WHERE clause, not a JS check against a list
 * the client sent - the client's picker is a convenience, and a crafted group_id
 * has to fail here. Same discipline as addToQueue and requestStallSwitch:
 *   stall in this session   - stops a stall UUID from another or a past session
 *   group in this session   - same on the group side
 *   capacity has room       - max_groups finally does something (S73B stored it
 *                             with nothing enforcing it). Counts OPEN visits
 *                             only, so it gates new admissions and never evicts,
 *                             mirroring max_occupancy's claim-branch precedent.
 * The UNIQUE(stall_id, group_id) handles the last two cases by conflicting.
 *
 * The follow-up SELECT runs only on the failure path, to say WHICH failure it
 * was: a conflict is either a harmless double-tap (the group is still here) or
 * the revisit ban firing (they have been and gone), and the volunteer needs a
 * different message for each.
 */
export async function recordStallVisit(
  stallId: string,
  groupId: string,
  volunteerId: string,
  sessionId: string
): Promise<RecordVisitResult> {
  const inserted = await sql`
    INSERT INTO bootstrap_stall_visits (session_id, stall_id, group_id, volunteer_id)
    SELECT ${sessionId}::uuid, ${stallId}::uuid, ${groupId}::uuid, ${volunteerId}::uuid
    WHERE EXISTS (
      SELECT 1 FROM bootstrap_stalls st
      WHERE st.id = ${stallId}::uuid
        AND st.session_id = ${sessionId}::uuid
        AND (
          SELECT count(*) FROM bootstrap_stall_visits v
          WHERE v.stall_id = st.id AND v.left_at IS NULL
        ) < st.max_groups
    )
    AND EXISTS (
      SELECT 1 FROM bootstrap_groups g
      WHERE g.id = ${groupId}::uuid AND g.session_id = ${sessionId}::uuid
    )
    ON CONFLICT (stall_id, group_id) DO NOTHING
    RETURNING id`;
  if (inserted.length === 1) return { ok: true };

  const existing = await sql`
    SELECT left_at FROM bootstrap_stall_visits
    WHERE stall_id = ${stallId}::uuid AND group_id = ${groupId}::uuid
    LIMIT 1`;
  const row = existing[0] as { left_at: string | null } | undefined;
  if (row) return { ok: false, reason: row.left_at ? "revisited" : "already_here" };

  // No conflicting row, so one of the EXISTS guards failed. Distinguish a full
  // stall (recoverable, and the common case) from a bad id (never happens
  // through the UI).
  const capacity = await sql`
    SELECT 1 FROM bootstrap_stalls st
    WHERE st.id = ${stallId}::uuid
      AND st.session_id = ${sessionId}::uuid
      AND (
        SELECT count(*) FROM bootstrap_stall_visits v
        WHERE v.stall_id = st.id AND v.left_at IS NULL
      ) >= st.max_groups
    LIMIT 1`;
  return { ok: false, reason: capacity.length === 1 ? "full" : "invalid" };
}

/**
 * S73C (G1): a group leaves. Closes the OPEN visit only - `left_at IS NULL` in
 * the predicate means a stale double-tap cannot rewrite an already-recorded
 * departure time, and the revisit ban keeps the closed row around forever.
 */
export async function closeStallVisit(stallId: string, groupId: string): Promise<void> {
  await sql`
    UPDATE bootstrap_stall_visits
    SET left_at = now()
    WHERE stall_id = ${stallId}::uuid
      AND group_id = ${groupId}::uuid
      AND left_at IS NULL`;
}

/**
 * S73C (G3): end-of-event sweep. Visits only get a left_at when somebody taps
 * RELEASE, and at the end of a real event people simply walk away, so without
 * this every still-open row stays open forever and the checklist (S73D) would
 * show those stalls as never completed.
 *
 * Deliberately an explicit admin action, not automatic logic hung off session
 * deactivation: "the session ended" and "every group has finished at every
 * stall" are different claims, and only a human should assert the second.
 * Returns how many rows were closed, matching assignUnassignedVisitors' shape.
 */
export async function sweepOpenVisits(sessionId: string): Promise<number> {
  const rows = await sql`
    UPDATE bootstrap_stall_visits
    SET left_at = now()
    WHERE session_id = ${sessionId}::uuid AND left_at IS NULL
    RETURNING id`;
  return rows.length;
}

export type StallAction = "claim" | "release" | "override";

/**
 * claim:    append username to claimed_by if not already present, status → occupied
 * release:  remove username; stall goes free when nobody is left. THE QUEUE IS
 *           NOT TOUCHED - see the branch.
 * override: admin sets status + claimed_by directly (username is a
 *           comma-separated list of usernames here, "" clears it)
 *
 * S73B: mark_queued and unqueue are GONE from this function. They no longer share
 * anything with claim/release - different table, different actor (a group lead,
 * not the stall volunteer), different grain (a group, not a username) - so they
 * are addToQueue / removeFromQueue above, called directly by the route. That
 * removed two branches from here rather than adding a groupId parameter to a
 * function that already took six.
 *
 * S72B: sessionId scopes every branch. Pass the caller's own session so a
 * volunteer cannot reach a stall belonging to a different (or past) session by
 * UUID - the route's role/ownership checks guard WHO may act, this guards WHERE.
 * Pass null ONLY from the admin override, which is deliberately unscoped.
 * Returns null when nothing matched even on re-read, so the route can 404
 * instead of the old `rows[0] as BootstrapStall` lie about an empty result.
 */
export async function updateStallStatus(
  stallId: string,
  username: string,
  action: StallAction,
  sessionId: string | null,
  status?: string // override only - every other action implies its status
): Promise<BootstrapStall | null> {
  // Nothing captures the UPDATE results: every branch below is followed by a
  // single re-read through selectStalls, because only that query can compute the
  // derived status and attach the queue.
  if (action === "claim") {
    // CASE instead of a WHERE guard so a re-claim by a volunteer already
    // in claimed_by still updates the row.
    //
    // S72B occupancy cap: the WHERE only lets a NEW claimant in while there is
    // room. The re-claim arm stays unguarded on purpose - a volunteer already in
    // claimed_by must still be able to re-tap on a full stall (that is how a
    // stale card resyncs), and it adds nobody.
    await sql`
      UPDATE bootstrap_stalls
      SET status = 'occupied',
          claimed_by = CASE
            WHEN ${username} = ANY(coalesce(claimed_by, '{}')) THEN claimed_by
            ELSE array_append(coalesce(claimed_by, '{}'), ${username})
          END,
          updated_at = now()
      WHERE id = ${stallId}
        AND (${sessionId}::uuid IS NULL OR session_id = ${sessionId}::uuid)
        AND (
          ${username} = ANY(coalesce(claimed_by, '{}'))
          OR coalesce(array_length(claimed_by, 1), 0) < max_occupancy
        )`;
  } else if (action === "release") {
    // ------------------------------------------------------------------
    // S73B: THE RELEASE FIX. This branch used to carry two CASE expressions
    // clearing queued_by / queued_at. Both are gone, and not because they were
    // narrowed again - because a release has no business touching the queue at
    // all.
    //
    // The bug those CASEs were patching: releasing a stall wiped the record of
    // who was waiting for it, so the freed-stall notification could never say
    // "your group can head over" to the group that had actually queued. S72C cut
    // it down to two cases; one of them ("the stall is going fully free") was
    // exactly the case that mattered, so the bug survived.
    //
    // The queue table is now untouched by a release regardless of who releases
    // or why. A stall going free with groups still queued is the CORRECT and
    // intended end state: selectStalls reads that as FREE with a non-empty queue,
    // which is precisely the signal the waiting leads need.
    // ------------------------------------------------------------------
    await sql`
      UPDATE bootstrap_stalls
      SET claimed_by = array_remove(coalesce(claimed_by, '{}'), ${username}),
          -- vestigial: status is derived on read (see selectStalls). Still
          -- written so the raw column stays sane for anyone reading the table
          -- directly in the Neon console.
          status = CASE
            WHEN array_length(array_remove(coalesce(claimed_by, '{}'), ${username}), 1) IS NULL
            THEN 'free' ELSE status
          END,
          updated_at = now()
      WHERE id = ${stallId}
        AND (${sessionId}::uuid IS NULL OR session_id = ${sessionId}::uuid)`;
  } else {
    // never pass a JS array as a driver param (spec rule) - build it in SQL
    //
    // S73B: the queued_by pass-through is gone. It wrote a scalar column that no
    // longer exists in any read path, and "manually mark this stall queued" has
    // no meaning once a queue entry is a real group with a real row - the admin
    // would have to pick WHICH group, which is a different control. The route
    // now accepts free/occupied only. No queue-clearing logic is left here
    // either: release stopped clearing the queue, so there is nothing for the
    // override to mirror.
    await sql`
      UPDATE bootstrap_stalls
      SET status = ${status ?? "free"},
          claimed_by = string_to_array(NULLIF(${username}, ''), ','),
          updated_at = now()
      WHERE id = ${stallId}
        AND (${sessionId}::uuid IS NULL OR session_id = ${sessionId}::uuid)`;
  }
  // Re-read through selectStalls whatever happened. Two reasons this replaced the
  // old `RETURNING *`: the mutation cannot compute the derived status or attach
  // the queue, and a guarded action that matched 0 rows (raced a state change, or
  // hit the occupancy cap) still needs to hand the caller the CURRENT row so
  // their UI resyncs instead of 404ing - which the old code needed a second query
  // to do anyway. Session-scoped, so a cross-session id reads as not-found rather
  // than leaking another session's row.
  const fresh = await selectStalls(sessionId, stallId);
  return fresh[0] ?? null;
}

/** S73B: one stall, same derived shape as the list. Session-scoped. */
export async function getStallById(
  stallId: string,
  sessionId: string | null
): Promise<BootstrapStall | null> {
  const rows = await selectStalls(sessionId, stallId);
  return rows[0] ?? null;
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
           v.login_code, v.phone, v.srn, v.group_number, v.in_classroom,
           -- S72C: the pending switch request, so the admin table can offer
           -- APPROVE / DENY on the volunteer's own row
           v.switch_requested_stall_id, v.switch_requested_at,
           rs.stall_name AS switch_requested_stall_name
    FROM bootstrap_volunteers v
    LEFT JOIN bootstrap_stalls s ON s.id = v.suggested_stall_id
    LEFT JOIN bootstrap_stalls rs ON rs.id = v.switch_requested_stall_id
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
           v.group_number, v.in_classroom,
           -- S72C: the volunteer's own pending switch request, so their dashboard
           -- can show "switch request pending" instead of offering it again
           v.switch_requested_stall_id, v.switch_requested_at,
           rst.stall_name AS switch_requested_stall_name,
           -- S73B: the lead's own group. A queue entry belongs to the GROUP, and
           -- this is the only place it is resolved for a queue action - the route
           -- never takes a group id from the request body. Same bridge
           -- getCheckinContext uses (team_lead_id, or the group_number -> "Group
           -- X" name match for a lead who is not their group's recorded lead).
           -- NULL for role 'stall' and for a lead not swept into a group yet;
           -- the route 400s on that rather than guessing.
           g.id AS group_id
    FROM bootstrap_volunteers v
    JOIN bootstrap_sessions s ON s.id = v.session_id
    LEFT JOIN bootstrap_stalls st ON st.id = v.suggested_stall_id
    LEFT JOIN bootstrap_stalls rst ON rst.id = v.switch_requested_stall_id
    LEFT JOIN bootstrap_groups g
      ON g.session_id = v.session_id
     AND v.role = 'lead'
     AND (g.team_lead_id = v.id
          OR g.name = 'Group ' || chr(64 + v.group_number))
    WHERE v.current_session_token = ${token} AND s.is_active = true
    LIMIT 1`;
  return (rows[0] as BootstrapVolunteer) ?? null;
}

export async function setVolunteerRole(
  volunteerId: string,
  role: "stall" | "lead"
): Promise<void> {
  // S55B: checkin_token is minted at registration, but ONLY by
  // registerGroupVolunteer. A volunteer promoted here would otherwise land on
  // role 'lead' with a NULL token, which means a dead QR check-in URL and a
  // getCheckinContext lookup that can never resolve them. Backfill on the way
  // up; COALESCE keeps an existing token stable across a lead -> stall -> lead
  // round trip, so an already-printed QR code survives a demotion.
  //
  // group_number is still not written HERE (assignGroupNumbers owns it, and it
  // only fills NULLs so re-activation never reshuffles anyone) - but S72B fires
  // that sweep right after the role write, see below.
  const token = randomBytes(20).toString("hex");
  const rows = await sql`
    UPDATE bootstrap_volunteers
    SET role = ${role},
        checkin_token = CASE
          WHEN ${role} = 'lead' THEN COALESCE(checkin_token, ${token})
          ELSE checkin_token
        END
    WHERE id = ${volunteerId}
    RETURNING session_id`;
  const sessionId = (rows[0] as { session_id: string | null } | undefined)?.session_id ?? null;
  // No row matched, or a pool member with no session - nothing group-shaped to do.
  if (!sessionId) return;

  if (role === "lead") {
    // S72B (Section F root cause): group_number was written by exactly two
    // callers - session activation and group SELF-registration - so a volunteer
    // promoted through this function kept group_number = NULL. That reads as
    // "Not assigned" in the admin table AND on their own dashboard, and it makes
    // getCheckinContext resolve no group at all, so their check-in QR answers
    // 400 "no group assigned yet". Idempotent (fills NULLs only), which is why
    // it is safe to fire on every promotion.
    await assignGroupNumbers(sessionId);

    // Re-promotion case: assignGroupNumbers only walks leads whose group_number
    // is NULL, so someone who kept a number from a previous stint is skipped -
    // including the team_lead_id backfill inside that loop. Without this their
    // group stays leaderless with a live QR, which is the same failure the
    // demotion branch below is cleaning up. Targeted, and a no-op when the group
    // already has a lead.
    await sql`
      UPDATE bootstrap_groups g
      SET team_lead_id = ${volunteerId}
      FROM bootstrap_volunteers v
      WHERE v.id = ${volunteerId}
        AND g.session_id = ${sessionId}
        AND g.team_lead_id IS NULL
        AND v.group_number IS NOT NULL
        AND g.name = 'Group ' || chr(64 + v.group_number)`;
    return;
  }

  // Demoted away from lead. A stall volunteer must not stay on the hook as a
  // group's team_lead_id: getCheckinContext resolves the group through it, so
  // visitors scanning that (still valid) QR would keep landing in a group whose
  // lead has walked off to a stall. group_number is left alone deliberately -
  // same reasoning as the COALESCE on checkin_token, it makes a stall -> lead
  // round trip put them back in their original group.
  await sql`
    UPDATE bootstrap_groups SET team_lead_id = NULL
    WHERE team_lead_id = ${volunteerId}`;
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

/**
 * S72C (migration 025): a stall volunteer asks to be moved to a different stall.
 *
 * Every precondition is a WHERE predicate rather than a JS check, for the same
 * reason S72B pushed session scoping down into updateStallStatus: a future caller
 * inherits the guards instead of having to remember them. Returns false when any
 * of them fails, which the route turns into a 403/400.
 *
 *   role = 'stall'          - leads have no stall to switch away from
 *   suggested_stall_id set  - an UNASSIGNED volunteer has nothing to switch FROM,
 *                             and B1 sends them to "ask an admin" instead
 *   target <> current       - requesting the stall you already hold is a no-op
 *   EXISTS (same session)   - the target must be a real stall in the volunteer's
 *                             OWN session; this is the check that stops a crafted
 *                             POST pointing at another (or a past) session's UUID
 */
export async function requestStallSwitch(
  volunteerId: string,
  stallId: string
): Promise<boolean> {
  const rows = await sql`
    UPDATE bootstrap_volunteers v
    SET switch_requested_stall_id = ${stallId},
        switch_requested_at = now()
    WHERE v.id = ${volunteerId}
      AND v.role = 'stall'
      AND v.suggested_stall_id IS NOT NULL
      AND v.suggested_stall_id <> ${stallId}::uuid
      AND EXISTS (
        SELECT 1 FROM bootstrap_stalls s
        WHERE s.id = ${stallId}::uuid AND s.session_id = v.session_id
      )
    RETURNING v.id`;
  return rows.length === 1;
}

/**
 * S72C: admin approves or denies a pending switch request.
 *
 * Read-then-write on purpose. An "approve" must produce the exact same end state
 * as the admin's existing MOVE STALL control, so it calls the same
 * suggestStallToVolunteer rather than writing suggested_stall_id itself - there
 * is one implementation of "change someone's assigned stall" and this is not a
 * second one.
 *
 * The clearing UPDATE re-asserts the id it read (not just IS NOT NULL), so if the
 * volunteer swapped their request between the read and the write the admin's tap
 * matches 0 rows and reassigns nothing, instead of approving a stall the
 * volunteer no longer wants.
 *
 * Returns false when there was no pending request - the route answers 409.
 */
export async function resolveStallSwitch(
  volunteerId: string,
  action: "approve" | "deny"
): Promise<boolean> {
  const pending = await sql`
    SELECT switch_requested_stall_id, suggested_stall_id, username, session_id
    FROM bootstrap_volunteers
    WHERE id = ${volunteerId} AND switch_requested_stall_id IS NOT NULL
    LIMIT 1`;
  const row = pending[0] as
    | {
        switch_requested_stall_id: string;
        suggested_stall_id: string | null;
        username: string;
        session_id: string | null;
      }
    | undefined;
  const targetId = row?.switch_requested_stall_id;
  if (!row || !targetId) return false;

  const cleared = await sql`
    UPDATE bootstrap_volunteers
    SET switch_requested_stall_id = NULL, switch_requested_at = NULL
    WHERE id = ${volunteerId} AND switch_requested_stall_id = ${targetId}::uuid
    RETURNING id`;
  if (cleared.length === 0) return false;

  if (action === "approve") {
    // Take them off the OLD stall first. Not in the brief, but required for the
    // reassignment to be correct: S72B's A3 gate 403s claim/release on any stall
    // other than the volunteer's assigned one, so the instant the assignment moves
    // they lose the only control that could remove them from the old stall's
    // claimed_by - and it would sit there showing OCCUPIED with a volunteer who
    // has physically walked away, clearable only by an admin override.
    //
    // Uses the same updateStallStatus release branch a volunteer's own tap does.
    // S73B: that branch no longer touches the queue at all, so the groups waiting
    // at the old stall keep their entries through an approved switch - which is
    // right, since the stall is still there and they are still waiting for it.
    if (row.suggested_stall_id) {
      await updateStallStatus(
        row.suggested_stall_id,
        row.username,
        "release",
        row.session_id
      );
    }
    await suggestStallToVolunteer(volunteerId, targetId);
  }
  return true;
}

/**
 * S72C (Section D1): username + display_name for one session's volunteers.
 * NOTHING else, and that is the entire point of the function.
 *
 * getBootstrapVolunteers must NOT be used for this. It selects login_code in
 * plaintext (S35, admin tables only), and this feeds GET /api/bootstrap/stalls,
 * which is volunteer-authenticated - reusing it would hand every volunteer every
 * teammate's password. The narrow SELECT makes that impossible rather than
 * relying on the caller to strip fields.
 *
 * Used to turn the usernames in claimed_by / queued_by (which are lowercased
 * SRNs) into human names in the release-confirmation dialog.
 */
export async function getSessionVolunteerNames(
  sessionId: string
): Promise<{ username: string; display_name: string }[]> {
  const rows = await sql`
    SELECT username, display_name FROM bootstrap_volunteers
    WHERE session_id = ${sessionId}
    ORDER BY display_name ASC LIMIT 200`;
  return rows as { username: string; display_name: string }[];
}

// S55: admin fixes a typo in a volunteer's own registration details. Works for
// pool rows and assigned rows alike -- no session_id guard.
//
// SRN writes BOTH columns. `username` is the lowercased SRN and is what the
// login lookup keys on (see registerStallVolunteer), while `srn` is the display
// copy the admin tables read. Updating one without the other would leave a
// volunteer logging in under an SRN the panel no longer shows.
//
// Deliberately NOT updatable here: login_code and password_hash. Password reset
// is its own path.
export async function updateVolunteer(
  volunteerId: string,
  data: { display_name?: string; phone?: string; srn?: string }
): Promise<void> {
  const srn = data.srn?.trim();
  await sql`
    UPDATE bootstrap_volunteers
    SET display_name = COALESCE(${data.display_name ?? null}, display_name),
        phone        = COALESCE(${data.phone ?? null}, phone),
        srn          = COALESCE(${srn ?? null}, srn),
        username     = COALESCE(${srn ? srn.toLowerCase() : null}, username)
    WHERE id = ${volunteerId}`;
}

// S55C: the password reset updateVolunteer refuses to do. Pool rows and assigned
// rows alike -- pool codes were issued at registration and get lost before the
// session even exists.
//
// BOTH columns move together: password_hash is what auth.ts compares against and
// login_code is the plaintext copy the admin tables display (S35). Writing one
// without the other leaves the panel showing a code that does not log anyone in.
// Returns null when no row matched, so the route can 404 instead of pretending.
export async function resetVolunteerLoginCode(
  volunteerId: string
): Promise<string | null> {
  const loginCode = generatePassword(8);
  const hash = await bcrypt.hash(loginCode, 10);
  const rows = await sql`
    UPDATE bootstrap_volunteers
    SET login_code = ${loginCode}, password_hash = ${hash}
    WHERE id = ${volunteerId}
    RETURNING id`;
  return rows.length > 0 ? loginCode : null;
}

// ------------------------------------- pre-registration pool (S49, mig 021)

// Volunteers who registered before any session existed. They have no session_id,
// so they cannot log in yet - an admin assigns them to a session stall first.
export async function getUnassignedVolunteers(): Promise<PoolVolunteer[]> {
  const rows = await sql`
    SELECT id, display_name, username, srn, phone, preferred_stall_name,
           login_code, created_at
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

// S55B: drop a pre-registration entry -- a duplicate, a test row, someone who
// pulled out before any session existed. A hard delete is safe HERE and only
// here: a pool row has no session, so nothing references it. The same
// session_id IS NULL guard assignVolunteerToSession uses makes that structural
// rather than a promise -- an id belonging to an already-assigned volunteer
// deletes nothing and returns false.
//
// Assigned volunteers are NOT deletable this way. They can be a group's
// team_lead_id and can have visitors checked in through their token; unpicking
// that is what deleteBootstrapSession's cascade is for.
export async function deletePoolVolunteer(volunteerId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM bootstrap_volunteers
    WHERE id = ${volunteerId} AND session_id IS NULL
    RETURNING id`;
  return rows.length === 1;
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
// whose typed preferred_stall_name matches a new stall name get pulled in
// automatically. Everyone else stays in the pool for manual assignment.
// Returns how many were assigned.
// S50: the match is normalized, not just lowercased - every non-alphanumeric
// character is stripped from both sides, so "gokart", "go kart", "GoKart",
// "go_kart" and "GO KART" all land on the "Go-Kart" stall. Volunteers type this
// field free-hand, so punctuation was the main cause of missed assignments.
export async function autoAssignPoolMembers(sessionId: string): Promise<number> {
  const rows = await sql`
    UPDATE bootstrap_volunteers v
    SET session_id = ${sessionId},
        suggested_stall_id = s.id
    FROM bootstrap_stalls s
    WHERE v.session_id IS NULL
      AND s.session_id = ${sessionId}
      AND lower(regexp_replace(trim(s.stall_name), '[^a-zA-Z0-9]', '', 'g'))
        = lower(regexp_replace(trim(v.preferred_stall_name), '[^a-zA-Z0-9]', '', 'g'))
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
  // S72C (Section J): the lead's own contact number, so the welcome screen can
  // name them and be tappable. Nullable - legacy rows predate migration 016.
  lead_phone: string | null;
  session_id: string;
  session_name: string;
  max_group_size: number;
  group_id: string | null;
  group_name: string | null;
  // S72C (Section E): bootstrap_groups.name stays "Group A" as the internal join
  // key; this is the number visitors are actually shown. Nullable, because a lead
  // resolved through g.team_lead_id may not have been swept yet.
  group_number: number | null;
  visitor_count: number;
}

export async function getCheckinContext(token: string): Promise<CheckinContext | null> {
  const rows = await sql`
    SELECT v.id AS volunteer_id, v.display_name AS lead_name,
           v.phone AS lead_phone, v.group_number,
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
