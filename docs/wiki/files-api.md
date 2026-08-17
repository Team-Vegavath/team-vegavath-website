# API Routes

_Current as of Session 72D (2026-08-12). This per-handler reference was written
against an earlier snapshot and does not yet cover every handler added since:
`/api/admin/accounts/me`, `/api/admin/posts` (+ `[id]`), `/api/admin/team/reorder`,
`/api/admin/events/[id]/registrations/[regId]`,
`/api/admin/bootstrap/sessions/[id]/stalls`,
`/api/admin/bootstrap/volunteers/[id]/{assign,reset-code,switch-request}`,
`/api/bootstrap/switch-request`, `/api/events/[slug]/register`, and
`/api/docs/auth`. **`docs/wiki/routes.md` is complete and verified against the
filesystem (all 60 API routes), so treat it as authoritative for the
inventory** and this file as the deeper per-handler notes.

Standing rule for any handler added here: a mutating admin route needs the
`isViewer` write guard immediately after the `isAdmin` check. Omitting it is a
silent privilege escalation, not a build error._

Per-handler reference for every `route.ts` under `src/app/api`, documented
from source. Each entry lists the exact auth check, request/response
shapes, and status codes as they appear in the code. For a flat one-line
index of every route see routes.md; this file is the detailed companion.

Auth is enforced in two independent ways across these files:
- **Admin session** -- `const session = await auth()` then
  `if (!session?.user?.isAdmin) return 401`. Middleware also guards
  `/api/admin/*`, but every admin route re-checks in-route (kept
  deliberately). Some also require `session.user.isGodfather`.
- **Volunteer cookie** -- `getVolunteerFromCookie()` resolves the
  `vg_vol_session` httpOnly cookie to a volunteer row; null means 401.
  This is the Bootstrap event system and is fully separate from the
  admin session.

Public routes carry no auth at all; each public entry states why that is
safe.

---

# Shared helper -- volunteer-auth.ts

File: src/app/api/bootstrap/volunteer-auth.ts. Not an HTTP route -- the
cookie helper every Bootstrap volunteer route imports.

**`export const VOLUNTEER_COOKIE = "vg_vol_session"`**
The cookie name. Imported by login (to set it), logout (to delete it),
and every volunteer-cookie route (to read it).

**`export async function getVolunteerFromCookie(): Promise<BootstrapVolunteer | null>`**
Awaits `cookies()`, reads `VOLUNTEER_COOKIE`. Returns `null` immediately
when the cookie is absent. Otherwise delegates to
`getVolunteerByToken(token)` (from src/lib/services/bootstrap) and returns
whatever that resolves to -- a `BootstrapVolunteer` when the token maps to
a live claimed session, else null. The service lookup is what joins the
volunteer to the active session, so callers treat a non-null return as
"logged in against the current active session".

---

# Public API

These five carry no auth. They are read-only GETs of already-public
content (events, gallery, sponsors, team) or the recruitment intake form
(`/api/join`). The security boundary is that they only ever expose data
the public site already renders, and writes are limited to the single
join form, which is rate-limited by a honeypot field, a server-side
recruitment-open gate, and strict field validation before any row is
created. All list queries carry a LIMIT in the service layer.

## GET /api/events

**Auth:** Public -- no session check. Safe because it returns only the
public events list already shown on `/events`.
**Purpose:** Fetch the public events list, optionally filtered by status.

**Query/params:**
- `status` (string, optional) -- `"upcoming"` routes to `getUpcomingEvents`, `"past"` routes to `getPastEvents`; any other/absent value falls through to `getEvents`.
- `limit` (int, optional) -- defaults to 20 (`parseInt` of the param).

**Response (2xx):** `200` JSON array of event rows.
**Response (4xx/5xx):** `500` `{ error: "Failed to fetch events" }` on any thrown error.

**Notes:** `export const dynamic = "force-dynamic"`. Calls
`getEvents` / `getUpcomingEvents` / `getPastEvents` from
src/lib/services/events.

## GET /api/gallery

**Auth:** Public -- returns only gallery content already shown on `/gallery`.
**Purpose:** Fetch gallery items, or the list of gallery events, or items for one event.

**Query/params:**
- `eventsOnly` (string, optional) -- `"true"` returns `getGalleryEvents()` (distinct events that have gallery items).
- `eventId` (string, optional) -- when present (and `eventsOnly` not "true"), returns `getGalleryByEvent(eventId)`.
- `limit` (int, optional) -- defaults to 30; used only for the default `getGalleryItemsLimited` path.

**Response (2xx):** `200` JSON array (shape depends on branch: gallery items or gallery-event summaries).
**Response (4xx/5xx):** `500` `{ error: "Failed to fetch gallery items" }`.

**Notes:** `dynamic = "force-dynamic"`. Services from src/lib/services/gallery.

## POST /api/join

**Auth:** Public -- this is the recruitment application intake. Abuse is
bounded by (1) a hidden `website` honeypot field that silently returns
success when filled, (2) a server-side `recruitment_open` settings gate
that 403s when recruitment is closed, and (3) strict per-field validation
before any DB write.
**Purpose:** Submit a recruitment application.

**Request body:**
- `website` (any, optional) -- honeypot; if truthy, returns `{ success: true }` without doing anything.
- `name` (string, required) -- trimmed, must be 2-100 chars.
- `email` (string, required) -- must pass `isValidEmail`.
- `domain_interest` (string, required) -- must be one of Coding, Automotives, Sponsorship, Robotics, Operations, Social Media.
- `domain_interest_2`, `domain_interest_3` (string, optional) -- if present must be a valid domain.
- `mobile_number` (string, optional) -- normalised via `normalisePhone` (strips +91/spaces); must resolve to 10 digits when supplied.
- `srn_prn` (string, optional).
- `semester` (string, optional) -- if present must be "1", "3", or "5".
- `why_join`, `value_addition`, `domain_experience` (string, optional).
- `design_portfolio_url` (string, optional) -- if present must pass `isValidUrl` (https).

**Response (2xx):** `200` `{ success: true, id }` on create; `200` `{ success: true }` on honeypot trip.
**Response (4xx/5xx):**
- `403` `{ error: "Recruitment is currently closed" }` when `recruitment_open !== "true"`.
- `400` for each failed validation (name length, invalid email, invalid domain, bad mobile, bad semester, bad portfolio URL) with a specific message.
- `500` `{ error: "Failed to submit application" }`.

**Notes:** `VALID_DOMAINS` must stay in sync with JoinClient and the
migration 004 CHECK constraint. Calls `getSetting`, `createApplication`.
`portfolio_url` is always sent as null (only `design_portfolio_url` is used).

## GET /api/sponsors

**Auth:** Public -- returns only active sponsors already shown on `/sponsors`.
**Purpose:** Fetch active sponsors.

**Response (2xx):** `200` JSON array from `getActiveSponsors()`.
**Response (4xx/5xx):** `500` `{ error: "Failed to fetch sponsors" }`.

**Notes:** `export const revalidate = 120` -- this route is ISR-cached for
120s (the only public API route that is not `force-dynamic`).

## GET /api/team

**Auth:** Public -- returns only public team members shown on `/crew`.
**Purpose:** Fetch team members, optionally by tier.

**Query/params:**
- `tier` (string, optional) -- when one of `core` / `crew` / `legacy`, returns `getMembersByTier(tier)`; otherwise returns all via `getMembers()`.

**Response (2xx):** `200` JSON array of member rows.
**Response (4xx/5xx):** `500` `{ error: "Failed to fetch team members" }`.

**Notes:** `dynamic = "force-dynamic"`. Services from src/lib/services/team.

---

# Bootstrap -- public-facing

The Bootstrap event system. Login/register/feedback/checkin are public by
design (volunteers and visitors have no admin account); the rest require
the `vg_vol_session` volunteer cookie. Middleware never touches
`/api/bootstrap/*`, so all gating shown here is in-route.

## POST /api/bootstrap/login

**Auth:** Public -- this issues the volunteer cookie. Boundary: credentials
are checked against the active session's volunteer roster with bcrypt, and
a login is single-use per session (claim fails with 409 if already in use).
**Purpose:** Log a volunteer in against the active Bootstrap session and set the session cookie.

**Request body:**
- `username` (string, required) -- trimmed + lowercased.
- `password` (string, required).

**Response (2xx):** `200` `{ ok: true, display_name }`; also sets the `vg_vol_session` cookie.
**Response (4xx/5xx):**
- `401` `{ error: "Invalid credentials" }` when username/password missing, user not found, or password wrong.
- `401` `{ error: "No active session" }` when no session is active.
- `409` `{ error: "Account in use" }` when the login is already claimed (`claimVolunteerSession` returns false).
- `500` `{ error: "Login failed" }`.

**Notes:** Generates `crypto.randomUUID()` as the session token, claims it
via `claimVolunteerSession`, then sets an httpOnly, sameSite=lax cookie
(`secure` in production) with `maxAge` 24h ("credentials are per-day").
Password check via `verifyVolunteerPassword` (bcrypt in the service).

## POST /api/bootstrap/logout

**Auth:** Volunteer cookie (best-effort) -- reads the cookie to clear the
server-side claim, but always clears the cookie and returns 200 regardless.
**Purpose:** Log out; release the claimed volunteer session.

**Response (2xx):** `200` `{ ok: true }` always (idempotent).
**Response (4xx/5xx):** none -- errors clearing the server session are logged and swallowed; the cookie is deleted either way.

**Notes:** Calls `clearVolunteerSession(volunteer.id)` only when a
volunteer resolves. Deletes `VOLUNTEER_COOKIE`.

## POST /api/bootstrap/register/stall

**Auth:** Public (S35) -- stall volunteers self-register before the event.
Boundary: registration only works while a session is active, the chosen
stall must belong to that session, and one SRN maps to one account per
session (re-registration is refused).
**Purpose:** Self-register a stall volunteer and pick a stall to manage.

**Request body:**
- `name` (string, required) -- trimmed, max 100.
- `phone` (string, required) -- normalised via `normalisePhone`; must be 10 digits.
- `srn` (string, required) -- trimmed, max 30, `[a-zA-Z0-9]` only (becomes the username).
- `stall_id` (string, required) -- must be a stall in the active session.

**Response (2xx):** `200` JSON from `registerVolunteer` (the created login/code).
**Response (4xx/5xx):**
- `400` missing fields, invalid phone, field too long, non-alphanumeric SRN, or unknown stall.
- `404` `{ error: "Registration is not open yet" }` when no active session.
- `409` `{ error: "This SRN is already registered..." }` when the SRN already exists in the session.
- `500` `{ error: "Registration failed" }`.

**Notes:** Validates the stall id against `getBootstrapStalls(session.id)`
to reject stale/forged ids. Username lookup is `srn.toLowerCase()`.

S74B: the pre-registration fallback this route used to contain (S49 -- accept the
submission into the pool whenever no session was active) has moved to
`/api/bootstrap/register/pool`. This route now 404s in that case, as documented
above and as the group route always has.

## POST /api/bootstrap/register/pool

**Auth:** Public (S74B) -- the pre-registration pool's own endpoint. **No session
boundary at all:** this is the one registration route that works whether or not a
session is active, which is the entire reason it exists. A row written here has
`session_id = NULL` (migration 021) and is claimed by
`autoAssignPoolMembers(sessionId)` when a session is next created.

**Purpose:** Pre-register for the next session and declare which role is intended.

**Request body:**
- `name` (string, required) -- trimmed, max 100.
- `phone` (string, required) -- normalised via `normalisePhone`; must be 10 digits.
- `srn` (string, required) -- `SRN_PATTERN` or `PRN_PATTERN` (S73F), becomes the username.
- `role` (string, optional) -- `"lead"` or `"stall"`. Anything else, including
  absent, is read as `"stall"`, which is what every pool row was before this route
  existed.
- `preferred_stall_name` (string, optional) -- free text, max 60. Ignored and
  stored NULL when `role = "lead"`: a lead has no stall to be matched against.

**Response (2xx):** `200` JSON from `registerVolunteer` plus `pooled: true`.
**Response (4xx/5xx):**
- `400` missing fields, invalid phone, field too long, or malformed SRN/PRN.
- `409` `{ error: "This SRN is already pre-registered..." }`.
- `500` `{ error: "Registration failed" }`.

**Notes:** No `404` -- there is no session to be missing. The duplicate check is
`getPoolVolunteerBySrn`, in application code rather than a constraint, because
`UNIQUE(session_id, username)` does not constrain rows whose `session_id` is NULL
(Postgres treats NULLs as distinct).

## POST /api/bootstrap/register/group

**Auth:** Public (S35) -- group volunteers self-register. Same boundary as
the stall variant minus the stall selection.
**Purpose:** Self-register a group (lead) volunteer into the active session.

**Request body:**
- `name` (string, required) -- trimmed, max 100.
- `phone` (string, required) -- normalised; 10 digits.
- `srn` (string, required) -- trimmed, max 30, alphanumeric only.

**Response (2xx):** `200` JSON from `registerGroupVolunteer`.
**Response (4xx/5xx):**
- `400` missing fields, invalid phone, field too long, non-alphanumeric SRN.
- `404` no active session.
- `409` SRN already registered.
- `500` `{ error: "Registration failed" }`.

**Notes:** After registering, calls `assignGroupNumbers(session.id)` --
idempotent FCFS round-robin that numbers each lead as they arrive.

## GET /api/bootstrap/stalls

**Auth:** Volunteer cookie -- `getVolunteerFromCookie()`, 401 if null.
**Purpose:** Return the stall board plus this volunteer's dashboard context.

**Response (2xx):** `200` `{ stalls, session: { map_image_url }, mySuggestion, volunteerRole, checkinToken, groupNumber, inClassroom }`.
- `volunteerRole` defaults to `"stall"` (S32, picks the dashboard view).
- `checkinToken` is the lead's stable QR token (S33); `groupNumber` FCFS (S35); `inClassroom` the S36 lead flag.
**Response (4xx/5xx):** `401` `{ error: "Unauthorized" }`; `500` `{ error: "Failed to fetch stalls" }`.

**Notes:** Runs `getBootstrapStalls(volunteer.session_id)` and
`getActiveBootstrapSession()` in parallel.

## PATCH /api/bootstrap/stalls/[id]

**Auth:** Volunteer cookie.
**Purpose:** Volunteer-facing stall state change (claim / release / queue).

**Request body:**
- `action` (string, required) -- one of `claim`, `release`, `mark_queued`, `unqueue`.
**Query/params:** `id` (route param) -- stall id.

**Response (2xx):** `200` the updated stall row.
**Response (4xx/5xx):**
- `401` unauthorized.
- `400` `{ error: "Invalid action" }` when action is not in the allowed set.
- `404` `{ error: "Stall not found" }` when the service returns null.
- `500` `{ error: "Failed to update stall" }`.

**Notes:** Calls `updateStallStatus(id, volunteer.username, action)`.
Per the source comment, `mark_queued` is cooperative (any volunteer, no
claim); `unqueue` is only UI-gated to the queuer and is not re-checked
here (a stale tap is harmless -- `array_remove` of an absent name is a
no-op).

## PATCH /api/bootstrap/classroom

**Auth:** Volunteer cookie.
**Purpose:** (S36) A group lead flips their own classroom-mode flag.

**Request body:**
- `in_classroom` (boolean, optional) -- coerced with `Boolean()`; body parse failure defaults to null -> false.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to update classroom mode" }`.

**Notes:** Calls `setClassroomMode(volunteer.id, ...)`. Classroom mode
suppresses redirect suggestions and queue actions on the lead dashboard.

## POST /api/bootstrap/feedback

**Auth:** Public -- visitor feedback, no account. Boundary: the active
session is resolved server-side (client cannot target another session),
ratings are range-validated, and any supplied stall id must belong to the
active session.
**Purpose:** Submit visitor feedback for the active session.

**Request body:**
- `overall_rating` (number, required) -- integer 1-10.
- `stall_id` (string, optional) -- must belong to the active session if given.
- `stall_rating` (number, optional) -- integer 1-5; only stored when a stall was named.
- `join_likelihood` (number, optional) -- integer 1-5.
- `memorable_stall` (string, optional) -- sliced to 200 chars.
- `suggestions` (string, optional) -- sliced to 1000 chars.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):**
- `400` bad overall rating (not int 1-10), bad stall rating, bad join likelihood, or unknown stall id.
- `404` `{ error: "No active Bootstrap session" }`.
- `500` `{ error: "Feedback failed" }`.

**Notes:** Calls `submitBootstrapFeedback`. `stallRating` is forced null
when no `stallId` is present.

## POST /api/bootstrap/checkin/[token]

**Auth:** Token-gated public (S33) -- the per-lead token in the URL is the
gate; it resolves to exactly one lead's group in the active session. No
account involved.
**Purpose:** Check a visitor into a group via the lead's QR link.

**Request body:**
- `name` (string, required) -- max 100.
- `prn` (string, required) -- max 30.
- `phone` (string, required) -- max 20.
**Query/params:** `token` (route param) -- the lead's per-lead check-in token.

**Response (2xx):** `200` `{ groupName, sessionName }`.
**Response (4xx/5xx):**
- `400` missing fields, field too long, or `{ error: "This link has no group assigned yet..." }` when `ctx.group_id` is null.
- `404` `{ error: "Invalid check-in link or no active Bootstrap session" }` when the token resolves to nothing.
- `409` `{ error: "This group is full!..." }` when `checkinVisitorToGroup` returns false (capacity reached).
- `500` `{ error: "Check-in failed" }`.

**Notes:** `getCheckinContext(token)` yields `{ session_id, group_id,
max_group_size, group_name, session_name }`; capacity is enforced inside
`checkinVisitorToGroup`.

## POST /api/bootstrap/suggestion/dismiss

**Auth:** Volunteer cookie.
**Purpose:** Dismiss the admin stall suggestion shown to this volunteer.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to dismiss suggestion" }`.

**Notes:** Calls `suggestStallToVolunteer(volunteer.id, null)` -- clearing
the suggestion by setting it to null.

---

# Admin -- Bootstrap ops

All under `/api/admin/bootstrap/*`. Every handler runs `await auth()` and
returns `401 { error: "Unauthorized" }` unless `session.user.isAdmin`.
Middleware also guards the path; the in-route check is the second layer.

## POST /api/admin/bootstrap/sessions

**Auth:** isAdmin.
**Purpose:** Create a Bootstrap session with its stalls and empty visitor groups.

**Request body:**
- `name` (string, required) -- trimmed, non-empty.
- `stalls` (array, required, >=1) -- each `{ stall_name (string, required), max_occupancy (1|2|3, required), lead_names? (string[], max 3, each <=100 chars) }`.
- `group_count` (number, optional) -- default 4; integer 1-26 (groups are lettered A-Z).
- `max_group_size` (number, optional) -- default 20; integer 1-100.

**Response (2xx):** `200` `{ session }` (S35: no volunteer accounts are created here anymore).
**Response (4xx/5xx):**
- `400` missing name/stalls, group_count out of 1-26, max_group_size out of 1-100, bad stall name/occupancy, >3 lead names, or lead name >100 chars.
- `500` `{ error: "Failed to create session" }`.

**Notes:** Calls `createBootstrapSession`, `createBootstrapStalls`
(stall_number assigned by array index+1), `createBootstrapGroups`.
`lead_names` are informational only now (no accounts created).

## GET /api/admin/bootstrap/sessions/[id]

**Auth:** isAdmin.
**Purpose:** Live admin dashboard poll -- stalls + volunteers + groups in one request.
**Query/params:** `id` (route param) -- session id.

**Response (2xx):** `200` `{ stalls, volunteers, groups }` (three parallel service calls).
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to fetch session" }`.

## DELETE /api/admin/bootstrap/sessions/[id]

**Auth:** isAdmin.
**Purpose:** Delete an inactive session (stalls + volunteers cascade).
**Query/params:** `id` (route param).

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: <message> }` -- the service throws (e.g. refusing to delete an active session) and the message is surfaced with a 400.

## PATCH /api/admin/bootstrap/sessions/[id]/active

**Auth:** isAdmin.
**Purpose:** Mark a session active/inactive.

**Request body:**
- `is_active` (boolean) -- coerced with `Boolean()`.
**Query/params:** `id` (route param).

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to update session" }`.

**Notes:** Calls `setSessionActive` (the service enforces a single active session).

## GET /api/admin/bootstrap/sessions/[id]/feedback

**Auth:** isAdmin.
**Purpose:** Feedback summary -- totals, per-stall averages, recent comments.
**Query/params:** `id` (route param).

**Response (2xx):** `200` the summary object from `getBootstrapFeedbackSummary`.
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to fetch feedback" }`.

## POST /api/admin/bootstrap/sessions/[id]/groups

**Auth:** isAdmin.
**Purpose:** Ensure N groups exist, then round-robin all unassigned visitors across them.

**Request body:**
- `count` (number, required) -- integer 1-26.
**Query/params:** `id` (route param).

**Response (2xx):** `200` `{ ok: true, assigned }` (`assigned` = number of visitors distributed).
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "count must be 1-26" }`; `500` `{ error: "Failed to create groups" }`.

**Notes:** Calls `createBootstrapGroups` then `assignUnassignedVisitors`.

## PATCH /api/admin/bootstrap/sessions/[id]/map

**Auth:** isAdmin.
**Purpose:** Set the session's campus-map image URL.

**Request body:**
- `map_image_url` (string, required) -- trimmed, must be non-empty.
**Query/params:** `id` (route param).

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "map_image_url required" }`; `500` `{ error: "Failed to set map image" }`.

**Notes:** Calls `setSessionMapImage`. The only check is non-empty -- the
value is stored as-is (no URL/host validation), so it trusts the admin to
paste a valid https R2 URL.

## POST /api/admin/bootstrap/sessions/[id]/summarize

**Auth:** isAdmin.
**Purpose:** Generate an AI admin summary of a session's feedback via Gemini.
**Query/params:** `id` (route param).

**Response (2xx):** `200` `{ summary, responseCount, avgOverall, avgJoin }`.
**Response (4xx/5xx):**
- `401` unauthorized.
- `404` `{ error: "No feedback to summarize" }` when there are no feedback rows.
- `503` `{ error: "GEMINI_API_KEY not configured" }` when the env var is missing.
- `502` `{ error: "Gemini API error" }` (upstream non-OK) or `{ error: "Empty response from Gemini" }`.
- `500` `{ error: "Summary failed" }`.

**Notes:** Reads raw rows via `getBootstrapFeedbackRaw`, computes
avgOverall/avgJoin locally, then POSTs a hand-built prompt to
`gemini-1.5-flash:generateContent` (`GEMINI_API_KEY`, maxOutputTokens
1024, temperature 0.3). The only route that calls an external AI API.

## GET /api/admin/bootstrap/sessions/[id]/visitors

**Auth:** isAdmin.
**Purpose:** Full visitor list for a session, newest first, with group names.
**Query/params:** `id` (route param).

**Response (2xx):** `200` `{ visitors }`.
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to fetch visitors" }`.

## PATCH /api/admin/bootstrap/groups/[id]/lead

**Auth:** isAdmin.
**Purpose:** Assign or clear a group's lead.

**Request body:**
- `lead_id` (string | null) -- must be a string or null; null clears the lead.
**Query/params:** `id` (route param) -- group id.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "lead_id must be a string or null" }`; `500` `{ error: "Failed to assign lead" }`.

## PATCH /api/admin/bootstrap/stalls/[id]

**Auth:** isAdmin.
**Purpose:** Admin override of a stall's status and occupants (no conflict check).

**Request body:**
- `status` (string, required) -- one of `free`, `occupied`, `queued`.
- `claimed_by` (string[] or string, optional) -- joined to a comma string; forced to `""` when status is `free`.
- `queued_by` (string, optional) -- passed through; the service clears it when status is `free`.
**Query/params:** `id` (route param).

**Response (2xx):** `200` the updated stall row.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "Invalid status" }`; `404` `{ error: "Stall not found" }`; `500` `{ error: "Failed to update stall" }`.

**Notes:** Calls `updateStallStatus(id, claimedBy, "override", status, queuedBy)`.
This is the admin twin of the volunteer PATCH -- same service, `"override"`
mode bypasses the claim/queue rules.

## PATCH /api/admin/bootstrap/stalls/[id]/position

**Auth:** isAdmin.
**Purpose:** Set (or clear) a stall's map pin position as percentages.

**Request body:**
- `map_x`, `map_y` (number | null) -- both null clears the pin (S33); otherwise finite numbers 0-100.
**Query/params:** `id` (route param).

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "map_x and map_y must be numbers between 0 and 100" }`; `500` `{ error: "Failed to set stall position" }`.

**Notes:** Calls `setStallMapPosition`.

## PATCH /api/admin/bootstrap/volunteers/[id]/role

**Auth:** isAdmin.
**Purpose:** Change a volunteer's role.

**Request body:**
- `role` (string, required) -- must be `"stall"` or `"lead"`.
**Query/params:** `id` (route param) -- volunteer id.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "role must be 'stall' or 'lead'" }`; `500` `{ error: "Failed to set role" }`.

## PATCH /api/admin/bootstrap/volunteers/[id]/suggest

**Auth:** isAdmin.
**Purpose:** Set or clear a suggested stall for a volunteer.

**Request body:**
- `stall_id` (string | null) -- must be a string or null.
**Query/params:** `id` (route param) -- volunteer id.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "stall_id must be a string or null" }`; `500` `{ error: "Failed to set suggestion" }`.

**Notes:** Same service (`suggestStallToVolunteer`) the public dismiss
route uses with null.

## PATCH /api/admin/bootstrap/volunteers/[id]/unlock

**Auth:** isAdmin.
**Purpose:** Release a volunteer's claimed login so they can log in again.
**Query/params:** `id` (route param) -- volunteer id.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to unlock volunteer" }`.

**Notes:** Calls `clearVolunteerSession(id)` -- the same clear that logout
performs, done by an admin on the volunteer's behalf.

---

# Admin -- general content and config

All under `/api/admin/*`. Every handler re-checks `session.user.isAdmin`
in-route (401 otherwise), except the two token-gated routes noted below
which have no session check because middleware exempts them.

## GET /api/admin/events

**Auth:** isAdmin.
**Purpose:** List events for the admin manager (LIMIT 100).

**Response (2xx):** `200` JSON array (`getEvents({ limit: 100 })`).
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to fetch events" }`.

## POST /api/admin/events

**Auth:** isAdmin.
**Purpose:** Create an event.

**Request body:** Event fields (spread into `createEvent`); `slug` optional -- when absent, derived via `slugify(body.title)`.

**Response (2xx):** `201` the created event.
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to create event" }`.

**Notes:** The body is passed straight to `createEvent` with no category
validation. This is the surface of the known `hackathons` category bug --
the admin EventForm offers a `hackathons` category that the DB CHECK
constraint rejects, so creating one surfaces here as a generic
`500 Failed to create event`. Flagged in CLAUDE.md; needs a constraint
change, do not fix unprompted.

## PATCH /api/admin/events

**Auth:** isAdmin.
**Purpose:** Update an event.

**Request body:**
- `id` (string, required) -- 400 if missing.
- ...`input` (remaining fields) -- passed to `updateEvent`.

**Response (2xx):** `200` the updated event.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to update event" }`.

## DELETE /api/admin/events

**Auth:** isAdmin.
**Purpose:** Archive (soft-delete) or permanently delete an event.

**Query/params:**
- `id` (query, required) -- 400 if missing.
- `permanent` (query, optional) -- `"true"` hard-deletes via inline SQL; otherwise `archiveEvent`.

**Response (2xx):** `200` `{ success: true }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to archive event" }`.

**Notes:** The `permanent === "true"` branch runs
`sql\`DELETE FROM events WHERE id = ${id}\`` inline in the route -- one of
the few places raw SQL sits outside the service layer.

## GET /api/admin/gallery

**Auth:** isAdmin.
**Purpose:** List gallery items for the manager (LIMIT 200).

**Response (2xx):** `200` array. **Response (4xx/5xx):** `401`; `500` `{ error: "Failed to fetch gallery" }`.

## POST /api/admin/gallery

**Auth:** isAdmin.
**Purpose:** Create a gallery item.

**Request body:** gallery-item fields passed to `createGalleryItem`.
**Response (2xx):** `201` the created item. **Response (4xx/5xx):** `401`; `500` `{ error: "Failed to create gallery item" }`.

## DELETE /api/admin/gallery

**Auth:** isAdmin.
**Purpose:** Delete a gallery item.
**Query/params:** `id` (query, required) -- 400 if missing.
**Response (2xx):** `200` `{ success: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to delete gallery item" }`.

## GET /api/admin/sponsors

**Auth:** isAdmin.
**Purpose:** List all sponsors (`getSponsors`).
**Response (2xx):** `200` array. **Response (4xx/5xx):** `401`; `500` `{ error: "Failed to fetch sponsors" }`.

## POST /api/admin/sponsors

**Auth:** isAdmin.
**Purpose:** Create a sponsor.
**Request body:** sponsor fields passed to `createSponsor`.
**Response (2xx):** `201` the created sponsor. **Response (4xx/5xx):** `401`; `500` `{ error: "Failed to create sponsor" }`.

## PATCH /api/admin/sponsors

**Auth:** isAdmin.
**Purpose:** Update a sponsor, or toggle its active flag.

**Request body:**
- `id` (string, required) -- 400 if missing.
- `is_active` (boolean, optional) -- when it is the only field besides `id`, calls `toggleSponsorActive` and returns `{ success: true }`.
- ...`input` -- otherwise passed to `updateSponsor`.

**Response (2xx):** `200` the updated sponsor, or `{ success: true }` for a toggle.
**Response (4xx/5xx):** `401`; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to update sponsor" }`.

## DELETE /api/admin/sponsors

**Auth:** isAdmin.
**Purpose:** Delete a sponsor.
**Query/params:** `id` (query, required).
**Response (2xx):** `200` `{ success: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to delete sponsor" }`.

**Notes:** Deletes via inline `sql\`DELETE FROM sponsors WHERE id = ${id}\``
in the route (raw SQL outside the service layer).

## GET /api/admin/team

**Auth:** isAdmin.
**Purpose:** List team members (`getMembers`).
**Response (2xx):** `200` array. **Response (4xx/5xx):** `401`; `500` `{ error: "Failed to fetch members" }`.

## POST /api/admin/team

**Auth:** isAdmin.
**Purpose:** Create a team member.
**Request body:** member fields passed to `createMember`.
**Response (2xx):** `201` the created member. **Response (4xx/5xx):** `401`; `500` `{ error: "Failed to create member" }`.

## PATCH /api/admin/team

**Auth:** isAdmin.
**Purpose:** Update a member, or toggle its active flag.

**Request body:**
- `id` (string, required) -- 400 if missing.
- `is_active` (boolean, optional) -- when the only field besides `id`, calls `toggleMemberActive` and returns `{ success: true }`.
- ...`input` -- otherwise passed to `updateMember`.

**Response (2xx):** `200` updated member, or `{ success: true }` for a toggle.
**Response (4xx/5xx):** `401`; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to update member" }`.

## DELETE /api/admin/team

**Auth:** isAdmin.
**Purpose:** Delete a member.
**Query/params:** `id` (query, required).
**Response (2xx):** `200` `{ success: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to delete member" }`.

## POST /api/admin/upload

**Auth:** isAdmin -- checked inside the try block.
**Purpose:** Upload a file to Cloudflare R2.

**Request body:** `multipart/form-data`:
- `file` (File, required).
- `path` (string, required) -- the R2 object key.

**Response (2xx):** `200` `{ url: "<R2_PUBLIC_URL>/<path>" }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "Missing file or path" }`; `500` `{ error: <message> }`.

**Notes:** `dynamic = "force-dynamic"`. Uses `PutObjectCommand` against
`R2_BUCKET` with `CacheControl: "public, max-age=31536000, immutable"` --
so the caller must pass a unique (timestamped) key; overwriting an
existing key is a documented gotcha. Contains a `void redirect;`
no-op line to keep an import present without changing behavior.

## GET /api/admin/settings

**Auth:** isAdmin.
**Purpose:** Read all settings plus recent applications in one call.
**Response (2xx):** `200` `{ settings, applications }` (`getAllSettings` + `getApplications({ limit: 50 })` in parallel).
**Response (4xx/5xx):** `401`; `500` `{ error: "Failed to fetch settings" }`.

## PATCH /api/admin/settings

**Auth:** isAdmin.
**Purpose:** Update settings, or (overloaded) update one application's status.

**Request body:**
- `applicationId` + `status` -- if both present, calls `updateApplicationStatus` and returns early. (This route doubles as an application-status updater.)
- Otherwise any of the whitelisted keys: `recruitment_open`, `maintenance_mode`, `maintenance_message`, `contact_email`, `contact_phone`, `contact_address`, `instagram_url`, `linkedin_url`, `github_url` -- each present key is written via `setSetting` (stringified). Keys outside the whitelist are ignored.

**Response (2xx):** `200` `{ success: true }`.
**Response (4xx/5xx):** `401`; `500` `{ error: "Failed to update settings" }`.

## POST /api/admin/import/team

**Auth:** isAdmin.
**Purpose:** Bulk-import team members from pasted CSV text.

**Request body:** raw CSV text (`req.text()`), not JSON. Header row must be exactly `name,role,tier,domain,quote,linkedin_url,github_url,display_order`. Max 500 data rows.

**Response (2xx):** `200` `{ inserted, skipped, validationErrors }`.
**Response (4xx/5xx):**
- `401` unauthorized.
- `400` empty file, fewer than 2 rows, wrong header, or too many rows.
- `422` `{ error: "Validation failed", details: [...] }` when every row failed validation.
- `500` `{ error: "Import failed" }`.

**Notes:** Custom character-level CSV parser (handles quoted commas and
newlines). Validates `tier` against core/crew/legacy and `domain` against
a 7-value list matching migration 001 CHECK constraints. Rows that fail
validation are collected in `validationErrors`; valid rows still import
via `createMembersBulk` (partial success is allowed as long as at least
one row is valid).

## POST /api/admin/register

**Auth:** Token-gated public -- NO session check. Middleware exempts this
path; the one-time invite token in the body is the gate. Boundary: the
`(token, nameSlug)` pair must resolve to a live, unused invite via
`getInviteToken`, and `submitRegistration` re-validates the token
atomically (returns false if consumed).
**Purpose:** Complete new-admin registration from an invite link.

**Request body:**
- `token`, `nameSlug` (string, required) -- the invite pair from the URL.
- `username` (string, required) -- trimmed + lowercased.
- `displayName`, `email`, `mobile` (string, required).
- `password` (string, required) -- min 8 chars.
- `confirmPassword` (string, required) -- must equal `password`.

**Response (2xx):** `200` `{ ok: true, message: "Request submitted. Awaiting admin approval." }`.
**Response (4xx/5xx):**
- `400` missing fields, password mismatch, password <8, invalid/expired/used invite (from either `getInviteToken` or `submitRegistration`).
- `500` `{ error: "Registration failed" }`.

**Notes:** Password hashed with `bcrypt.hash(password, 10)` before
`submitRegistration`. The account is created in a pending state -- it
still needs godfather approval (see accounts/[id]/approve).

## GET /api/admin/milestones

**Auth:** isAdmin.
**Purpose:** List about-page milestones.
**Response (2xx):** `200` `{ milestones }`. **Response (4xx/5xx):** `401`; `500` `{ error: "Failed to load milestones" }`.

## POST /api/admin/milestones

**Auth:** isAdmin.
**Purpose:** Create a milestone.
**Request body:** `date_label`, `title`, `description` (string, required, trimmed non-empty), `sort_order` (number, must be finite).
**Response (2xx):** `200` `{ milestone }`. **Response (4xx/5xx):** `401`; `400` `{ error: "All fields are required" }`; `500` `{ error: "Failed to create milestone" }`.

## DELETE /api/admin/milestones

**Auth:** isAdmin.
**Purpose:** Delete a milestone.
**Query/params:** `id` (query, required).
**Response (2xx):** `200` `{ ok: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "Missing id" }`; `500` `{ error: "Failed to delete milestone" }`.

## PATCH /api/admin/milestones/[id]

**Auth:** isAdmin.
**Purpose:** Update a single milestone.
**Request body:** `date_label`, `title`, `description` (required, trimmed), `sort_order` (finite number).
**Query/params:** `id` (route param).
**Response (2xx):** `200` `{ milestone }` (or `null` if the update returned no row).
**Response (4xx/5xx):** `401`; `400` `{ error: "All fields are required" }`; `500` `{ error: "Failed to update milestone" }`.

## POST /api/admin/credentials/reset

**Auth:** Token-gated public -- NO session check. Middleware exempts this
path; the one-time reset token in the body is the gate. Boundary:
`usePasswordResetToken` validates and consumes the token atomically, so a
missing/expired/used token can never set a password.
**Purpose:** Set a new password from a reset link.

**Request body:**
- `token` (string, required) -- from the reset URL.
- `password` (string, required) -- min 8.
- `confirmPassword` (string, required) -- must equal `password`.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):**
- `400` missing fields, mismatch, password <8, or `{ error: "Reset link is invalid, expired, or already used" }` when the service throws `"Invalid or expired token"`.
- `500` `{ error: "Password reset failed" }`.

**Notes:** Password hashing happens inside `usePasswordResetToken` (the
service), not the route.

---

# Admin -- applications

All under `/api/admin/applications/*`; every handler re-checks isAdmin
(401 otherwise).

## GET /api/admin/applications

**Auth:** isAdmin.
**Purpose:** List recruitment applications, optionally by status (LIMIT 200).
**Query/params:** `status` (query, optional) -- must be in `APPLICATION_STATUSES` if given.
**Response (2xx):** `200` array. **Response (4xx/5xx):** `401`; `400` `{ error: "Invalid status" }`; `500` `{ error: "Failed to fetch applications" }`.

## DELETE /api/admin/applications

**Auth:** isAdmin.
**Purpose:** Delete an application.
**Query/params:** `id` (query, required).
**Response (2xx):** `200` `{ success: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to delete application" }`.

## PATCH /api/admin/applications/[id]/status

**Auth:** isAdmin.
**Purpose:** Update one application's status.
**Request body:** `status` (string, required) -- must be in `APPLICATION_STATUSES`.
**Query/params:** `id` (route param).
**Response (2xx):** `200` `{ success: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "Invalid status" }`; `500` `{ error: "Failed to update status" }`.

## PATCH /api/admin/applications/[id]/group

**Auth:** isAdmin.
**Purpose:** Assign or clear an application's interview group.
**Request body:** `group` (string | null) -- null clears; otherwise must be in `INTERVIEW_GROUPS`.
**Query/params:** `id` (route param).
**Response (2xx):** `200` `{ success: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "Invalid group" }`; `500` `{ error: "Failed to update group" }`.

## POST /api/admin/applications/bulk-status

**Auth:** isAdmin.
**Purpose:** Set status on many applications at once.
**Request body:** `ids` (string[], required, non-empty after filtering to strings), `status` (string, required, in `APPLICATION_STATUSES`).
**Response (2xx):** `200` `{ success: true, updated: <count> }`.
**Response (4xx/5xx):** `401`; `400` `{ error: "No ids provided" }` or `{ error: "Invalid status" }`; `500` `{ error: "Bulk update failed" }`.

## GET /api/admin/applications/export

**Auth:** isAdmin.
**Purpose:** Export applications as a downloadable CSV (LIMIT 500).
**Query/params:** `status` (query, optional) -- filters the export.
**Response (2xx):** `200` CSV body; `Content-Type: text/csv; charset=utf-8`; `Content-Disposition: attachment; filename="vegavath-applications-<ts>.csv"`.
**Response (4xx/5xx):** `401` unauthorized. No explicit try/catch -- a service throw would surface as an unhandled 500.

**Notes:** RFC-4180 escaping via `esc()` (every field quoted, embedded
quotes doubled). Dates formatted `en-IN`. 15 columns.

## POST /api/admin/applications/auto-assign-groups

**Auth:** isAdmin.
**Purpose:** Round-robin every interview applicant without a panel into A..N.
**Request body:** `panel_count` (number, required) -- must be 1, 2, 3, or 4.
**Response (2xx):** `200` `{ assigned }`. **Response (4xx/5xx):** `401`; `400` `{ error: "panel_count must be 1-4" }`; `500` `{ error: "Auto-assign failed" }`.

---

# Admin -- accounts

Account management. The list read requires only isAdmin; every mutation
(delete, invite, approve, reject, reset-token) additionally requires
`session.user.isGodfather`.

## GET /api/admin/accounts

**Auth:** isAdmin.
**Purpose:** List admin accounts and pending access requests.
**Response (2xx):** `200` `{ accounts, pending }` -- service selects never include `password_hash` / `pending_password_hash`.
**Response (4xx/5xx):** `401`; `500` `{ error: "Failed to load accounts" }`.

## DELETE /api/admin/accounts

**Auth:** godfather-only -- isAdmin check returns 401; a non-godfather admin gets `403 { error: "Only the godfather can delete accounts" }`.
**Purpose:** Delete an admin account, refusing the last one.
**Query/params:** `id` (query, required).
**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` (not admin); `403` (admin but not godfather); `400` `{ error: "Missing id" }` or `{ error: "Cannot delete the last admin account" }` (when `countAdminAccounts() <= 1`); `500` `{ error: "Failed to delete account" }`.

**Notes:** This is the only account route that returns a distinct `403`
for the non-godfather case. The invite/approve/reject/reset-token routes
below fold both "not admin" and "not godfather" into a single `401`.

## POST /api/admin/accounts/invite

**Auth:** godfather-only -- `if (!isAdmin || !isGodfather) return 401`.
**Purpose:** Create a one-time invite link for a new admin.
**Request body:** `inviteeName` (string, required) -- must contain at least one alphanumeric char (so the slug is non-empty).
**Response (2xx):** `200` `{ url: "<origin>/admin/invite/<slug>/<token>" }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "Invitee name is required" }`; `500` `{ error: "Failed to create invite" }`.

**Notes:** `createInviteToken` returns `{ token, slug }`; the route builds
the full URL from `req.nextUrl.origin`.

## POST /api/admin/accounts/[id]/approve

**Auth:** godfather-only -- `if (!isAdmin || !isGodfather) return 401`.
**Purpose:** Approve a pending registration and create the real admin account.
**Query/params:** `id` (route param) -- the invite id.
**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):**
- `401` unauthorized.
- `400` `{ error: "No pending request for this id" }` when the invite is missing, not `pending_approval`, or missing pending username/display name/password hash.
- `500` `{ error: "Failed to approve (username may already exist)" }`.

**Notes:** Reads the invite via `getInviteById`, then
`createAdminAccount(pending_username, pending_display_name,
pending_password_hash, pending_mobile)` and marks the invite `approved`.
The password hash was already computed at registration time.

## POST /api/admin/accounts/[id]/reject

**Auth:** godfather-only.
**Purpose:** Reject a pending registration.
**Query/params:** `id` (route param).
**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401`; `400` `{ error: "No pending request for this id" }` (missing or not `pending_approval`); `500` `{ error: "Failed to reject" }`.

## POST /api/admin/accounts/[id]/reset-token

**Auth:** godfather-only.
**Purpose:** Generate a password-reset link for an existing account.
**Query/params:** `id` (route param) -- account id.
**Response (2xx):** `200` `{ url: "<origin>/admin/<username>/credentials/<token>" }`.
**Response (4xx/5xx):** `401` unauthorized; `404` `{ error: "Account not found" }`; `500` `{ error: "Failed to create reset link" }`.

**Notes:** `createPasswordResetToken(id)` mints the token; the URL is
consumed by POST /api/admin/credentials/reset.
