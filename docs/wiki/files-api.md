# API Routes

_Current as of Session 82C (2026-10-05). Every exported handler in every
`route.ts` under `src/app/api` (73 files) has an entry here; `routes.md` is the
one-line index of the same routes._

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

These three carry no session auth: the recruitment intake (`/api/join`),
native event registration (`/api/events/[slug]/register`), and the docs
password exchange (`/api/docs/auth`). Each entry says what bounds it. The
four read-only public GETs this section used to list (`/api/events`,
`/api/gallery`, `/api/sponsors`, `/api/team`) were deleted in S52B: they had
no callers -- every public page reads through the service layer directly --
and `/api/events` accepted an unclamped `?limit=`.

## POST /api/join

**Auth:** Public -- the recruitment application intake. Abuse is bounded by
(1) a hidden `website` honeypot that silently returns success when filled,
(2) the `recruitment_open` settings gate (403 when closed), (3) strict
per-field validation before any write, and (4) the 10-character minimum on
written answers (S81).
**Purpose:** Submit a recruitment application (the S81 / S82B form).

**Request body:**
- `website` (any) -- honeypot; truthy returns `{ success: true }` and writes nothing.
- `name` (string, required) -- trimmed, 2-100 chars. `email` (required) -- `isValidEmail`.
- `mobile_number` (optional) -- `normalisePhone`, 10 digits when given.
- `srn_prn` (optional) -- `normaliseSrnPrn`, either structure when given.
- `semester` (optional) -- "1" | "3" | "5" when given. (The form requires these three.)
- `course` (required) -- one of `COURSES`; `course_other` (required when course is
  "Other", max 200) is what gets stored in that case.
- `domain_interest` (required), `domain_interest_2`, `domain_interest_3` -- each one of
  the five current keys (`DOMAINS`): Automotives, Robotics, Coding, Social Media,
  Operations & Sponsorship. The pre-S82B "Operations" / "Sponsorship" are refused.
- `answers` (object) -- validated by `parseJoinAnswers(answers, domains)`.

**Response (2xx):** `200` `{ success: true, id }`; `200` `{ success: true }` on a honeypot trip.
**Response (4xx/5xx):**
- `403` `{ error: "Recruitment is currently closed" }`.
- `400` per failed field (name, email, domain, mobile, SRN/PRN, semester, course), or
  the first error `parseJoinAnswers` returns.
- `500` `{ error: "Failed to submit application" }` -- including a missing column if
  migration 030 / 031 were not applied.

**Notes:** `parseJoinAnswers` (src/lib/utils/joinQuestions.ts) walks
`visibleQuestions(domains, answers)` -- the SAME walk the form renders from -- so
only the general questions and the selected domains' visible questions are
read; deselected domains' answers, questions hidden by a Design / Social Media
or Automotives / Robotics checkbox, and unknown keys are dropped. Required text
must be non-empty; any filled-in written answer must be at least 10 characters
(trimmed) and at most 2000; multi-selects are filtered through their offered
options; an "Other" tick needs its text. Links: an empty link is always valid;
a filled one must pass its `LINK_RULES` check (Drive, https, Drive-or-repo, or
GitHub/GitLab profile). Writes `course` and `answers` via `createApplication`;
the pre-S81 question columns are left NULL. Domains arrive already sorted into
/join order by the client.

## POST /api/events/[slug]/register

**Auth:** Public (S47) -- native event registration, replacing the external
`registration_form_url` link.
**Purpose:** Register for an event.

**Request body:** `name` (required), `email` (required, valid), `phone`
(`normalisePhone`, 10 digits), `srn` (`normaliseSrnPrn`, S73F), `message` (optional).
**Response (2xx):** `200` `{ success: true }`.
**Response (4xx/5xx):** `404` unknown event (or a no-registration slug); `400` per
failed field; `409` `{ error: "Registration is closed for this event" }`; `409`
`{ error: "This email is already registered for this event" }` (case-insensitive
match); `500` `{ error: "Failed to register" }`.

**Notes:** Calls `getEventBySlug`, `findEventRegistrationByEmail`,
`createEventRegistration`.

## POST /api/docs/auth

**Auth:** Public -- it is the way into `/docs` (S52B).
**Purpose:** Exchange the shared docs password for the docs cookie.
**Request body:** `password` (string).
**Response (2xx):** `200` `{ ok: true }` with the cookie set.
**Response (4xx/5xx):** `400` / `401` `{ error: "Incorrect password" }`.

**Notes:** The cookie value IS the password -- no session table, no JWT;
rotating `DOCS_PASSWORD` invalidates every cookie. Middleware does not gate this
route (it starts with `/api`, not `/docs`). Threat model:
docs/superpowers/plans/2026-07-26-docs-password-gate.md.

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
- `srn` (string, required) -- `normaliseSrnPrn` (S73F): whitespace stripped, uppercased, and it must match `SRN_PATTERN` (`PES1UG21CS999`) or `PRN_PATTERN` (`PES1201912345`). Lowercased, it becomes the username.
- `stall_id` (string, required) -- must be a stall in the active session.

**Response (2xx):** `200` JSON from `registerVolunteer` (the created login/code).
**Response (4xx/5xx):**
- `400` missing fields, invalid phone ("Phone must be 10 digits, no country code"), name over 100, malformed SRN/PRN ("SRN / PRN must look like PES1UG21CS999 or PES1201912345"), or unknown stall.
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
- `srn` (string, required) -- `normaliseSrnPrn`, SRN or PRN (S73F), as for the stall route.

**Response (2xx):** `200` JSON from `registerGroupVolunteer`.
**Response (4xx/5xx):**
- `400` missing fields, invalid phone, name over 100, malformed SRN/PRN.
- `404` no active session.
- `409` SRN already registered.
- `500` `{ error: "Registration failed" }`.

**Notes:** After registering, calls `assignGroupNumbers(session.id)` --
idempotent FCFS round-robin that numbers each lead as they arrive.

## GET /api/bootstrap/stalls

**Auth:** Volunteer cookie -- `getVolunteerFromCookie()`, 401 if null.
**Purpose:** Return the stall board plus this volunteer's dashboard context.

**Response (2xx):** `200` `{ stalls, session: { map_image_url }, mySuggestion,
mySuggestionId, switchRequestStallId, switchRequestStallName, volunteerNames,
myGroupId, myGroupSize, volunteerRole, checkinToken, groupNumber, inClassroom }`.
- `stalls` -- `getBootstrapStalls`: derived status (S73B), group capacity, time limit
  (S77), occupying groups and the queue.
- `mySuggestionId` -- the volunteer's own stall id, so the client knows which stall is
  theirs (S72B). `switchRequestStall*` -- a pending switch request (S72C).
- `volunteerNames` -- username -> display name only (S72C); never login codes.
- `myGroupId` (S73B) -- the lead's own group, so the client can tell "my group is in
  this queue". Every queue mutation re-resolves it server-side.
- `myGroupSize` (S73D) -- a headcount only; names come from /api/bootstrap/roster.
- `volunteerRole` defaults to `"stall"`; `checkinToken` (S33), `groupNumber` (S35),
  `inClassroom` (S36).
**Response (4xx/5xx):** `401`; `500` `{ error: "Failed to fetch stalls" }`.

## PATCH /api/bootstrap/stalls/[id]

**Auth:** Volunteer cookie, plus role and ownership gates (S72B, S73B).
**Purpose:** Volunteer stall actions.

**Request body:**
- `action` (required) -- `claim` | `release` | `mark_queued` | `unqueue` | `accept_queued`.
- `group_id` (optional) -- which group arrived (claim) or is leaving (release).
**Query/params:** `id` (route param) -- stall id.

**Response (2xx):** `200` the updated stall.
**Response (4xx/5xx):**
- `401`; `400` `{ error: "Invalid action" }`.
- `403` "Group volunteers cannot claim or release a stall" / "You can only update the
  stall you are assigned to" (claim / release are stall-volunteer only, own stall).
- `403` "Only group leads can queue for a stall"; `400` "You have no group assigned yet".
- `404` stall not found; `409` "Nobody is at that stall right now - head over instead"
  (queueing at a free stall); `400` "Say which group is leaving" (release on a
  multi-group stall without `group_id`); `500` "Failed to update stall".

**Notes:**
- Queue actions (S73B) are LEAD-ONLY and write `bootstrap_stall_queue`; the group
  is resolved server-side from the cookie, never from the body, so one lead cannot
  queue or unqueue another's group. `accept_queued` (S73D) confirms an admin
  auto-placement; declining one is plain `unqueue`.
- Claim / release (S73C) also move a group through `bootstrap_stall_visits`: the
  visit is recorded FIRST, then the claim, so a rejected visit leaves nothing
  half-done. Claim without `group_id` is the "every group has already visited"
  escape -- the stall is marked occupied with no visit row. Release closes the
  named group's visit, and the volunteer steps off the stall only when the LAST
  group has gone. Releasing never clears the queue.
- Calls `addToQueue`, `removeFromQueue`, `acceptQueuePlacement`, `recordStallVisit`,
  `closeStallVisit`, `updateStallStatus`.

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

**Auth:** Token-gated public (S33) -- the per-lead token in the URL resolves to
exactly one lead's group in the active session. No account involved.
**Purpose:** Check a visitor into a group via the lead's QR link.

**Request body:** `name` (required, max 100), `prn` (required; SRN or PRN via
`normaliseSrnPrn`, S73F), `phone` (required; `normalisePhone`, 10 digits, S73F).
**Query/params:** `token` (route param).

**Response (2xx):** `200` `{ groupName, sessionName, visitorId }`. `visitorId` (S73D)
is the visitor's own row id, which the UI links to /bootstrap/checklist/[id].
**Response (4xx/5xx):**
- `400` missing fields, field too long, malformed SRN/PRN or phone, or "This link has
  no group assigned yet - ask an organiser".
- `404` "Invalid check-in link or no active Bootstrap session".
- `409` "This group is full! Ask a different group lead to scan you in."
- `500` "Check-in failed".

**Notes:** `getCheckinContext(token)`, then `checkinVisitorToGroup`, which enforces
capacity. Group names reach the visitor through `groupLabel` ("Group 1", S73K).

## POST /api/bootstrap/suggestion/dismiss

**Auth:** Volunteer cookie.
**Purpose:** Dismiss the admin stall suggestion shown to this volunteer.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to dismiss suggestion" }`.

**Notes:** Calls `suggestStallToVolunteer(volunteer.id, null)` -- clearing
the suggestion by setting it to null.

## GET /api/bootstrap/stalls/[id]/groups

**Auth:** Volunteer cookie; stall volunteers only, on their own stall.
**Purpose:** The groups this stall may still receive -- every group in the session
that has not visited it yet (S73C). Feeds the "which group just arrived?" picker.
**Response (2xx):** `200` `{ groups }`.
**Response (4xx/5xx):** `401`; `403` "Only stall volunteers log group arrivals" /
"You can only update the stall you are assigned to"; `500` "Failed to load groups".

**Notes:** Same gates as the claim it feeds, so the list a volunteer can see is
the list they can act on. A convenience only -- the claim re-validates the chosen
group server-side. Calls `getUnvisitedGroups`.

## GET /api/bootstrap/roster

**Auth:** Volunteer cookie; leads only (`403` "Leads only").
**Purpose:** The lead's own group roster (S73D).
**Response (2xx):** `200` `{ roster }` (empty when the lead has no group yet).
**Response (4xx/5xx):** `401`; `403`; `500` "Failed to load roster".

**Notes:** No parameters at all -- the group comes from the cookie volunteer, so
there is no group id to tamper with. Name and SRN/PRN only; `getGroupRoster` never
selects phone numbers.

## GET, PATCH /api/bootstrap/checklist/manual

**Auth:** Volunteer cookie; leads only, for their own group (`requireLeadGroup`):
`401`; `403` "Only group leads can edit their group's checklist"; `400` "You have no
group assigned yet - ask an admin".
**Purpose:** The lead half of the manual checklist backup (S73G).

**Request body (PATCH):** `stall_id` (required), `visited` (boolean).
**Response (2xx):** `200` `{ stalls }` -- the group's checklist after the change.
**Response (4xx/5xx):** `400` "stall_id is required"; `409` "Your group is currently
marked present at this stall. Ask the stall volunteer to mark you as moved on
first."; `500`.

**Notes:** `visited: true` -> `markStallVisitedManually` (writes an already-closed
visit row); `false` -> `clearStallVisitManually`. An OPEN visit cannot be cleared
here -- that belongs to the stall volunteer's release.

## POST /api/bootstrap/switch-request

**Auth:** Volunteer cookie; stall volunteers only.
**Purpose:** Ask to move to a different stall (S72C, migration 025).
**Request body:** `stall_id` (required).
**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401`; `400` "stall_id is required" / "That stall cannot be
requested. Ask an admin to move you."; `403` "Only stall volunteers can request a
stall switch"; `500`.

**Notes:** Records the ASK only; nothing is reassigned until an admin approves via
PATCH /api/admin/bootstrap/volunteers/[id]/switch-request. Stall volunteers are
locked to their own stall (S72B), so this is the sanctioned way to move.

---

# Admin -- Bootstrap ops

All under `/api/admin/bootstrap/*`. Every handler runs `await auth()` and
returns `401 { error: "Unauthorized" }` unless `session.user.isAdmin`;
every mutating handler then returns `403` for a viewer (S47). Middleware also
guards the path; the in-route check is the second layer.

## POST /api/admin/bootstrap/sessions

**Auth:** isAdmin + viewer guard.
**Purpose:** Create a Bootstrap session with its stalls and empty visitor groups.

**Request body:**
- `name` (string, required).
- `stalls` (array, required, >=1) -- each `{ stall_name, max_occupancy (1-4, S77),
  max_groups (1-3 at setup), time_limit_minutes? (whole minutes >= 1, or blank / null
  for no timer, S77), lead_names? (string[], max 4 since S78B, each <= 100 chars) }`.
- `group_count` (optional) -- default 4; integer 1-26.
- `max_group_size` (optional) -- default 20; integer 1-100.

**Response (2xx):** `200` `{ session, autoAssigned }` -- `autoAssigned` is how many
pre-registered pool volunteers `autoAssignPoolMembers` pulled in.
**Response (4xx/5xx):** `401`; `403` viewer; `400` "Name and at least 1 stall
required", group count / max group size out of range, "Every stall needs a name
and occupancy 1-4", "Every stall needs groups 1-3", "Time limit must be a whole
number of minutes, or blank", "Max 4 lead names per stall", "Lead names max 100
chars"; `500` "Failed to create session".

**Notes:** Calls `createBootstrapSession`, `createBootstrapStalls` (stall_number =
index + 1), `createBootstrapGroups` (stored "Group A", shown "Group 1"),
`autoAssignPoolMembers`. `lead_names` are informational only.

## GET /api/admin/bootstrap/sessions/[id]

**Auth:** isAdmin.
**Purpose:** Live admin dashboard poll -- stalls + volunteers + groups in one request.
**Query/params:** `id` (route param) -- session id.

**Response (2xx):** `200` `{ stalls, volunteers, groups }` (three parallel service calls).
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to fetch session" }`.

## DELETE /api/admin/bootstrap/sessions/[id]

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Delete an inactive session (stalls + volunteers cascade).
**Query/params:** `id` (route param).

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: <message> }` -- the service throws (e.g. refusing to delete an active session) and the message is surfaced with a 400.

## PATCH /api/admin/bootstrap/sessions/[id]/active

**Auth:** isAdmin + viewer guard (`403` for viewers).
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

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Ensure N groups exist, then round-robin all unassigned visitors across them.

**Request body:**
- `count` (number, required) -- integer 1-26.
**Query/params:** `id` (route param).

**Response (2xx):** `200` `{ ok: true, assigned }` (`assigned` = number of visitors distributed).
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "count must be 1-26" }`; `500` `{ error: "Failed to create groups" }`.

**Notes:** Calls `createBootstrapGroups` then `assignUnassignedVisitors`.

## PATCH /api/admin/bootstrap/sessions/[id]/map

**Auth:** isAdmin + viewer guard (`403` for viewers).
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

**Auth:** isAdmin + viewer guard (`403` for viewers).
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
`gemini-3.5-flash:generateContent` (`GEMINI_API_KEY`, maxOutputTokens
1024, temperature 0.3). The only route that calls an external AI API.

## GET /api/admin/bootstrap/sessions/[id]/visitors

**Auth:** isAdmin.
**Purpose:** Full visitor list for a session, newest first, with group names.
**Query/params:** `id` (route param).

**Response (2xx):** `200` `{ visitors }`.
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to fetch visitors" }`.

## PATCH /api/admin/bootstrap/groups/[id]/lead

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Assign or clear a group's lead.

**Request body:**
- `lead_id` (string | null) -- must be a string or null; null clears the lead.
**Query/params:** `id` (route param) -- group id.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "lead_id must be a string or null" }`; `500` `{ error: "Failed to assign lead" }`.

## PATCH /api/admin/bootstrap/stalls/[id]

**Auth:** isAdmin + viewer guard.
**Purpose:** Admin override of a stall's status and occupants (no conflict check).

**Request body:**
- `status` (required) -- `free` | `occupied` | `queued`.
- `claimed_by` (string[] or string, optional) -- joined to a comma string; forced to
  `""` when status is `free`.
**Query/params:** `id` (route param).

**Response (2xx):** `200` the updated stall.
**Response (4xx/5xx):** `401`; `403` viewer; `400` "Invalid status"; `404`; `500`.

**Notes:** Calls `updateStallStatus` in `"override"` mode. Since S73B the stall's
displayed status is DERIVED on read from `claimed_by` and the queue table, so the
override's real effect is on `claimed_by`; the old `queued_by` pass-through is
gone, and an admin cannot "mark a stall queued" -- the queue is groups, in
`bootstrap_stall_queue`.

## PATCH /api/admin/bootstrap/stalls/[id]/position

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Set (or clear) a stall's map pin position as percentages.

**Request body:**
- `map_x`, `map_y` (number | null) -- both null clears the pin (S33); otherwise finite numbers 0-100.
**Query/params:** `id` (route param).

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "map_x and map_y must be numbers between 0 and 100" }`; `500` `{ error: "Failed to set stall position" }`.

**Notes:** Calls `setStallMapPosition`.

## PATCH /api/admin/bootstrap/volunteers/[id]/role

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Change a volunteer's role.

**Request body:**
- `role` (string, required) -- must be `"stall"` or `"lead"`.
**Query/params:** `id` (route param) -- volunteer id.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "role must be 'stall' or 'lead'" }`; `500` `{ error: "Failed to set role" }`.

## PATCH /api/admin/bootstrap/volunteers/[id]/suggest

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Set or clear a suggested stall for a volunteer.

**Request body:**
- `stall_id` (string | null) -- must be a string or null.
**Query/params:** `id` (route param) -- volunteer id.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "stall_id must be a string or null" }`; `500` `{ error: "Failed to set suggestion" }`.

**Notes:** Same service (`suggestStallToVolunteer`) the public dismiss
route uses with null.

## PATCH /api/admin/bootstrap/volunteers/[id]/unlock

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Release a volunteer's claimed login so they can log in again.
**Query/params:** `id` (route param) -- volunteer id.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to unlock volunteer" }`.

**Notes:** Calls `clearVolunteerSession(id)` -- the same clear that logout
performs, done by an admin on the volunteer's behalf.

## PATCH /api/admin/bootstrap/sessions/[id]

**Auth:** isAdmin + viewer guard.
**Purpose:** Rename a session or change its visitor cap after creation (S49).
**Request body:** `name` (optional, 1-100 chars), `max_group_size` (optional, 1-100).
**Response (2xx):** `200` `{ session }`.
**Response (4xx/5xx):** `401`; `403`; `400` per field or "Nothing to update" (an empty
body is refused so a no-op cannot silently pass); `404` "Session not found"; `500`.

## POST, DELETE /api/admin/bootstrap/sessions/[id]/stalls

**Auth:** isAdmin + viewer guard.
**Purpose:** Add a stall to a live session, or delete one (S49).
**Request body (POST):** `stallName` (1-60 chars), `maxOccupancy` (1-4), `maxGroups` (1-3).
**Query (DELETE):** `stallId` (required).
**Response (2xx):** POST `200` `{ stall }`; DELETE `200` `{ ok: true }`.
**Response (4xx/5xx):** `401`; `403`; `400` per field / "stallId is required"; `404`
"Stall not found"; `409` "Stall is occupied. Free it before deleting."; `500`.

## POST /api/admin/bootstrap/sessions/[id]/distribute

**Auth:** isAdmin + viewer guard.
**Purpose:** Advisory auto-distribution of groups across stalls (S73D).
**Response (2xx):** `200` "placed N of M" counts from `distributeGroups`.
**Response (4xx/5xx):** `401`; `403`; `500` "Failed to distribute groups".

**Notes:** Writes suggestions as `bootstrap_stall_queue` rows with `accepted_at` NULL
and `volunteer_id` NULL; each lead accepts (`accept_queued`) or declines (`unqueue`).
Re-runnable and idempotent: the candidates are groups with no queue row anywhere, so
a second press only fills gaps and never reshuffles. No refusal on overflow --
groups that fit nowhere simply get no row.

## POST /api/admin/bootstrap/sessions/[id]/sweep-visits

**Auth:** isAdmin + viewer guard.
**Purpose:** Close every still-open visit in a session (S73C).
**Response (2xx):** `200` `{ closed }` -- how many rows were closed.
**Response (4xx/5xx):** `401`; `403`; `500` "Failed to close visits".

**Notes:** Visits only close when a volunteer taps RELEASE; at the end of a real
event people walk away. Deliberately its own action rather than a side effect of
deactivating the session.

## GET, PATCH /api/admin/bootstrap/sessions/[id]/groups/[groupId]/checklist

**Auth:** isAdmin (a local `guard()` helper); PATCH adds the viewer guard.
**Purpose:** The admin half of the manual checklist backup (S73G).
**Request body (PATCH):** `stall_id` (required), `visited` (boolean).
**Response (2xx):** `200` `{ stalls }`.
**Response (4xx/5xx):** `401`; `403`; `400` "stall_id is required"; `409` "This group is
currently marked present at that stall. Use the stall controls to release them
first."; `500`.

**Notes:** Session-nested on purpose, like every other admin bootstrap route. Same
service functions as the lead route: `markStallVisitedManually`,
`clearStallVisitManually`, `getGroupStallChecklist`.

## PATCH /api/admin/bootstrap/stalls/[id]/max-groups

**Auth:** isAdmin + viewer guard.
**Purpose:** Live per-stall group capacity (S73B).
**Request body:** `max_groups` -- whole number 1-10.
**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401`; `403`; `400` "max_groups must be a whole number between 1
and 10"; `500`.

**Notes:** The wide-range control; setup-time tiles offer 1-3. A bare single-column
write (`setStallMaxGroups`) that stays out of the stall status logic, like
./position. The DB CHECK (027) backs the validation.

## PATCH, DELETE /api/admin/bootstrap/volunteers/[id]

**Auth:** isAdmin + viewer guard.
**Purpose:** PATCH corrects a volunteer's own registration details (S55); DELETE
removes a pre-registration pool entry (S55B).
**Request body (PATCH):** any of `display_name`, `phone` (`normalisePhone`), `srn`
(`normaliseSrnPrn`).
**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** PATCH: `400` "Nothing to update" / bad phone / bad SRN; `409`
"Another pre-registered volunteer already uses that SRN". DELETE: `409` "Not found,
or already assigned to a session. Delete the session instead." Both: `401`; `403`; `500`.

**Notes:** PATCH validates every field it is sent, so a legacy off-format SRN blocks
a name-only save from the dashboard (which sends all three) -- flagged in S73F.
Passwords and login codes are not touched here. DELETE only ever reaches pool
rows: `deletePoolVolunteer`'s `session_id IS NULL` guard sends an assigned
volunteer to the 409.

## PATCH /api/admin/bootstrap/volunteers/[id]/assign

**Auth:** isAdmin + viewer guard.
**Purpose:** Pull a pool member (`session_id` NULL) into a session, pointed at a stall (S49).
**Request body:** `sessionId` (required), `stallId` (optional; must belong to that session).
**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401`; `403`; `400` "sessionId is required" / "Unknown stall for
this session"; `409` "Volunteer not found or already assigned to a session"; `500`.

**Notes:** One-way door -- the service's `IS NULL` guard means an assigned volunteer is
never silently moved.

## POST /api/admin/bootstrap/volunteers/[id]/reset-code

**Auth:** isAdmin + viewer guard.
**Purpose:** Issue a volunteer a new plaintext login code (S55C).
**Response (2xx):** `200` `{ login_code }`.
**Response (4xx/5xx):** `401`; `403`; `404` "Volunteer not found"; `500`.

**Notes:** POST rather than a PATCH flag: it generates a value rather than writing
one the caller supplied.

## PATCH /api/admin/bootstrap/volunteers/[id]/switch-request

**Auth:** isAdmin + viewer guard.
**Purpose:** Approve or deny a stall volunteer's switch request (S72C).
**Request body:** `action` -- `"approve"` | `"deny"`.
**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):** `401`; `403`; `400` bad action; `409` "No pending switch request
for this volunteer"; `500`.

**Notes:** Approve reassigns through the same service as the MOVE STALL dropdown
(`resolveStallSwitch`); deny drops the request.

## GET /api/admin/bootstrap/volunteers/pool/export

**Auth:** isAdmin only -- no viewer guard; it reads.
**Purpose:** CSV of the whole pre-registration pool (S73K).
**Response (2xx):** `200` CSV (`poolVolunteersTable` + `toCsv` from
src/lib/utils/exportTables.ts), login codes included -- they already show in the
pool table.
**Response (4xx/5xx):** `401`.

**Notes:** Reuses `getUnassignedVolunteers()` unchanged (`LIMIT 200`), so the export is
exactly the set the pool table shows and the delete button would wipe.

## POST /api/admin/bootstrap/volunteers/pool/export/google

**Auth:** isAdmin + viewer guard (it writes to a shared Sheet).
**Purpose:** The same pool into the "Pool Volunteers" tab of the shared sheet.
**Response (2xx):** `200` `{ ok: true, url, name }` -- a deep link to the tab.
**Response (4xx/5xx):** `401`; `403`; `502` `{ error }` -- Google's own code / reason /
message, or "not configured" when the env vars are missing.

## POST /api/admin/bootstrap/volunteers/pool/delete-all

**Auth:** isAdmin + viewer guard.
**Purpose:** Wipe the pre-registration pool between events (S73K). Irreversible.
**Response (2xx):** `200` `{ ok: true, deleted }`.
**Response (4xx/5xx):** `401`; `403`; `500` "Failed to clear the pool".

**Notes:** `deleteAllPoolVolunteers()` carries `WHERE session_id IS NULL` in the SQL, so
it can never reach an assigned volunteer. POST rather than DELETE: no single
resource, and a bodyless DELETE is the shape a prefetch or link scanner can trip.
The UI confirms and offers EXPORT FIRST.

---

# Admin -- general content and config

All under `/api/admin/*`. Every handler re-checks `session.user.isAdmin`
in-route (401 otherwise; mutating handlers then 403 a viewer), except the two token-gated routes noted below
which have no session check because middleware exempts them.

## GET /api/admin/events

**Auth:** isAdmin.
**Purpose:** List events for the admin manager (LIMIT 100).

**Response (2xx):** `200` JSON array (`getEvents({ limit: 100 })`).
**Response (4xx/5xx):** `401` unauthorized; `500` `{ error: "Failed to fetch events" }`.

## POST /api/admin/events

**Auth:** isAdmin + viewer guard (`403` for viewers).
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

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Update an event.

**Request body:**
- `id` (string, required) -- 400 if missing.
- ...`input` (remaining fields) -- passed to `updateEvent`.

**Response (2xx):** `200` the updated event.
**Response (4xx/5xx):** `401` unauthorized; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to update event" }`.

## DELETE /api/admin/events

**Auth:** isAdmin + viewer guard (`403` for viewers).
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

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Create a gallery item.

**Request body:** gallery-item fields passed to `createGalleryItem`.
**Response (2xx):** `201` the created item. **Response (4xx/5xx):** `401`; `500` `{ error: "Failed to create gallery item" }`.

## DELETE /api/admin/gallery

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Delete a gallery item.
**Query/params:** `id` (query, required) -- 400 if missing.
**Response (2xx):** `200` `{ success: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to delete gallery item" }`.

## GET /api/admin/sponsors

**Auth:** isAdmin.
**Purpose:** List all sponsors (`getSponsors`).
**Response (2xx):** `200` array. **Response (4xx/5xx):** `401`; `500` `{ error: "Failed to fetch sponsors" }`.

## POST /api/admin/sponsors

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Create a sponsor.
**Request body:** sponsor fields passed to `createSponsor`.
**Response (2xx):** `201` the created sponsor. **Response (4xx/5xx):** `401`; `500` `{ error: "Failed to create sponsor" }`.

## PATCH /api/admin/sponsors

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Update a sponsor, or toggle its active flag.

**Request body:**
- `id` (string, required) -- 400 if missing.
- `is_active` (boolean, optional) -- when it is the only field besides `id`, calls `toggleSponsorActive` and returns `{ success: true }`.
- ...`input` -- otherwise passed to `updateSponsor`.

**Response (2xx):** `200` the updated sponsor, or `{ success: true }` for a toggle.
**Response (4xx/5xx):** `401`; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to update sponsor" }`.

## DELETE /api/admin/sponsors

**Auth:** isAdmin + viewer guard (`403` for viewers).
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

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Create a team member.
**Request body:** member fields passed to `createMember`.
**Response (2xx):** `201` the created member. **Response (4xx/5xx):** `401`; `500` `{ error: "Failed to create member" }`.

## PATCH /api/admin/team

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Update a member, or toggle its active flag.

**Request body:**
- `id` (string, required) -- 400 if missing.
- `is_active` (boolean, optional) -- when the only field besides `id`, calls `toggleMemberActive` and returns `{ success: true }`.
- ...`input` -- otherwise passed to `updateMember`.

**Response (2xx):** `200` updated member, or `{ success: true }` for a toggle.
**Response (4xx/5xx):** `401`; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to update member" }`.

## DELETE /api/admin/team

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Delete a member.
**Query/params:** `id` (query, required).
**Response (2xx):** `200` `{ success: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to delete member" }`.

## POST /api/admin/upload

**Auth:** isAdmin + viewer guard (`403` for viewers) -- checked inside the try block.
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

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Update settings, or (overloaded) update one application's status.

**Request body:**
- `applicationId` + `status` -- if both present, calls `updateApplicationStatus` and returns early. (This route doubles as an application-status updater.)
- Otherwise any of the whitelisted keys: `recruitment_open`, `maintenance_mode`, `maintenance_message`, `contact_email`, `contact_phone`, `contact_address`, `instagram_url`, `linkedin_url`, `github_url` -- each present key is written via `setSetting` (stringified). Keys outside the whitelist are ignored.

**Response (2xx):** `200` `{ success: true }`.
**Response (4xx/5xx):** `401`; `500` `{ error: "Failed to update settings" }`.

## POST /api/admin/import/team

**Auth:** isAdmin + viewer guard (`403` for viewers).
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

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Create a milestone.
**Request body:** `date_label`, `title`, `description` (string, required, trimmed non-empty), `sort_order` (number, must be finite).
**Response (2xx):** `200` `{ milestone }`. **Response (4xx/5xx):** `401`; `400` `{ error: "All fields are required" }`; `500` `{ error: "Failed to create milestone" }`.

## DELETE /api/admin/milestones

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Delete a milestone.
**Query/params:** `id` (query, required).
**Response (2xx):** `200` `{ ok: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "Missing id" }`; `500` `{ error: "Failed to delete milestone" }`.

## PATCH /api/admin/milestones/[id]

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Update a single milestone.
**Request body:** `date_label`, `title`, `description` (required, trimmed), `sort_order` (finite number).
**Query/params:** `id` (route param).
**Response (2xx):** `200` `{ milestone }` (or `null` if the update returned no row).
**Response (4xx/5xx):** `401`; `400` `{ error: "All fields are required" }`; `500` `{ error: "Failed to update milestone" }`.

## POST /api/admin/credentials/reset

**Auth:** Token-gated public -- NO session check. Middleware exempts this
path; the one-time reset token in the body is the gate. Boundary:
`consumePasswordResetToken` re-reads the token (unused, unexpired) before
writing, so a missing/expired/used token can never set a password. It then
updates the account and marks the token used as two separate statements, not
one transaction.
**Purpose:** Set a new password from a reset link.

**Request body:**
- `token` (string, required) -- from the reset URL.
- `password` (string, required) -- min 8.
- `confirmPassword` (string, required) -- must equal `password`.

**Response (2xx):** `200` `{ ok: true }`.
**Response (4xx/5xx):**
- `400` missing fields, mismatch, password <8, or `{ error: "Reset link is invalid, expired, or already used" }` when the service throws `"Invalid or expired token"`.
- `500` `{ error: "Password reset failed" }`.

**Notes:** Password hashing and the `token_version` bump happen inside
`consumePasswordResetToken` (the service), not the route.

## GET, POST, PATCH, DELETE /api/admin/announcements

**Auth:** isAdmin on every method; viewer guard on POST / PATCH / DELETE.
Mirrors /api/admin/sponsors.
**Purpose:** Homepage announcement CRUD (S73E).
**Request body:** POST -- `title` (required) plus `body`, `image_url_desktop`,
`image_url_mobile`, `cta_label`, `cta_href`, `is_active`, `display_order`. PATCH -- `id`
(required); a body of just `{ id, is_active }` goes through `toggleAnnouncementActive`,
anything else through `updateAnnouncement`. DELETE -- `?id=`.
**Response (2xx):** GET -> the rows; POST -> the created row; PATCH / DELETE `{ success: true }`.
**Response (4xx/5xx):** `401`; `403`; `400` "Title is required" / "ID required"; `500`.

**Notes:** Nothing stops two rows being active; the homepage's `LIMIT 1` read shows
the first by `display_order`.

## GET, POST /api/admin/posts

**Auth:** isAdmin; viewer guard on POST.
**Purpose:** List every post (drafts included, `getAllPostsAdmin`) / create one.
**Request body (POST):** `title`, `author_name`, `body` (required); `slug` (derived from
the title when absent), `category`, `author_role`, `excerpt`, `source_url`,
`source_label`, `thumbnail_url`, `published`, `published_at`.
**Response (4xx/5xx):** `401`; `403`; `400` "Title, author name and content are required"
/ "Could not derive a slug"; `500` with the service's message.

## PATCH, DELETE /api/admin/posts/[id]

**Auth:** isAdmin + viewer guard.
**Purpose:** Update or delete one post.
**Request body (PATCH):** any post field above.
**Response (2xx):** PATCH -> the updated post; DELETE `{ success: true }`.
**Response (4xx/5xx):** `401`; `403`; `400` "Invalid slug"; `404` "Post not found"; `500`.

**Notes:** Clearable columns use posts.ts's read-then-write shape, not
`COALESCE`, which could never write a NULL back.

## PATCH /api/admin/team/reorder

**Auth:** isAdmin + viewer guard.
**Purpose:** Persist a drag reorder within one tier.
**Request body:** `tier`, `ids` (that tier's member ids in the new order).
**Response (2xx):** `200` `{ success: true }`.
**Response (4xx/5xx):** `401`; `403`; `500` "Failed to reorder members".

**Notes:** `TeamMembersTable` renumbers the tier optimistically and reverts on failure.

## PATCH /api/admin/events/[id]/registrations/[regId]

**Auth:** isAdmin + viewer guard.
**Purpose:** Set one event registration's status (S47).
**Request body:** `status`.
**Response (2xx):** `200` `{ success: true }`.
**Response (4xx/5xx):** `401`; `403`; `500` "Failed to update registration status".

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

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Delete an application.
**Query/params:** `id` (query, required).
**Response (2xx):** `200` `{ success: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "ID required" }`; `500` `{ error: "Failed to delete application" }`.

## PATCH /api/admin/applications/[id]/status

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Update one application's status.
**Request body:** `status` (string, required) -- must be in `APPLICATION_STATUSES`.
**Query/params:** `id` (route param).
**Response (2xx):** `200` `{ success: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "Invalid status" }`; `500` `{ error: "Failed to update status" }`.

## PATCH /api/admin/applications/[id]/group

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Assign or clear an application's interview group.
**Request body:** `group` (string | null) -- null clears; otherwise must be in `INTERVIEW_GROUPS`.
**Query/params:** `id` (route param).
**Response (2xx):** `200` `{ success: true }`. **Response (4xx/5xx):** `401`; `400` `{ error: "Invalid group" }`; `500` `{ error: "Failed to update group" }`.

## POST /api/admin/applications/bulk-status

**Auth:** isAdmin + viewer guard (`403` for viewers).
**Purpose:** Set status on many applications at once.
**Request body:** `ids` (string[], required, non-empty after filtering to strings), `status` (string, required, in `APPLICATION_STATUSES`).
**Response (2xx):** `200` `{ success: true, updated: <count> }`.
**Response (4xx/5xx):** `401`; `400` `{ error: "No ids provided" }` or `{ error: "Invalid status" }`; `500` `{ error: "Bulk update failed" }`.

## GET /api/admin/applications/export

**Auth:** isAdmin -- viewers allowed; it only reads.
**Purpose:** Applications as a downloadable CSV (`LIMIT 500`).
**Query/params:** `status` (optional) -- filters the export. The page passes the active
tab, so export from ALL for everything.
**Response (2xx):** `200` CSV; `Content-Type: text/csv; charset=utf-8`;
`Content-Disposition: attachment; filename="vegavath-applications-<ts>.csv"`.
**Response (4xx/5xx):** `401`. No try/catch -- a service throw surfaces as a 500.

**Notes:** Columns come from `applicationsTable` in src/lib/utils/exportTables.ts,
shared with the Google Sheets export so the two cannot disagree: every table
column (S81: id, the FY25 `portfolio_url`, the full UTC timestamp beside the date),
course, Domain 1-3 as display labels in /join order with an old Operations +
Sponsorship pair collapsed (S82B), the pre-S81 question columns, then one column
per question headed "<set> (<branch>): <question>" with multi-selects joined by
", ". A Vitest test pins that every Application field is exported. Quoting is RFC
4180 (`toCsv`); it does NOT neutralise a cell starting with `=` / `+` / `-` / `@`, so
spreadsheet formula injection is possible when the CSV is opened (flagged S81; the
Sheets export is safe, it writes RAW).

## POST /api/admin/applications/export/google

**Auth:** isAdmin + viewer guard (it writes to a shared Sheet; viewers keep the CSV).
**Purpose:** The same dataset into the "Applications" tab of the shared sheet (S73K,
rewritten S74A).
**Query/params:** `status` (optional), as above.
**Response (2xx):** `200` `{ ok: true, url, name }` -- `url` deep-links to the tab.
**Response (4xx/5xx):** `401`; `403`; `502` `{ error }` -- Google's own code / reason /
message, or "not configured".

**Notes:** `exportTableToGoogleSheets` (src/lib/services/googleExport.ts) clears the tab
and rewrites it; it never creates a file. The route's own comment still says it
"creates a file in the team's Drive" -- that describes S73K and is stale since S74A.

## POST /api/admin/applications/auto-assign-groups

**Auth:** isAdmin + viewer guard (`403` for viewers).
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

**Auth:** godfather-only -- `isAdmin` and `isGodfather`, else 401; then a viewer guard (`403`), which is unreachable in practice since a godfather is never a viewer.
**Purpose:** Create an invite link.
**Request body:** `type: "open"` creates a reusable open viewer link (S48); otherwise a
named one-time invite with `inviteeName` (required, at least one alphanumeric) and
`role` (`"viewer"` makes a viewer invite; anything else an admin invite).
**Response (2xx):** `200` `{ url }` -- `<origin>/admin/register?token=...` (open) or
`<origin>/admin/invite/<slug>/<token>` (named).
**Response (4xx/5xx):** `401`; `400` "Invitee name is required"; `500` "Failed to create
invite: <reason>".

**Notes:** Since S76C the 500 includes the underlying error text: the route is
godfather-only, so that is no wider disclosure, and hiding it cost a full
diagnosis round-trip on a live failure.

## GET, DELETE /api/admin/accounts/invite

**Auth:** godfather-only; DELETE also carries the viewer guard.
**Purpose:** GET `?type=open` lists the active open viewer links (`getOpenViewerTokens`);
DELETE `?tokenId=` revokes one (`revokeOpenToken`).
**Response (2xx):** GET the links with their `url`s; DELETE `{ ok: true }`.
**Response (4xx/5xx):** `401` / `403`; `400` "Unknown type" / "Missing tokenId"; `500` with
the reason (S76C).

**Notes:** The panel only shows these controls when `NEXT_PUBLIC_SHOW_VIEWER_INVITES`
is "true" (production only).

## PATCH /api/admin/accounts/me

**Auth:** isAdmin -- **deliberately no viewer guard** (S67). It can only write the
caller's own `admin_accounts` row, scoped by `session.user.accountId` (never the body);
a viewer must still be able to rotate their own password.
**Purpose:** Self-service profile update.
**Request body:** `currentPassword` + `newPassword` (min 8) to change the password; and/or
`displayName`, `mobileNumber` (`normalisePhone`, 10 digits, S73F).
**Response (2xx):** `200` `{ success: true, signedOut: true }` after a password change
(other sessions are invalidated); otherwise `{ success: true, displayName, mobileNumber }`.
**Response (4xx/5xx):** `401` / "Current password is incorrect"; `400` env-godfather account
("configured through environment variables"), invalid body, missing passwords,
short password, empty display name, bad mobile, "Nothing to update"; `404`; `500`.

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
