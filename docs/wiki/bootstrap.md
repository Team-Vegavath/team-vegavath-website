# Bootstrap System

A complete guide to the "Bootstrap" event-day operations system in the Team
Vegavath website. This is written for someone who has never opened the code.
Everything below is drawn from the source: the service layer
(`src/lib/services/bootstrap.ts`), the pages under `src/app/bootstrap/`, the
admin dashboard under `src/app/(admin)/admin/bootstrap/`, the API routes under
`src/app/api/bootstrap/` and `src/app/api/admin/bootstrap/`, the components in
`src/components/bootstrap/`, migrations `007`-`017`, `021`, `025` and
`027`-`029`, and the design record in `docs/bootstrap-spec.md`.

_Current as of Session 82C (2026-10-05)._

> Terminology note: `docs/bootstrap-spec.md` has a "CURRENT STATE (Session 38)"
> block at the top that supersedes the older "FABLE NOTES" design record below
> it. The older sections still describe admin-generated `vol-1`/`vol-2`
> credentials handed out as a CSV. That model is gone. This guide documents
> what the code actually ships today: volunteer self-registration.

> Correctness pass (S72B / S72C): the stall-mutation rules below were
> substantially tightened after a live test surfaced a permission gap. Stall
> volunteers are now locked to their assigned stall and move only via an
> admin-approved switch request; role, ownership, session and occupancy are
> all checked server-side rather than only in the UI. See "Stall ownership
> and the switch-request flow" below. Migration `025` backs this and is
> applied.

> Event-day rebuild (S73B-S78B): the stall board is now built around GROUPS.
> A stall's status is derived on read; the queue is a table of waiting groups
> (`bootstrap_stall_queue`, migration `027`) that releasing never clears; a
> stall volunteer names which group arrived, which writes a visit row
> (`bootstrap_stall_visits`, `028`) that is also the occupancy record and feeds
> each student's checklist and the lead's roster; and stalls carry a group
> capacity (`max_groups`, `027`) and an optional time limit that runs a
> countdown on the lead's phone (`time_limit_minutes`, `029`). Migrations
> `027`-`029` are applied (every migration through `031` is).

---

## What Bootstrap Is and Why It Exists

Bootstrap is a multi-day club showcase / open house run by Team Vegavath (the
PESU ECC motorsports/engineering club). Clubs set up physical stalls in an open
area on campus, and freshers ("visitors") walk around in groups to browse
projects, vehicles, and live demonstrations. The area has poor indoor wifi and
sits on a captive-portal network, so the whole system is built to survive a
flaky connection.

The system coordinates three moving parts on the day:

1. Volunteers -- the people running stalls and walking groups around.
2. Stalls -- physical stations (Go-Kart, BMW Display, Avions, Engines, etc.)
   whose live state -- which groups are at them, which are waiting -- volunteers
   keep updated.
3. Visitors and groups -- freshers who check in via QR into a numbered group
   walked by a "lead" volunteer, follow their group's stall checklist, and later
   leave feedback.

What it is NOT: it is not a recruitment data-entry tool. Students who want to
apply to the club scan a separate banner QR that points at `/join` (unrelated
to Bootstrap). Bootstrap only tracks stall status, group logistics and stall
visits, visitor check-ins, and post-event feedback. The traditional fallback if the system
fails is a Google Sheet on the captive portal.

### Why polling, not WebSockets

Vercel serverless does not hold persistent WebSocket connections, so the
dashboards short-poll `GET` endpoints every 4 seconds (`POLL_MS = 4000`). A
missed poll is just a 4-second delay with no broken state. Both the volunteer
dashboard and the admin dashboard pause polling while `document.hidden` is true
(a battery/Neon courtesy only -- nothing depends on the poll for correctness).

---

## Volunteer Types / Roles

The role is stored on `bootstrap_volunteers.role` and is constrained by a CHECK
to exactly two values (migration `014_bootstrap_visitor_groups.sql`):

```sql
role TEXT NOT NULL DEFAULT 'stall' CHECK (role IN ('stall', 'lead'))
```

| Role | What they do | UI they get |
| --- | --- | --- |
| `stall` | Stationed at one stall all day. | `StallVolunteerView.tsx` -- locked to their assigned stall (S72B): GROUP ARRIVED (name the group), RELEASE / GROUP LEFT, and a switch request. No queue, no map, no notifications. |
| `lead` | Walks a visitor group around. | The full `BootstrapDashboard.tsx` -- stall grid, map, queue actions, advisory placements, freed-stall/redirect notifications, classroom mode, the group number and headcount, the roster, the manual checklist, the stall countdown, and a personal QR check-in link. |

The role is assigned at registration time (stall registrants get `'stall'`,
group registrants get `'lead'`) and can be flipped afterward by an admin via
`PATCH /api/admin/bootstrap/volunteers/[id]/role`.

The TypeScript shape lives in the `BootstrapVolunteer` interface. Fields worth
knowing: `username` (the lowercased SRN), `display_name`, `login_code`
(plaintext password, admin-visible), `phone`, `srn`, `role`, `checkin_token`
(leads only), `group_number`, `in_classroom`, `suggested_stall_id` /
`suggested_stall_name`, and `is_active` (computed as
`current_session_token IS NOT NULL`).

---

## Self-Registration Flow

Since Session 35 (migration `016_volunteer_selfregister.sql`) there are no
admin-generated credentials and no CSV. Volunteers self-register once a session
is active.

### The pages

Both are public (no login, no middleware gate) and both render the single
`BootstrapRegister.tsx` component with a `variant` prop:

- `src/app/bootstrap/register/stall/page.tsx` -- variant `"stall"`. Loads the
  active session and its stalls so the volunteer can pick which stall they will
  manage from a dropdown.
- `src/app/bootstrap/register/group/page.tsx` -- variant `"group"`. Just name,
  phone, SRN.
- `src/app/bootstrap/register/pool/page.tsx` -- variant `"pool"` (S74B). The
  always-open one. It does not load the session at all, so it is the only
  statically rendered page of the three and never waits on a Neon cold start.
  Adds a role choice (stall volunteer / group lead); the stall-preference field
  appears only for the former.

If there is no active session, `stall` and `group` both render "No live session
right now." with a link to the pool page. S74B: before that, only `group` did --
`stall` silently accepted the submission into the pool instead, which is why
everyone who pre-registered was recorded as a stall volunteer whatever they
actually intended.

### The form and the APIs

The form collects full name, phone number, and SRN/PRN (plus stall selection
for the stall variant). It POSTs to `POST /api/bootstrap/register/stall` or
`POST /api/bootstrap/register/group`.

Shared server-side rules in both routes:

- Phone is normalised by `src/lib/utils/phone.ts` (`normalisePhone`): keeps
  digits only, strips a `91` country code and a leading trunk `0`, and must
  resolve to exactly 10 digits.
- SRN / PRN goes through `normaliseSrnPrn` (`src/lib/utils/srn.ts`, S73F):
  whitespace stripped, uppercased, and it must match the real SRN shape
  (`PES1UG21CS999`) or PRN shape (`PES1201912345`). Both are alphanumeric, so
  the lowercased value stays typeable as a username. Name max 100. The forms
  feed the same pattern sources into the HTML `pattern` attribute, so the
  browser and the API cannot drift, and phone fields are capped at 10 and
  filtered to digits as typed (S73I, S76B).
- There must be an active session, or the route returns 404 "Registration is
  not open yet."
- One account per SRN per session -- a duplicate returns 409 ("This SRN is
  already registered. Ask an admin for your login code.").
- The stall route additionally validates that the submitted `stall_id` belongs
  to the active session.

On success the service functions `registerVolunteer` (S74B -- was
`registerStallVolunteer`; it takes a `role` now, so the stall-specific name no
longer fit) / `registerGroupVolunteer` do the following:

- `username = srn.toLowerCase().trim()`.
- `loginCode = generatePassword(8)` -- 8 chars from
  `"abcdefghjkmnpqrstuvwxyz23456789"` (no ambiguous 0/O/1/l/I), using Node's
  `crypto.randomInt`.
- Store `password_hash = bcrypt.hash(loginCode, 10)` AND the plaintext
  `login_code`. The plaintext is deliberate: these accounts only reach
  `/bootstrap`, a low-stakes internal tool, and the admin tables display the
  code so a volunteer who loses it can be told what it is.
- Stall registrants are stored with `role = 'stall'` and their chosen stall in
  `suggested_stall_id`. Important: registering does NOT claim the stall, and
  neither does logging in (S72B). It stays FREE until the volunteer logs the
  first group's arrival.
- Group registrants are stored with `role = 'lead'` and a stable
  `checkin_token = randomBytes(20).toString("hex")` for their QR link.
- S74B: a POOL registrant is stored with whichever of those two roles they picked,
  by the same `registerVolunteer` call, with `session_id = NULL`. A pooled lead
  gets its `checkin_token` here too, at registration rather than when it is later
  swept into a session -- minting it late would hand the lead a different QR URL
  than the one they were originally given.

The response returns `{ username, loginCode }`, which the component shows on a
"Registered!" screen telling the volunteer to save both (they are their login
at `/bootstrap`). Group volunteers are told their group number appears on the
dashboard after the day starts. The group route also calls
`assignGroupNumbers` immediately so late registrants get numbered as they
arrive (see Group Leads below).

---

## Session Lifecycle (Admin Controlled)

A "session" (`bootstrap_sessions`) represents one Bootstrap day. Only an admin
manages sessions, and only one may be active at a time.

### Create

The admin UI (`BootstrapCreateSession.tsx`) is a 2-step wizard:

- Step 1: session name, number of visitor groups (1-26, default 4), and max
  visitors per group (1-100, default 20).
- Step 2: add stalls one at a time -- stall name; volunteer capacity
  (`max_occupancy`, 1-4 since S77) and group capacity (`max_groups`, 1-3 at
  setup, S73B) as two clearly labelled segmented pickers (S76G); an optional
  time limit in whole minutes (S77, blank = no timer); and optional lead names
  (max 4 since S78B, informational only, shown on the stall card -- they do NOT
  create accounts). A past session's stall list can be imported as a starting
  point (S49). Stalls can be reordered with up/down arrows and removed before
  submitting.

It POSTs to `POST /api/admin/bootstrap/sessions` (admin-guarded via `auth()` +
`isAdmin`). That route calls, in order, `createBootstrapSession(name,
maxGroupSize)`, `createBootstrapStalls(...)`, and
`createBootstrapGroups(sessionId, groupCount)`, then
`autoAssignPoolMembers(sessionId)`, which pulls pre-registered pool volunteers
into the new session: a pooled stall volunteer whose typed preferred stall
matches a new stall name (punctuation and case ignored) lands on that stall, and
every pooled lead is claimed unconditionally. It creates NO new accounts. On
success the wizard shows three registration links -- `/bootstrap/register/stall`
and `/bootstrap/register/group` (open while the session is active) and the
always-open `/bootstrap/register/pool` -- plus how many pool volunteers were
auto-assigned.

### Edit while live (S49, S73B)

`PATCH /api/admin/bootstrap/sessions/[id]` renames a session or changes its
visitor cap. `POST` / `DELETE /api/admin/bootstrap/sessions/[id]/stalls` adds
or deletes a stall (an occupied stall cannot be deleted, 409).
`PATCH /api/admin/bootstrap/stalls/[id]/max-groups` changes a stall's group
capacity live, 1-10. Lowering a capacity gates new arrivals only; it never
evicts groups already at the stall.

When stalls are created, `createBootstrapStalls` tries to pre-fill each stall's
map pin from `DEFAULT_STALL_POSITIONS` by matching keywords in the stall name
(longest key first, so "go-kart parking" beats "go-kart"). This is a
convenience; the admin can correct it later via pin-drop.

### Activate (only one active at a time)

`PATCH /api/admin/bootstrap/sessions/[id]/active` with `{ is_active: true }`
calls `setSessionActive`. Activation is a single statement that flips every
session in one write:

```sql
UPDATE bootstrap_sessions SET is_active = (id = ${id})
```

so activating one session deactivates all others atomically. Activation also
calls `assignGroupNumbers(id)` to hand out group numbers FCFS to any leads who
registered before the day went live.

Registration and login only work while a session is active (both check
`getActiveBootstrapSession`).

### Deactivate / close

Sending `{ is_active: false }` deactivates without touching others. On the live
dashboard the admin clicks DEACTIVATE SESSION (with a confirm dialog warning
that volunteers will be signed out). Because the volunteer cookie lookup
(`getVolunteerByToken`) joins on `s.is_active = true`, deactivating a session
effectively logs everyone out on their next poll -- the poll gets a 401 and the
dashboard redirects to the login screen.

### Delete

`DELETE /api/admin/bootstrap/sessions/[id]` calls `deleteBootstrapSession`,
which refuses to delete an active session (you must deactivate first) and
otherwise cascades away all stalls, volunteers, groups, visitors, and feedback
(via `ON DELETE CASCADE`). The sessions list nudges the admin to delete
sessions that have been inactive for 7+ days, since self-registered accounts
pile up.

### Summarize

There is no separate "close" state; a session is simply deactivated. "Summary"
here means the AI feedback summary (see Feedback + AI Summary below), not a
lifecycle state.

---

## Volunteer Login and the Separate Cookie Auth

Volunteer auth is deliberately NOT NextAuth. Admins authenticate with NextAuth
(`auth()` + `session.user.isAdmin`); volunteers use a lightweight, custom
HttpOnly session cookie so the two systems never mix.

### The cookie

- Name: `vg_vol_session` (constant `VOLUNTEER_COOKIE` in
  `src/app/api/bootstrap/volunteer-auth.ts`).
- Value: a `crypto.randomUUID()` token minted at login.
- Flags: `httpOnly`, `sameSite: "lax"`, `secure` in production, `path: "/"`,
  `maxAge: 60 * 60 * 24` (24 hours -- credentials are per-day).

### Login flow (`POST /api/bootstrap/login`)

1. Read `{ username, password }`; username is trimmed and lowercased.
2. Require an active session (`getActiveBootstrapSession`), else 401 "No active
   session".
3. Look up the volunteer by username in that session
   (`getVolunteerByUsername`), else 401 "Invalid credentials".
4. `verifyVolunteerPassword` -- `bcrypt.compare` wrapped in try/catch (a
   malformed hash is treated as invalid, not a crash).
5. Atomic claim via `claimVolunteerSession(volunteerId, token)`:

```sql
UPDATE bootstrap_volunteers
SET current_session_token = ${token}
WHERE id = ${volunteerId} AND current_session_token IS NULL
RETURNING id
```

If this updates 1 row the login owns the account and the cookie is set. If it
updates 0 rows the account is already in use elsewhere and the route returns
409 ("ACCOUNT IN USE -- ASK ADMIN TO UNLOCK" in the UI). Doing the conflict
check and the write in one statement means retried logins on a bad network
cannot both succeed.

### Why this locking model (design record)

The spec chose an explicit session token with no timeout ("Option B") over a
heartbeat. During a stall presentation a volunteer's phone is locked and silent
for 8-15 minutes, which any heartbeat/timeout scheme would misread as "gone"
and unlock while the account is in active use. The token model needs zero
background JS and zero background network: locked means locked until an explicit
logout or an admin unlock. The one weakness (a forgotten logout) has a one-tap
admin recovery path.

### Logout (`POST /api/bootstrap/logout`)

Calls `clearVolunteerSession` (sets `current_session_token = NULL`, idempotent
-- clearing an already-null token still succeeds), always deletes the cookie,
and always returns 200. Safe to double-tap on a laggy connection.

### How pages read the cookie

`src/app/bootstrap/page.tsx` reads the cookie server-side and calls
`getVolunteerByToken(token)`. That query only resolves a volunteer whose token
matches AND whose session `is_active = true`. No volunteer -> render
`BootstrapLogin`; otherwise render `BootstrapDashboard` seeded with the
volunteer's display name, username, and role. API routes reuse the same lookup
via `getVolunteerFromCookie`.

### Admin unlock

`PATCH /api/admin/bootstrap/volunteers/[id]/unlock` calls
`clearVolunteerSession`, freeing a stuck account so the volunteer can log in
again from any device. The admin dashboard shows an UNLOCK button next to any
volunteer whose status is ACTIVE.

---

## Visitor Check-In Flow

Visitors never log in. They scan a QR that belongs to a specific group lead.

### The token

Each `lead` volunteer gets a stable `checkin_token` at registration (migration
`015`, distinct from the login session token so the QR URL survives logouts).
The lead's dashboard renders their personal link
`{origin}/bootstrap/checkin/{checkin_token}` through `CheckinQROverlay.tsx`,
which offers a COPY LINK button and a full-screen QR (rendered with
`qrcode.react`, optionally with the club logo embedded from R2). Students scan
it to register into that lead's group.

### The page and API

`src/app/bootstrap/checkin/[token]/page.tsx` (public) resolves the token via
`getCheckinContext(token)`. That query joins the volunteer to their session and
to a group either by `team_lead_id = volunteer.id` OR by
`name = 'Group ' || chr(64 + group_number)`, and only for an active session. It
returns lead name, session name, `max_group_size`, the group id/name, and the
current `visitor_count`.

The page renders one of four states in `BootstrapCheckin.tsx`:

- No context (bad token or no active session) -> "Not started yet".
- Group already at capacity (`visitor_count >= max_group_size`) -> "This group
  is full!".
- Otherwise a form: full name, PRN/SRN, phone (all required; the shared SRN/PRN
  and phone validators, S73F).
- After a successful POST -> a "Welcome!" screen naming the group (as "Group
  1", never a letter, S73K) with a link to the student's own checklist,
  `/bootstrap/checklist/{visitorId}`, and a COPY button (S73D).

`POST /api/bootstrap/checkin/[token]` re-resolves the context and calls
`checkinVisitorToGroup`, whose capacity check and INSERT are a single statement:

```sql
INSERT INTO bootstrap_visitors (session_id, name, prn, phone, group_id)
SELECT ${sessionId}, ${name}, ${prn}, ${phone}, ${groupId}
WHERE (SELECT count(*) FROM bootstrap_visitors WHERE group_id = ${groupId}) < ${maxGroupSize}
RETURNING id
```

So two phones scanning the last slot at once cannot both succeed; the loser
gets 409 "This group is full!".

`bootstrap_visitors` stores `name`, `prn`, `phone`, an optional `group_id`, and
`arrived_at` (migration `014`).

### The student checklist (S73D)

`/bootstrap/checklist/[id]` is public; `[id]` is the visitor's own
`bootstrap_visitors` row id, returned as `visitorId` by the check-in POST. The
page is force-dynamic and renders `BootstrapChecklist` (a server component: a
reload is the refresh) from `getVisitorChecklistContext`: the group, "N OF M
STALLS DONE", and every stall marked DONE, HERE NOW (an open visit) or NOT YET.
A bad id gets the same dead end as a bad check-in link, so the page never
confirms whether a visitor exists. The data is the group's visit rows, so it is
exactly as accurate as the stall volunteers' taps -- which is why the manual
checklist backup below exists.

---

## Stall Dashboard (What a Volunteer Sees)

`BootstrapDashboard.tsx` is the client component behind `/bootstrap` for a
logged-in volunteer. It polls `GET /api/bootstrap/stalls` every 4 seconds. That
endpoint returns all stalls for the volunteer's session -- each with its
derived status, `occupants` (the groups at it, from open visits), its `queue`,
`max_groups` and `time_limit_minutes` -- plus per-volunteer extras:
`mySuggestion` / `mySuggestionId` (the assigned stall), the pending switch
request, `volunteerNames` (display names only, never login codes),
`myGroupId` and `myGroupSize` (leads), `volunteerRole`, `checkinToken`,
`groupNumber`, and `inClassroom`. The role decides the whole view.

**Stall status is derived on read** (`selectStalls`, S73B): nobody in
`claimed_by` -> free; someone on it with groups queued -> queued; someone on it
with an empty queue -> occupied. An empty stall with groups still waiting reads
free. The stored `status` column is still written, so the table reads sensibly
in the Neon console, but nothing reads it.

### Role = stall (`StallVolunteerView.tsx`)

Locked to the assigned stall (S72B); with no assignment they see "waiting for
an assignment", never a picker. The stall's card shows its status, **HERE NOW**
(the groups at the stall, from open visits, S73C) and the volunteers on it.

- **Group arrived** -- shown only while the stall has group capacity left
  (`max_groups`). Opens "Which group just arrived?", listing the groups that
  have NOT visited this stall yet (`GET /api/bootstrap/stalls/[id]/groups`;
  queued groups sort first as a hint, not a turn order). Picking one logs the
  visit and claims the stall. If every group has been, an escape claims the
  stall with no visit row.
- **Release** -- with one group here, a single tap that closes its visit. With
  several, **Group left** opens "Which group is leaving?" (the groups here now)
  so one group leaving never closes another's visit. The volunteer steps off the
  stall only when the last group has gone. When a tap would take them off the
  stall, a native confirm names anyone else still holding it and the groups
  still waiting there.
- **Request switch** -- the only multi-stall list left; it raises a switch
  request instead of moving (see below).

No queue, map, or notifications.

### Role = lead (full dashboard)

- A header with the volunteer's display name, a "LIVE / Xs ago" freshness
  indicator, a CLASSROOM MODE toggle, a MAP button, and Sign out.
- A "Your group" card: Group N (or "Not assigned yet"), the headcount with a
  tap-to-open **roster** (S73D, `GET /api/bootstrap/roster`: names and SRN/PRN
  only, never phones; the group comes from the cookie, so there is no id to
  tamper with), and a **CHECKLIST** button opening the manual checklist backup
  (S73G, below).
- A **countdown** (S77, `StallTimeLimitCountdown`) while the group is at a stall
  that has a time limit: computed from the visit's `arrived_at` on every tick
  (never a tick count, which iOS Safari breaks by pausing background tabs),
  amber under 4 minutes, red under 2 and when over time, with a chime once at 4
  minutes and once at 2 minutes left. A threshold crossed while the tab was
  hidden is marked fired and never plays late. The chime is primed on the lead's
  first tap, because browsers block audio until the user interacts.
- **Advisory placements** (S73D): a card for each stall the admin's distribute
  pass placed this group at, with HEADING THERE (`accept_queued`) and NOT NOW
  (`unqueue`).
- A "Your group check-in link" card with the QR overlay.
- The stall grid via `StallGrid` + `StallCard`.

### StallCard actions (the queue rules)

`StallCard.tsx` shows each stall's status, its lead names, the volunteers on it,
**Here now:** (groups at the stall) and **Waiting:** (every queued group in
order, with its wait in minutes). Group names render through `groupLabel`
("Group 1", S73K). The buttons (`volunteerButtons`, S73B):

- **Stall volunteers** -- claim / release only: nobody here -> Claim; on it ->
  Release; others on it with room (`claimed_by.length < max_occupancy`) -> Join.
  (In practice a stall volunteer sees `StallVolunteerView` instead.)
- **Leads** -- their group is queued here -> Leave queue (`unqueue`); otherwise,
  if someone is at the stall -> Mark queued (`mark_queued`). A lead whose group
  is queued at a stall that just went free still gets Leave queue, because
  release no longer clears the queue.

Actions PATCH `/api/bootstrap/stalls/[id]` with `{ action, group_id? }`, where
action is `claim | release | mark_queued | unqueue | accept_queued`. Every rule
is enforced in the route, not just the UI:

- **Claim / release are stall-volunteer only, on their own stall** (403
  otherwise). A claim with `group_id` records the visit FIRST
  (`recordStallVisit`), then the claim, so a rejected visit leaves nothing
  half-done. The visit INSERT carries its own guards: stall and group in the
  caller's session, and fewer open visits than `max_groups`. Its
  `UNIQUE(stall_id, group_id)` makes a double-tap harmless and is also a **hard
  revisit ban**: "That group has already been to this stall" (409), "This stall
  is already at its group capacity" (409). Release closes the named group's visit
  ("Say which group is leaving", 400, when several are here and none is named)
  and never clears the queue.
- **Queue actions are lead-only** and write `bootstrap_stall_queue`. The group is
  resolved server-side from the cookie, never from the body, so one lead cannot
  queue or unqueue another's group. `addToQueue` guards in SQL: stall and group
  in the caller's session, and somebody actually at the stall ("Nobody is at that
  stall right now - head over instead", 409). The queue's
  `UNIQUE(stall_id, group_id)` turns a double-tap into a no-op.
  `accept_queued` confirms an admin placement; declining is plain `unqueue`.

If a guarded write updates 0 rows (it raced a state change) the service returns
the current row so the UI resyncs instead of erroring.

### Freed-stall notifications and connection state

For leads, each poll diffs the previous snapshot. When a stall transitions to
free, the dashboard shows a toast; if the lead's group is still in that stall's
queue (read from the CURRENT row's queue, S73B), the toast is emphasised ("... IS
FREE -- YOUR GROUP CAN HEAD OVER"). A lead who left the queue gets nothing. Three
consecutive failed polls flip a red "CONNECTION ISSUES - RETRYING..." banner.

### Manual checklist backup (S73G)

When a stall volunteer forgets to log a visit, a lead (CHECKLIST on the group
card, `GET` / `PATCH /api/bootstrap/checklist/manual`, own group only) or an
admin (the Visitor Groups table,
`/api/admin/bootstrap/sessions/[id]/groups/[groupId]/checklist`) can tick or
clear stalls in `ManualChecklistPanel`, one shared control. A tick writes an
already-closed visit row (`arrived_at` = `left_at` = now); a clear deletes a
closed row. A stall the group is currently AT cannot be cleared here (409) --
that belongs to the stall volunteer's release.

### Stall ownership and the switch-request flow (S72B / S72C)

A live test showed that the stall rules were enforced in the UI but not on the
server, so a volunteer could mutate a stall that was not theirs. The fix moved
every rule server-side. What holds now:

- **Role, ownership, session and occupancy are all checked in the route**, not
  just hidden in the component. Hiding a control is a UX affordance, never a
  permission.
- **A stall volunteer is locked to their assigned stall.** The full stall
  picker they used to get is gone (a net deletion, not a new feature). If they
  have no stall they see an honest "No stall assigned" dead end with a stated
  remedy rather than a picker that would let them grab someone else's.
- **Moving stalls is a request, not an action.** The volunteer raises one via
  `POST /api/bootstrap/switch-request`; an admin approves or denies it via
  `PATCH /api/admin/bootstrap/volunteers/[id]/switch-request`. Migration `025`
  adds `switch_requested_stall_id` and `switch_requested_at` to back it.
- **Releasing a stall asks for confirmation** when the tap takes the volunteer
  off it, naming anyone else who still holds it and the groups still waiting.
  (S72C also scoped the queue wipe that used to accompany a release; since S73B
  a release never touches the queue at all.)
- **Logging in no longer marks a stall occupied** (S72B section G). Login used
  to make the first tap a claim, which the board read as "a group is here". An
  assigned volunteer now lands on their own stall's card while it is still
  FREE, and occupancy starts only when they log a group's arrival.

Known carry-over, unfixed: `assignGroupNumbers` can share a `group_number`
between two leads when leads outnumber groups, which is why
`CheckinContext.group_number` is typed nullable. `suggested_stall_id` also
still does double duty (assignment vs dismissible lead banner).

---

## Group Leads and Group Size

Groups live in `bootstrap_groups` (migration `014`): one row per group per
session, named "Group A", "Group B", ... with an optional `team_lead_id` and a
UNIQUE(session_id, name). `createBootstrapGroups(sessionId, count)` creates the
lettered rows up front (callers clamp count to 1-26).

**Letters are now an internal detail only (S72C).** Volunteers and visitors see
group *numbers* (1, 2, 3), never "Group A". The lettered `name` column and the
two `chr(64 + ...)` expressions survive purely as the internal join key ∙ that
was a deliberate decision, not an oversight. If you are adding UI, render
`group_number`; if you are writing a query that joins groups, the letter is
still what matches.

Per-session capacity is `bootstrap_sessions.max_group_size` (migration `015`,
default 20). It is set at session creation and enforced by the check-in INSERT.

Group NUMBERS handed to leads are separate from group letters and are assigned
FCFS by `assignGroupNumbers` (migration `016` added
`bootstrap_volunteers.group_number`):

- Runs on session activation and again each time a group volunteer registers.
- Idempotent: only fills NULL `group_number`s, so re-activation never
  reshuffles anyone. It offsets past already-assigned leads to continue the
  round-robin rather than restart at 1.
- Round-robins leads over the session's groups in name order (Group A = 1, B =
  2, ...), so with more leads than groups they spread evenly.
- The first lead assigned into a group also becomes that group's `team_lead_id`
  if it had none -- which is what the QR check-in flow resolves the group
  through.

An admin can also manually set a group's lead via
`PATCH /api/admin/bootstrap/groups/[id]/lead` with `{ lead_id }` (or null).

---

## Proximity / "Suggest" Features

There are two distinct "suggestion" mechanisms. Do not confuse them.

### 1. Automatic proximity redirect (client-side, leads only)

Migration `008` gave stalls map coordinates (`map_x`, `map_y`). On each poll,
`BootstrapDashboard` looks for stalls that just freed with NO group waiting in
their queue while the lead's group is queued somewhere else. It ranks those
freed stalls by distance from the stall the group is queued at and surfaces the
nearest as "-> {name} is free and nearby" (auto-dismissed after 12 seconds). The distance is aspect-ratio corrected: percentage deltas are
scaled by the map's pixel dimensions (1024 x 419) so the metric is isotropic
rather than overweighting the vertical axis. These suggestions are suppressed
while the lead is in classroom mode.

### 2. Admin manual stall suggestion (server-side)

An admin can point any volunteer at a stall via
`PATCH /api/admin/bootstrap/volunteers/[id]/suggest` with `{ stall_id }` (string
or null), backed by `suggestStallToVolunteer` writing `suggested_stall_id`
(migration `009`). The volunteer's dashboard shows an "ADMIN SUGGESTS -> {stall}"
banner (delivered via the `mySuggestion` field on the stalls poll). Dismissing
it calls `POST /api/bootstrap/suggestion/dismiss`, which sets
`suggested_stall_id` back to null server-side -- so the banner stays gone across
polls and devices, not just locally. (The same `suggested_stall_id` also
records which stall a stall-volunteer chose at registration and drives the admin
"Stall" column.)

### Classroom mode

Migration `016` added `in_classroom`. A lead toggles it from the dashboard via
`PATCH /api/bootstrap/classroom` (`setClassroomMode`). While on, redirect
suggestions and queue actions are paused and the stall cards render read-only,
so a lead running a classroom session is not nagged. The state rides the poll
payload so it survives re-login and shows up in the admin "Classroom" column as
"IN CLASS".

---

## Map System

The campus map is a hardcoded SVG schematic, not an uploaded image.

- `BootstrapMapSVG.tsx` draws a fixed `viewBox="0 0 1024 419"` schematic of the
  Bootstrap zone: parking apron, two classroom wings, club room, the Avions
  building, and the road corridor. The geometry was measured from a pre-rotated
  reference photo (`bootstrap_references/college1.png`) so the 1024 x 419 box
  matches the image pixel-for-pixel.
- Stalls with a `map_x`/`map_y` (percentages 0-100 from the top-left) render as
  colored dots (green free, orange occupied, yellow queued) with alternating
  above/below labels so tightly packed corridor stalls do not overlap. A legend
  sits at the bottom.
- `DEFAULT_STALL_POSITIONS` in the service maps common stall-name keywords to
  default coordinates, pre-filling pins at session creation.

### Positioning (pin-drop)

The admin dashboard renders `BootstrapMapSVG` inline in a "Stall positions on
map" section. Click a stall's PLACE PIN button, then click the map; the click
is converted to percentages and sent to
`PATCH /api/admin/bootstrap/stalls/[id]/position` with `{ map_x, map_y }`
(validated 0-100). Sending `{ map_x: null, map_y: null }` clears the pin. The
local state updates optimistically; the 4-second poll confirms.

### Map image field

`bootstrap_sessions.map_image_url` (migration `008`) and
`PATCH /api/admin/bootstrap/sessions/[id]/map` (`setSessionMapImage`) still
exist to store a session map image URL, and the stalls poll returns it, but the
live volunteer/admin views render the hardcoded SVG rather than that image.

---

## Feedback + AI Summary

### The visitor feedback form

Public page `src/app/bootstrap/feedback/page.tsx` renders
`BootstrapFeedback.tsx` (5 quick questions, mostly taps). Fields:

- Q1 Overall experience, 1-10 -- the only required question (primary metric).
- Q2 Which stall (optional dropdown).
- Q3 Rate that stall, 1-5 -- shown only once a stall is picked.
- Q4 Likelihood to join Vegavath, 1-5.
- Q5 Free-text suggestions (max 1000 chars).

Its QR code is generated from the admin QR tool, `/admin/qr`, which lists
`/bootstrap/feedback` since S76D (shareable, but not in the sitemap).

It POSTs to `POST /api/bootstrap/feedback`. The route validates ranges (overall
1-10 required; stall rating and join likelihood 1-5 if present), verifies any
`stall_id` belongs to the active session, and calls `submitBootstrapFeedback`.

Storage is `bootstrap_feedback` (migration `014`, extended by `017`). Column
mapping matters here:

- `overall_rating` INTEGER 1-10 -- primary metric (added in `017`).
- `rating` INTEGER 1-5 -- reused as the optional per-stall score.
- `join_likelihood` INTEGER 1-5, `memorable_stall` TEXT, `suggestions` TEXT
  (all added in `017`).
- `comment` TEXT -- the legacy free-text column, kept for older rows and
  UNIONed with `suggestions` in the admin summary via
  `coalesce(f.suggestions, f.comment)`.

### The admin feedback summary

`GET /api/admin/bootstrap/sessions/[id]/feedback` (`getBootstrapFeedbackSummary`)
returns totals (average overall out of 10, average join likelihood out of 5),
per-stall average ratings, and recent comments. The admin dashboard shows these
as stat tiles, a per-stall table, and a collapsible list of recent suggestions.
This loads once and refreshes on demand (not on the 4s poll).

### The AI summary (Gemini)

`POST /api/admin/bootstrap/sessions/[id]/summarize` (Session 38) is triggered by
a SUMMARISE FEEDBACK button. It:

1. Pulls raw rows via `getBootstrapFeedbackRaw` (SQL stays in the service
   layer, per the architecture contract; the route only shapes text and calls
   the API).
2. Computes average overall and join scores and builds a compact text prompt.
3. Calls Google's Gemini 3.5 Flash
   (`generativelanguage.googleapis.com/.../gemini-3.5-flash:generateContent`),
   requiring `GEMINI_API_KEY` (503 if unset), asking for a ~250-350 word
   leadership summary with fixed sections (Overall Experience, What Worked, What
   Needs Improvement, Stall Insights, Recruitment Signal, Top 3 Actionable
   Suggestions).
4. Returns `{ summary, responseCount, avgOverall, avgJoin }`, rendered in a
   modal (with `**bold**` markdown turned into styled spans). Errors map to 404
   (no feedback), 502 (Gemini error / empty), or 500.

---

## Admin Dashboard for Bootstrap

Entry point: `src/app/(admin)/admin/bootstrap/page.tsx`. It re-checks
`session.user.isAdmin` inside the page (redirecting to `/admin` if not) even
though middleware already guards `/admin` -- both layers are kept per the
architecture contract. It loads all sessions and branches:

- No active session -> `BootstrapSessions.tsx`: a table of sessions (name,
  created date, stall count, status) with CREATE SESSION, plus ACTIVATE, edit
  and DELETE for inactive rows, and a stale-session nudge after 7 days; and the
  **pre-registration pool** (see below).
- Active session -> `BootstrapAdminDashboard.tsx`: the live control panel.

Viewers see both read-only: every write control, including the Sheets export,
is hidden, and every mutating route returns 403 for them.

`BootstrapAdminDashboard` polls `GET /api/admin/bootstrap/sessions/[id]` every 4
seconds, which returns stalls, volunteers, and groups together. It provides:

- Header actions: **DISTRIBUTE GROUPS** (S73D, below), **END ALL VISITS** (S73C,
  below), and **DEACTIVATE SESSION**.
- Long-wait alerts, one per waiting GROUP (S73B -- it used to be one per stall),
  from each queue entry's `queued_at`.
- A stats bar: FREE / OCCUPIED / QUEUED counts and ACTIVE VOLUNTEERS count.
- The shared feedback URL (`{origin}/bootstrap/feedback`). Per-lead check-in
  URLs are NOT shown here -- they live on each lead's own dashboard.
- Add / remove stalls while live (S49).
- The **stall table**: the volunteers behind each stall, the live group-capacity
  control (1-10), the groups AT the stall, and the queue in order -- including
  advisory placements not yet accepted. Expanding a stall opens the override
  form: pick a status, edit `claimed_by` as a comma-separated list, Apply ->
  `PATCH /api/admin/bootstrap/stalls/[id]` (no conflict check; freeing always
  clears `claimed_by`). Because status is derived, the override's real effect is
  on `claimed_by`; an admin cannot "mark a stall queued" -- the queue is groups.
- **Visitor Groups** (S73G): Group, Lead, Checked in, and a CHECKLIST action
  opening the same `ManualChecklistPanel` the leads use.
- Two volunteer tables split by role (Stall Volunteers and Group Volunteers).
  Each shows name, username, stall or group, phone, the plaintext login code, an
  ACTIVE / LOGGED OUT badge, UNLOCK for active accounts, RESET CODE, an inline
  details editor (name / phone / SRN), and the role change. The group table also
  has the SUGGEST STALL dropdown and an IN CLASS indicator; pending switch
  requests get APPROVE / deny.
- The feedback section (summary tiles, per-stall table, recent suggestions,
  REFRESH, and SUMMARISE FEEDBACK).
- A collapsible "Stall positions on map" pin-drop editor.

### Full admin API surface

Session-scoped, all under `/api/admin/bootstrap/`:

| Route | Method | Purpose |
| --- | --- | --- |
| `sessions` | POST | Create session + stalls + groups, then auto-assign the pool. |
| `sessions/[id]` | GET | Live poll: stalls + volunteers + groups. |
| `sessions/[id]` | PATCH | Rename / change the visitor cap (S49). |
| `sessions/[id]` | DELETE | Delete an inactive session (cascades). |
| `sessions/[id]/active` | PATCH | Activate (deactivates others) / deactivate. |
| `sessions/[id]/stalls` | POST, DELETE | Add a stall to a live session / delete one (S49). |
| `sessions/[id]/distribute` | POST | Advisory auto-distribution of groups across stalls (S73D). |
| `sessions/[id]/sweep-visits` | POST | Close every still-open visit (S73C). |
| `sessions/[id]/groups/[groupId]/checklist` | GET, PATCH | Admin manual checklist for one group (S73G). |
| `sessions/[id]/feedback` | GET | Feedback summary. |
| `sessions/[id]/summarize` | POST | Gemini AI feedback summary. |
| `sessions/[id]/groups` | POST | Ensure N groups, then auto-batch unassigned visitors round-robin. |
| `sessions/[id]/visitors` | GET | Full visitor list, newest first. |
| `sessions/[id]/map` | PATCH | Set the session map image URL. |
| `stalls/[id]` | PATCH | Admin status/`claimed_by` override. |
| `stalls/[id]/max-groups` | PATCH | Live group capacity, 1-10 (S73B). |
| `stalls/[id]/position` | PATCH | Set/clear a stall's map pin. |
| `volunteers/[id]` | PATCH, DELETE | Correct a volunteer's name / phone / SRN (S55); delete a pool entry (S55B). |
| `volunteers/[id]/assign` | PATCH | Pull a pool member into a session, at a stall (S49). |
| `volunteers/[id]/reset-code` | POST | Issue a new login code (S55C). |
| `volunteers/[id]/unlock` | PATCH | Clear a stuck session token. |
| `volunteers/[id]/role` | PATCH | Flip a volunteer between `stall` and `lead`. |
| `volunteers/[id]/suggest` | PATCH | Point a volunteer at a stall (or clear). |
| `volunteers/[id]/switch-request` | PATCH | Approve / deny a stall switch request (S72C). |
| `volunteers/pool/export` | GET | CSV of the whole pre-registration pool (S73K). |
| `volunteers/pool/export/google` | POST | The pool into the shared Google Sheet (S73K). |
| `volunteers/pool/delete-all` | POST | Wipe the pool between events (S73K). |
| `groups/[id]/lead` | PATCH | Assign / clear a group's team lead. |

Every one of these begins by calling `auth()` and returning 401 unless
`session.user.isAdmin`, and every mutating one then returns 403 for a viewer
(S47). Request and response details for each are in
[API Routes -- File Reference](/docs/files-api).

### Auto-batch visitors

`sessions/[id]/groups` (POST) is the "auto-batch" tool: it ensures N groups
exist, then `assignUnassignedVisitors` spreads every visitor with a null
`group_id` across the groups round-robin by arrival order. Useful when visitors
arrived without scanning a specific lead's QR.

### Distribute groups (S73D)

`sessions/[id]/distribute` (POST) is ADVISORY: `distributeGroups` writes
suggestions as `bootstrap_stall_queue` rows with `accepted_at` NULL and no
`volunteer_id`, and each lead accepts (HEADING THERE) or declines (NOT NOW) on
their own dashboard. It is re-runnable and idempotent -- the candidates are
groups with no queue row anywhere, so a second press only fills gaps and never
reshuffles. Groups that fit nowhere simply get no row.

### End all visits (S73C)

Visits close only when a stall volunteer taps RELEASE, and at the end of a real
event people just walk away. `sessions/[id]/sweep-visits` (POST) closes every
still-open visit in the session and returns how many. It is deliberately its
own action, not a side effect of deactivating the session.

### The pre-registration pool (S49, S73K, S74B)

Volunteers who register at `/bootstrap/register/pool` (always open, either
role) sit in the pool with `session_id = NULL` until a session is created
(auto-assign, above) or an admin assigns them. The pool table on the sessions
view shows name, SRN, phone, **Prefers** (the preferred stall, or LEAD), the
login code and when they registered, with ASSIGN (pick a session and stall),
edit, RESET CODE and delete per row. Bulk actions: EXPORT CSV, EXPORT TO GOOGLE
SHEETS (the "Pool Volunteers" tab of the shared sheet), and DELETE ALL, which
confirms with the count and offers EXPORT FIRST. The wipe's SQL carries
`WHERE session_id IS NULL`, so it can never reach an assigned volunteer.

---

## Data Model Quick Reference

| Table | Key columns | Introduced / extended |
| --- | --- | --- |
| `bootstrap_sessions` | `name`, `is_active`, `created_at`, `map_image_url`, `max_group_size` | `007`, `008` (map url), `015` (group size) |
| `bootstrap_stalls` | `stall_number`, `stall_name`, `status` (stored but derived on read), `max_occupancy` (1-4), `max_groups` (1-10), `time_limit_minutes`, `claimed_by TEXT[]`, `map_x`, `map_y`, `lead_names`; `queued_by` / `queued_at` unused since `027` | `007`, `008`, `009` (queued_at), `015` (lead_names), `027` (max_groups), `029` (time limit, occupancy 4) |
| `bootstrap_volunteers` | `username`, `password_hash`, `display_name`, `current_session_token`, `role`, `suggested_stall_id`, `checkin_token`, `login_code`, `phone`, `srn`, `group_number`, `in_classroom`, `created_at`, `preferred_stall_name`, `switch_requested_stall_id`, `switch_requested_at` | `007`, `009`, `014` (role), `015` (checkin_token), `016` (self-register fields), `021` (nullable session_id + preferred_stall_name), `025` (switch request pair) |
| `bootstrap_groups` | `name`, `team_lead_id`, `created_at` | `014` |
| `bootstrap_stall_queue` | `stall_id`, `group_id`, `volunteer_id` (NULL = an admin placement), `queued_at`, `accepted_at`; UNIQUE(stall_id, group_id) | `027` |
| `bootstrap_stall_visits` | `session_id`, `stall_id`, `group_id`, `volunteer_id`, `arrived_at`, `left_at` (NULL = here now); UNIQUE(stall_id, group_id) = the revisit ban | `028` |
| `bootstrap_visitors` | `name`, `prn`, `phone`, `group_id`, `arrived_at` | `014` |
| `bootstrap_feedback` | `stall_id`, `rating` (1-5 per-stall), `comment` (legacy), `overall_rating` (1-10), `memorable_stall`, `join_likelihood`, `suggestions`, `submitted_at` | `014`, `017` |

Notes:

- All Bootstrap SQL lives in `src/lib/services/bootstrap.ts`; pages and routes
  call service functions and never inline SQL (architecture contract).
- Migrations are NOT auto-applied -- each file header says to run it manually
  against the live Neon database before deploying.
- `claimed_by` is a Postgres `TEXT[]`, mutated only in SQL via `array_append` /
  `array_remove` / `string_to_array`; a JS array is never passed as a driver
  parameter.
- `session_id` is **nullable** since migration `021`. A NULL means
  "pre-registration pool member": they have an account, cannot log in yet, and
  an admin assigns them later. `UNIQUE(session_id, username)` does NOT
  constrain pool rows, because Postgres treats NULLs as distinct ∙ the
  one-account-per-SRN rule for the pool is enforced in application code
  (`getPoolVolunteerBySrn`), not by the database.
- Deleting a session still cascades to its assigned volunteers while pool
  members survive, which is why the `ON DELETE CASCADE` was left untouched.
- Groups are stored as "Group A", "Group B" (the `UNIQUE(session_id, name)`
  join key) but no UI renders the letter: `groupLabel`
  (`src/lib/utils/group.ts`, S73K) shows "Group 1". Full column detail for
  every table is in [Database Schema](/docs/database).

---

## Route Map (Pages)

| Path | Access | Purpose |
| --- | --- | --- |
| `/bootstrap` | Volunteer cookie | Login screen, or the role-appropriate dashboard. |
| `/bootstrap/register/stall` | Public | Stall volunteer self-registration. Needs an active session (S74B). |
| `/bootstrap/register/group` | Public | Group volunteer self-registration. Needs an active session. |
| `/bootstrap/register/pool` | Public | Pre-registration, always open, either role (S74B). |
| `/bootstrap/checkin/[token]` | Public | Visitor check-in into a lead's group via QR. |
| `/bootstrap/checklist/[id]` | Public (visitor row id) | The student's own stall checklist (S73D). |
| `/bootstrap/feedback` | Public | Visitor feedback form. |
| `/admin/bootstrap` | Admin (NextAuth) | Session list or the live control dashboard. |

Middleware (`src/middleware.ts`) only auth-gates `/admin` and `/api/admin`.
Every public `/bootstrap/*` page and `/api/bootstrap/*` endpoint passes through
without a session; their own logic (an active session, a valid token, the
volunteer cookie) is the gate.
