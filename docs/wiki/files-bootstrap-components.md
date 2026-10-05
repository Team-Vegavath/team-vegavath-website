# Bootstrap Components

_Current as of Session 82C (2026-10-05). Rewritten for the S73B-S77 changes:
the per-stall queue table, the visit log and its mandatory group naming, the
group roster and checklist, advisory auto-placement, the manual checklist
backup, "Group 1" labels, and the per-stall time limit. See
`docs/wiki/bootstrap.md` for the flow._

A file-by-file reference for every React component under
`src/components/bootstrap/`, drawn directly from the source. For how these
pieces fit into the wider event-day system (sessions, auth, the service layer,
API routes, migrations), see `docs/wiki/bootstrap.md`; this document is the
component-level companion to it.

Every component in this directory except `BootstrapChecklist` (a server
component) is a Client Component (`"use client"`), and every one styles itself inline from the exported `BS` palette in
`StallCard.tsx` rather than the site's globals.css tokens (see the note in
`StallCard.tsx` below for why).

## Contents

- [BootstrapDashboard.tsx](#bootstrapdashboardtsx) -- the lead's full dashboard (most complex)
- [StallVolunteerView.tsx](#stallvolunteerviewtsx) -- the stall volunteer's stripped-down view
- [StallCard.tsx](#stallcardtsx) -- a single stall card + the exported `BS` palette
- [BootstrapMapSVG.tsx](#bootstrapmapsvgtsx) -- the hardcoded SVG campus map
- [CheckinQROverlay.tsx](#checkinqroverlaytsx) -- copy-link + full-screen QR for a lead's check-in URL
- [BootstrapLogin.tsx](#bootstraplogintsx) -- volunteer login screen
- [BootstrapRegister.tsx](#bootstrapregistertsx) -- self-registration (stall + group variants)
- [BootstrapCheckin.tsx](#bootstrapcheckintsx) -- visitor check-in form
- [BootstrapFeedback.tsx](#bootstrapfeedbacktsx) -- visitor feedback form
- [BootstrapChecklist.tsx](#bootstrapchecklisttsx) -- a student's stall checklist page (S73D)
- [ManualChecklistPanel.tsx](#manualchecklistpaneltsx) -- the manual checklist backup control (S73G)
- [StallTimeLimitCountdown.tsx](#stalltimelimitcountdowntsx) -- the lead's per-stall countdown (S77)

---

## BootstrapDashboard.tsx

`src/components/bootstrap/BootstrapDashboard.tsx` -- the client component behind
`/bootstrap` for a logged-in volunteer. It polls stall state, then either renders
the full group-LEAD dashboard itself or delegates to `StallVolunteerView` for
"stall" volunteers.

### Props

| Prop | Type | What it does |
| --- | --- | --- |
| `displayName` | `string` | Header name. |
| `username` | `string` | The lowercased SRN; used to test ownership of `claimed_by` and passed down. |
| `initialRole` | `"stall" \| "lead"` (default `"stall"`) | Server-rendered role so the right view shows before the first poll. |

### State (poll-fed unless noted)

| State | Tracks |
| --- | --- |
| `stalls` | The stall list: derived status, `occupants` (groups at the stall, S73C), `queue` (S73B), `max_groups`, `time_limit_minutes` (S77). |
| `mySuggestion`, `mySuggestionId` | The admin's stall suggestion; the id is a stall volunteer's own stall (S72B). |
| `switchRequestStallId`, `switchRequestStallName` | A stall volunteer's pending switch request (S72C). |
| `volunteerNames` | username -> display name, for the release confirmation (S72C). |
| `actionError` | Why an action was refused (role or ownership gate, S72B). Not poll-fed. |
| `volunteerRole`, `checkinToken`, `groupNumber`, `inClassroom` | Live role (an admin flip lands within 4s), the lead's QR token (S33), FCFS group number (S35), classroom mode (S36). |
| `myGroupId`, `myGroupSize` | The lead's own group (S73B, resolved server-side) and its headcount (S73D). |
| `roster`, `rosterOpen`, `rosterLoading` | The group roster, fetched on demand (S73D). |
| `manualOpen`, `manualStalls`, `manualLoading`, `manualBusy`, `manualError` | The manual checklist backup (S73G). |
| `origin`, `showMap`, `lastUpdated`, `now` | Check-in URL base (set after mount), map overlay, freshness label ("LIVE / Xs ago", 1s ticker). |
| `connectionIssue` | True after 3 consecutive poll failures (`failCount` is a ref). |
| `freedNotifications`, `redirectSuggestions` | Freed-stall toasts and nearby-free suggestions. |

### Key functions and endpoints

- `poll()` -- `GET /api/bootstrap/stalls`; a 401 (admin unlock or session ended)
  hard-redirects to `/bootstrap`. Then freed-stall detection:
  - A stall that went from non-free to `free` becomes a toast (auto-dismiss 8s).
    `forme` is read from the CURRENT row's queue (S73B): releasing no longer
    clears the queue, so the "your group can head over" banner fires only while
    the group's queue entry genuinely still exists -- a lead who left the queue
    gets nothing.
  - Stalls that freed with nobody queued become redirect suggestions, ranked by
    map distance from the stall the lead is queued at (isotropic: percentage
    deltas scaled by the 1024 x 419 map), unless classroom mode is on (read fresh
    from the payload). Auto-dismiss 12s.
- `sendAction(stallId, action, groupId?)` -- `PATCH /api/bootstrap/stalls/[id]`
  with `{ action, group_id }`; swaps the returned stall in optimistically, and
  shows the server's refusal in `actionError`.
- `requestSwitch(stallId)` -- `POST /api/bootstrap/switch-request` (stall volunteers).
- Roster -- `GET /api/bootstrap/roster` when opened; names and SRN/PRN only.
- Manual checklist -- `GET` / `PATCH /api/bootstrap/checklist/manual`.
- Classroom toggle -- `PATCH /api/bootstrap/classroom`; suggestion dismiss --
  `POST /api/bootstrap/suggestion/dismiss`; `signOut()` -- `POST /api/bootstrap/logout`.

### The poll loop

`POLL_MS = 4000`; a `visibilitychange` listener pauses it while hidden and
polls-then-restarts on return (a battery / Neon courtesy, not a correctness
requirement). A separate 1s interval only updates `now`.

### Role branching

`volunteerRole === "stall"` returns `<StallVolunteerView>` with the stalls, the
assigned stall id, the switch-request state, `actionError`, the live label, and
`onAction` / `onRequestSwitch` / `onSignOut` wrappers. Everything below is the
lead dashboard.

### Render logic (lead dashboard)

- Sticky header: name, LIVE dot and freshness label, CLASSROOM MODE toggle
  (S36: pauses redirect suggestions and queue actions), MAP, Sign out. A red
  "CONNECTION ISSUES" banner and the `actionError` banner sit under it.
- **Your group** card: "Group {n}" (S35), the headcount (S73D) with a tap-to-open
  roster overlay, and a CHECKLIST button opening `ManualChecklistPanel` (S73G --
  a backup for when a stall volunteer missed logging the visit).
- **Countdown** (S77): `StallTimeLimitCountdown` for the lead's current open visit
  at a stall with a time limit, keyed on `arrived_at` so a new stall remounts it.
  A hidden `<audio>` (the chime) is primed on the lead's first tap, because
  browsers block programmatic `play()` until the user has interacted.
- **Advisory placements** (S73D): for each stall where the admin's distribute
  pass placed this group (`is_advisory` -- the queue row has no `volunteer_id`), a
  card with HEADING THERE (`accept_queued`) and NOT NOW (`unqueue`; leaving it
  unaccepted would bring the card straight back).
- **Your group check-in link** (S33): `CheckinQROverlay` with
  `{origin}/bootstrap/checkin/{token}`.
- Freed-stall toasts, redirect suggestions, the blue ADMIN SUGGESTS banner.
- The `StallGrid` of `StallCard`s, passed `role` and `myGroupId`; in classroom mode
  they get no `username` / `onAction`, so they render read-only.
- Full-screen map and roster overlays (tap anywhere to close).

### Why it exists

The lead's command centre on Bootstrap day, built for a flaky captive-portal
network: short polling instead of WebSockets (Vercel serverless holds no sockets),
optimistic actions that self-heal on the next poll, and notifications derived
client-side. The role split keeps stall volunteers out of all of it.

---

## StallVolunteerView.tsx

`src/components/bootstrap/StallVolunteerView.tsx` -- the UI for `role="stall"`
volunteers. Since S72B a stall volunteer is LOCKED to their assigned stall
(`assignedStallId`, the admin's suggestion); since S73C occupying it means naming
which group arrived.

### Props

| Prop | Type | What it does |
| --- | --- | --- |
| `displayName`, `username` | `string` | Header name; `username` tests `claimed_by`. |
| `stalls` | `BootstrapStall[]` | From the parent's poll. |
| `assignedStallId` | `string \| null` | The volunteer's own stall. Null shows "waiting for an assignment". |
| `switchRequestStallName`, `hasSwitchRequest` | | A pending switch request (S72C); shown as "WAITING FOR AN ADMIN TO APPROVE". |
| `actionError`, `connectionIssue`, `liveLabel` | | Refusal text, the retry banner, "LIVE / Xs ago". |
| `onAction` | `(stallId, action, groupId?) => void` | Claim / release through the parent's `sendAction`. |
| `onRequestSwitch` | `(stallId) => void` | Raises a switch request. |
| `onSignOut` | `() => void` | |

### State

| State | Tracks |
| --- | --- |
| `pickerOpen` | The switch-request picker (the one remaining multi-stall list). |
| `groupMode` | `"arrive"` / `"leave"` / null -- the mandatory group picker (S73C). |
| `candidates`, `loadingGroups` | Groups that may still arrive, fetched from `GET /api/bootstrap/stalls/[id]/groups`. |

### Render logic

- Header, retry banner, `actionError`.
- The assigned stall's card: status, **HERE NOW** -- the groups at the stall from
  open visits (S73C), as "Group 1" labels (S73K) -- and the volunteers on it.
- **Group arrived** (shown only while the stall has group capacity left,
  `max_groups`) opens the "Which group just arrived?" picker -- groups that have not
  visited this stall. Picking one claims the stall AND logs the visit. If every
  group has already been, an escape claims the stall with no visit.
- **Release** -- with ONE group here, the single tap it has always been. With
  several, **Group left** opens "Which group is leaving?" (the groups here now; no
  fetch), so one group leaving never silently closes another's visit. The
  volunteer only steps off the stall when the last group leaves.
- **Request switch** opens the picker of other stalls; a pending request shows
  the waiting state instead.

### Why it exists

Stall volunteers have one job: keep their own stall's state, and now its visit
log, accurate. Locking them to one stall (S72B) stopped a single login occupying
every stall; naming the group on arrival (S73C) is what the checklists and roster
are built from.

---

## StallCard.tsx

`src/components/bootstrap/StallCard.tsx` -- one stall card, in volunteer mode
(rule-based action buttons) or admin mode (tap-to-expand override form). It also
exports the Bootstrap palette and grid helpers the rest of the directory imports.

### Exports

- `BS` -- the standalone Bootstrap palette (below).
- `bootstrapBtnStyle` -- the admin override form's button style.
- `StallGrid` -- a responsive grid (1 column, 2 at >= 600px) via a scoped `<style>`.
- `VolunteerStallAction` -- `"claim" | "release" | "mark_queued" | "unqueue" |
  "accept_queued"` (the last added in S73D).
- `waitMinutes(queued_at)` -- floor-minutes since a timestamp (0 for null).
- `StallCard` (default).

### The exported `BS` palette

A frozen (`as const`) object of hex/rgba strings, kept deliberately separate
from globals.css tokens: every style in these components is inline anyway, and
`StallCard` also renders inside `/admin` pages where a Bootstrap-layout CSS
cascade would not reach. Keys and values:

| Key | Value | Role |
| --- | --- | --- |
| `bg` | `#0a0a0a` | Page background. |
| `surface` | `#161616` | Card surface. |
| `elevated` | `#1d1d1d` | Inputs / raised panels. |
| `border` | `rgba(255,255,255,0.08)` | Default hairline border. |
| `borderStrong` | `rgba(255,255,255,0.25)` | Emphasised border (buttons). |
| `text` | `#f0f0f0` | Primary text. |
| `muted` | `#888888` | Secondary/label text. |
| `free` | `#22c55e` | Free status (green). |
| `occupied` | `#f97316` | Occupied status (orange). |
| `queued` | `#eab308` | Queued status (yellow). |
| `danger` | `#ef4444` | Errors / release / connection issues (red). |
| `accent` | `#EF5D08` | Brand accent (primary buttons, highlights). |

Note the two near-oranges are distinct: `occupied` is `#f97316`, the brand
`accent` is `#EF5D08`.

### Props (StallCard)

| Prop | Type | What it does |
| --- | --- | --- |
| `stall` | `BootstrapStall` | The stall. |
| `username` | `string?` | Volunteer mode: whose ownership to test. With `onAction` it switches on the buttons. |
| `role` | `"stall" \| "lead"`? | Picks the rule set. |
| `myGroupId` | `string \| null`? | The viewing lead's own group (S73B), to tell "my group is queued here". |
| `onAction` | `(action) => void`? | Volunteer mode callback. |
| `expanded`, `onToggle`, `actions` | | Admin mode: `onToggle` marks admin mode; `actions` is the override form. |

### The button rules (`volunteerButtons`, S73B)

- **Stall volunteers** (claim / release only -- the server 403s them for leads):
  nobody here -> **Claim**; on it -> **Release**; others on it with room
  (`claimed_by.length < max_occupancy`) -> **Join**. No queue buttons, by
  construction. (In practice a stall volunteer sees `StallVolunteerView`, not this.)
- **Leads**: their group is queued here -> **Leave queue** (`unqueue`); otherwise,
  if someone is at the stall -> **Mark queued**. A lead whose group is queued at a
  stall that just went FREE still gets Leave queue, because release no longer
  clears the queue (S73B) -- that surviving row is what drives the "head over"
  banner.

### Render logic

The stall name, a status pill, "Leads: ..." (informational), the volunteers on it,
**Here now:** the groups at the stall (S73C), and **Waiting:** every queued group in
order with its wait in minutes (S73B -- the whole queue, not one name). Group names
go through `groupLabel` ("Group 1", S73K). Volunteer mode shows the buttons
stacked below; admin mode makes the header a keyboard-accessible toggle for the
override form.

### Why it exists

One card serves the lead dashboard and the admin console, and the permission
model for who may claim, join, queue and leave lives in one place.

---

## BootstrapMapSVG.tsx

`src/components/bootstrap/BootstrapMapSVG.tsx` -- a hardcoded SVG schematic of
the Bootstrap zone with live stall dots, usable as a full-screen overlay, an
inline admin preview, or a click-to-place pin editor.

### Props

| Prop | Type | What it does |
| --- | --- | --- |
| `stalls` | `MapStall[]` | Stalls to plot; each has `id`, `stall_name`, `status`, and nullable `map_x`/`map_y`. |
| `onClose` | `() => void` | Closes the overlay (the header × button). |
| `inline` | `boolean` (default `false`) | Inline mode: renders `position: absolute` inside a relative wrapper (admin preview) and drops the header, instead of a `position: fixed` full-viewport takeover. `position: fixed` would escape any wrapper, so the preview must switch to absolute. |
| `editingStallId` | `string \| null` (default `null`) | Pin-drop mode: while set, a map click reports a position instead of doing nothing. |
| `onPositionSet` | `(stallId, x, y) => void`? | Called with the clicked position as percentages of the SVG box. |

No `useState`/`useReducer` -- this component is stateless; all its inputs come
from props.

### Key functions

- `handleSvgClick(e)` -- no-ops unless both `editingStallId` and `onPositionSet`
  are set. Converts the click to percentages of the rendered element's bounding
  box (rounded to one decimal) and calls `onPositionSet`. The comment notes the
  SVG's height is intrinsic (width 100% + fixed viewBox ratio) so the element box
  equals the viewBox with no letterbox offset. No API call -- the parent owns
  persistence.
- `label(x, y, text, size, fill)` -- small helper returning a centered `<text>`
  node for the building labels.

### Geometry

`W = 1024, H = 419`. The viewBox matches the pixel size of the reference photo
(`bootstrap_references/college1.png`), which was pre-rotated so the Bootstrap
road runs horizontal. Because stall `map_x`/`map_y` are percentages extracted
from that same image, they land on the drawing with zero conversion error. Six
ground-truthed structures are drawn as polygons: PARKING apron, two CLASSROOM
wings, CLUB ROOM, AVIONS, and the dashed-accent BOOTSTRAP ZONE road corridor.

### Render logic

- Full-screen mode (default): fixed, `zIndex: 100`, with a header ("STALL MAP" +
  × close button).
- Inline mode: absolute, `zIndex: 1`, no header.
- Pin-drop banner ("Click to place: {stall name}") appears only while
  `editingStall` resolves; the SVG cursor becomes a crosshair.
- Stall dots: only stalls with non-null `map_x`/`map_y` are plotted. Each dot is
  a filled circle (colored `free`/`occupied`/`queued` from `BS`) with a faint
  glow ring and a white stroke. Labels alternate above/below the dot by index
  parity so tightly packed corridor stalls do not overwrite each other, and names
  over 12 chars are truncated with an ellipsis.
- A legend row (FREE / OCCUPIED / QUEUED swatches) sits at the bottom.

### Why it exists

A hardcoded SVG beats an uploaded map image: it is crisp at any zoom, needs no
R2 upload, and -- because its coordinate space is fixed and matches the source
photo -- stall percentage coordinates drop straight onto it. The same component
does triple duty (volunteer overlay, admin inline preview, pin editor) via the
`inline` and `editingStallId` props.

---

## CheckinQROverlay.tsx

`src/components/bootstrap/CheckinQROverlay.tsx` -- replaces the raw check-in URL
on a lead's dashboard with a COPY LINK button and a full-screen QR students can
scan.

### Props

| Prop | Type | What it does |
| --- | --- | --- |
| `checkinUrl` | `string` | The lead's personal check-in URL; both copied to clipboard and encoded into the QR. |

### State

| State | Type | Tracks |
| --- | --- | --- |
| `open` | `boolean` | Whether the full-screen QR overlay is showing. |
| `copied` | `boolean` | Momentary "COPIED!" confirmation state. |

### Key functions

- `copyLink()` -- `navigator.clipboard.writeText(checkinUrl)`, sets `copied` for
  2000 ms. Wrapped in try/catch because clipboard access throws in insecure
  contexts; the QR overlay is the documented fallback. No API calls.

### Module constants

`R2_BASE` reads `process.env.NEXT_PUBLIC_R2_PUBLIC_URL` (inlined into the client
bundle at build time); `R2_LOGO` points at `/icons/logo.png` on it. The logo is
embedded in the QR's center only when `R2_BASE` is set.

### Render logic

- Always: a COPY LINK button (turns green with "COPIED!" for 2s after a copy) and
  a SHOW QR button.
- When `open`: a fixed full-screen scrim (`zIndex: 200`). Clicking the scrim
  closes it; clicks on the inner white card `stopPropagation` so they do not
  close it. The card holds a 280px `QRCodeSVG` (from `qrcode.react`, dark-on-light
  with the optional excavated logo) and the raw URL text. A "TAP ANYWHERE TO
  CLOSE" button sits below.

### Why it exists

On event day a lead holds up their phone for a queue of freshers to scan; a
raw URL is useless for that. This gives a big scannable QR plus a copy fallback,
and degrades gracefully when the clipboard API is blocked.

---

## BootstrapLogin.tsx

`src/components/bootstrap/BootstrapLogin.tsx` -- the volunteer login screen shown
at `/bootstrap` when there is no valid volunteer cookie.

### Props

None.

### State

| State | Type | Tracks |
| --- | --- | --- |
| `username` | `string` | Username field (the volunteer's SRN). |
| `password` | `string` | Password field (their login code). |
| `error` | `string` | Uppercased error message. |
| `busy` | `boolean` | In-flight submit; disables the button. |

### Key functions

- `handleSubmit(e)` -- `POST /api/bootstrap/login` with `{ username, password }`.
  On `res.ok` it does a full `window.location.href = "/bootstrap"` reload so the
  server component re-checks the cookie. On 409 it shows "ACCOUNT IN USE - ASK
  ADMIN TO UNLOCK". Otherwise it reads the JSON error and shows either "NO ACTIVE
  SESSION - ASK ADMIN" (when the error is "No active session") or "INVALID
  CREDENTIALS". A network throw shows "CONNECTION FAILED - TRY AGAIN".

### Render logic

A centered card: an inline SVG club shield, "VEGAVATH / BOOTSTRAP" wordmark, then
the username + password form. The submit button reads "Signing in..." and dims
while `busy`. An error line renders in `BS.danger` when set. Below a divider, a
"First time? Register below." prompt with two link buttons to
`/bootstrap/register/stall` and `/bootstrap/register/group`. A scoped `<style>`
tag applies the accent focus border with `!important` to beat the inline border.

### Why it exists

Volunteer auth is intentionally separate from admin NextAuth -- this is the
front door for the lightweight per-day cookie session. The full reload after a
successful login is deliberate so the server-side cookie check runs cleanly.

**S74B.** Under the session-gated stall and group registration links there is now
an always-working **Pre-register** link to `/bootstrap/register/pool` -- the
fallback for anyone who lands here between events.

---

## BootstrapRegister.tsx

`src/components/bootstrap/BootstrapRegister.tsx` -- one component, two variants
for volunteer self-registration: stall volunteers pick the stall they will
manage; group volunteers just leave their details.

### Props

| Prop | Type | What it does |
| --- | --- | --- |
| `variant` | `"stall" \| "group"` | Which registration flow: stall adds a stall-picker; group does not. |
| `hasSession` | `boolean` | Whether a session is active; false gates the whole form behind "Registration is not open yet." |
| `stalls` | `{ id; stall_name }[]` (default `[]`) | Options for the stall dropdown (stall variant only). |

### State

| State | Type | Tracks |
| --- | --- | --- |
| `name` | `string` | Full name. |
| `phone` | `string` | Phone number. |
| `srn` | `string` | SRN/PRN (becomes the username). |
| `stallId` | `string` | Chosen stall id (stall variant). |
| `error` | `string` | Uppercased error message. |
| `busy` | `boolean` | In-flight submit. |
| `result` | `{ username; loginCode } \| null` | On success, the credentials to display. |

### Key functions

- `handleSubmit(e)` -- `POST /api/bootstrap/register/{variant}`. Body is
  `{ name, phone, srn, stall_id }` for the stall variant, `{ name, phone, srn }`
  for group. On a non-ok response it uppercases `data.error` (or "Registration
  failed"); on success it stores the `{ username, loginCode }` result. A network
  throw shows "CONNECTION FAILED - TRY AGAIN".

### Render logic (three states)

- `!hasSession` -> "Registration is not open yet."
- `result` set -> a "Registered!" screen showing the username (the SRN) and the
  login code as selectable `<code>` blocks, a reminder to save both for
  `/bootstrap` login (with an extra note for group volunteers that their group
  number appears on the dashboard after the day starts), and a back-to-login link.
- Otherwise -> the form: full name, phone (with a "+91 prefix is fine - it will
  be removed" hint), SRN/PRN, and for the stall variant a required stall dropdown.
  The submit button is disabled while `busy` or (stall variant) no stall picked;
  it reads "Registering..." in flight.

### Why it exists

Self-registration replaced the old admin-generated credential CSV. Folding both
volunteer types into one component keeps the shared field validation, styling,
and the "Registered!" credential screen in a single place; only the stall picker
and the request body differ.

**Since S72D.**
- **Three variants** (S74B): `stall` and `group` register INTO the active
  session and need one; `pool` (always open) asks which role is intended
  (`poolRole`: stall volunteer or group lead; a lead has no preferred stall) and
  posts to `/api/bootstrap/register/pool`. The stall variant without a session
  points at the pool instead of silently pooling the submission.
- SRN / PRN are validated against the real `SRN_PATTERN` / `PRN_PATTERN` (S73F),
  with generic examples (`PES1UG21CS999`, S73H).
- The phone field is capped at 10 and filtered to digits on every keystroke
  (`onDigitsChange`, S73I, S76B), with `inputMode="numeric"`.

---

## BootstrapCheckin.tsx

`src/components/bootstrap/BootstrapCheckin.tsx` -- the public visitor check-in
form reached by scanning a specific lead's QR (`/bootstrap/checkin/[token]`).

### Props

| Prop | Type | What it does |
| --- | --- | --- |
| `token` | `string` | The lead's check-in token, used in the POST URL. |
| `sessionName` | `string \| null` | Null means the token is unknown or no session is active (drives the "Not started yet" state). |
| `groupName` (as `assignedGroup`) | `string \| null` | The group the visitor is joining; shown as "Joining {group}" above the form. Renamed on destructure so the state variable can reuse the name. |
| `isFull` | `boolean` | Server-rendered capacity snapshot; the POST re-checks atomically. |

### State

| State | Type | Tracks |
| --- | --- | --- |
| `name` | `string` | Visitor's full name. |
| `prn` | `string` | Visitor's PRN/SRN. |
| `phone` | `string` | Visitor's phone. |
| `busy` | `boolean` | In-flight submit. |
| `error` | `string` | Error message. |
| `groupName` | `string \| null` | The group name returned on a successful check-in; its presence switches the view to the "Welcome!" success screen. |

### Key functions

- `submit(e)` -- `POST /api/bootstrap/checkin/{token}` with `{ name, prn, phone }`.
  On a non-ok response it shows `data.error` (or "Check-in failed. Please try
  again."); on success it stores `data.groupName`. A network throw shows "Request
  failed - check your connection."

### Render logic (four states, in order)

- `groupName` set (post-success) -> "Welcome!" with a big accent-bordered card
  showing the group name and "Your team lead will find you shortly."
- else `sessionName === null` -> "Not started yet" (bad token or no active
  session).
- else `isFull` -> "This group is full! Ask a different group lead to scan you
  in."
- else -> the check-in form (full name, PRN/SRN, phone -- all required
  client-side), with an optional "Joining {assignedGroup}" subtitle. The submit
  button is disabled until all three fields are non-empty and reads "Checking
  in..." in flight.

### Why it exists

Visitors never log in; they scan a lead's QR and land here. The server passes a
capacity snapshot for a fast "full" screen, but the actual INSERT is guarded
atomically server-side so two phones racing for the last slot cannot both
succeed -- the loser gets the 409 that surfaces as an error here.

**Since S72D.**
- PRN / SRN and phone use the shared validators (S73F); the phone field is capped
  at 10 and digit-filtered as typed (S73I, S76B).
- After a successful check-in the response's `visitorId` gives the student a
  link to their own checklist, `/bootstrap/checklist/{visitorId}`, with a COPY
  button (S73D). The group is named "Group 1", never by letter (S73K).

---

## BootstrapFeedback.tsx

`src/components/bootstrap/BootstrapFeedback.tsx` -- the public post-event visitor
feedback form (`/bootstrap/feedback`): five quick questions, mostly taps.

### Props

| Prop | Type | What it does |
| --- | --- | --- |
| `hasSession` | `boolean` | Whether Bootstrap is running; false shows the "Not running" state. |
| `stalls` | `{ id; stall_name }[]` | Options for the "which stall did you visit" dropdown. |

### State

| State | Type | Tracks |
| --- | --- | --- |
| `overall` | `number \| null` | Q1 overall rating (1-10), the only required answer. |
| `stallId` | `string` | Q2 selected stall id. |
| `stallRating` | `number \| null` | Q3 per-stall rating (1-5). |
| `joinLikelihood` | `number \| null` | Q4 likelihood to join (1-5). |
| `suggestions` | `string` | Q5 free-text suggestions. |
| `busy` | `boolean` | In-flight submit. |
| `error` | `string` | Error message. |
| `done` | `boolean` | Whether the "Thank you!" screen is showing. |

### Key functions

- `submit(e)` -- returns early if `overall` is unset. `POST
  /api/bootstrap/feedback` with `{ overall_rating, stall_id?, stall_rating?,
  join_likelihood?, suggestions? }` (optional fields sent as `undefined` when
  empty; `stall_rating` only sent when a stall is chosen). On non-ok shows
  `data.error` (or a fallback); on success sets `done`. A network throw shows
  "Request failed - check your connection."

### The five questions

1. **Overall experience** (required) -- a 1-10 grid of tiles.
2. **Which stall did you visit?** (optional) -- a dropdown defaulting to "Overall
   / not sure"; clearing it also resets `stallRating`.
3. **Rate that stall** (optional) -- a 1-5 tile row, rendered only after a stall
   is selected in Q2.
4. **Likelihood to join Vegavath** (optional) -- a 1-5 tile row with the hint
   "1 = definitely not / 5 = already filling the form".
5. **Any suggestions?** (optional) -- a free-text `<textarea>`, max 1000 chars.

### Render logic (three states)

- `done` -> "Thank you! Your feedback helps us improve Bootstrap."
- else `!hasSession` -> "Not running / Bootstrap isn't running right now."
- else -> the form. The submit button is disabled until `overall` is set and
  reads "Submitting..." in flight. Tile selection uses `aria-pressed` and
  `aria-label` for accessibility.

### Why it exists

It captures the metrics the club actually reviews after the event (an overall
score, per-stall ratings, and a recruitment-intent signal) in a tap-first form
that a fresher can finish in seconds on a phone. Keeping everything but Q1
optional maximizes completion. The stored rows feed the admin feedback summary
and the Gemini AI summary described in `docs/wiki/bootstrap.md`.

---

## BootstrapChecklist.tsx

`src/components/bootstrap/BootstrapChecklist.tsx` -- the student checklist page
behind `/bootstrap/checklist/[id]` (S73D). A **server component**: it renders
resolved data and has no state, timers or polling -- the page is force-dynamic,
so a reload is the refresh.

**Props.** `ctx: VisitorChecklistContext | null` from `getVisitorChecklistContext`:
the visitor, their group and every stall with whether the group has visited it.

**Render.** `null` -> the same dead end as a bad check-in link (it never confirms
whether a visitor exists). Otherwise the group (as "Group 1"), "N OF M STALLS
DONE", and every stall marked DONE, HERE NOW (an open visit) or NOT YET.

## ManualChecklistPanel.tsx

`src/components/bootstrap/ManualChecklistPanel.tsx` -- the manual checklist
toggle list (S73G), shared by the lead dashboard and the admin dashboard. Purely
presentational: each consumer does its own fetching, because the endpoints differ
(the lead's group comes from the cookie, the admin passes an explicit group id),
but the control is written once.

**Props.** `title`, `subtitle`, `stalls: GroupStallChecklistRow[]`, `loading`,
`busyStallId`, `error`, `onToggle(stallId, visited)`, `onClose`. Type-only import of
the row shape, so no service value reaches the client bundle.

**Why it exists.** A backup path beside the automatic visit log: when a stall
volunteer forgets to tap, a lead or admin can tick the stall. A tick writes an
already-closed visit row; a stall the group is currently AT cannot be cleared
here (409) -- that belongs to the stall volunteer's release.

## StallTimeLimitCountdown.tsx

`src/components/bootstrap/StallTimeLimitCountdown.tsx` -- the group lead's
per-stall countdown (S77). Rendered only for a lead with an open visit at a stall
that has `time_limit_minutes`; stall volunteers never see it.

**Props.** `stallName`, `arrivedAt`, `timeLimitMinutes`, `playChime`.

**Behaviour.** Remaining time is recomputed from `Date.now()` against the stored
`arrived_at` on every tick and on every return to the foreground -- never from a
tick count, which breaks when iOS Safari pauses a background tab. The interval
only asks for a re-render. Turns amber under 4 minutes and red under 2 minutes
and once over time. Chimes once at 4 minutes and once at 2 minutes remaining; a
threshold crossed while the tab was hidden is marked fired and never plays late.
The parent keys it on `arrived_at`, so moving to a new stall remounts it and resets
the fired flags. The chime is a short beep inlined as a data URI (no binary in git).

