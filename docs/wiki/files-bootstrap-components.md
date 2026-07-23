# Bootstrap Components

A file-by-file reference for every React component under
`src/components/bootstrap/`, drawn directly from the source. For how these
pieces fit into the wider event-day system (sessions, auth, the service layer,
API routes, migrations), see `docs/wiki/bootstrap.md`; this document is the
component-level companion to it.

Every component in this directory is a Client Component (`"use client"`) and
every one styles itself inline from the exported `BS` palette in
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

---

## BootstrapDashboard.tsx

`src/components/bootstrap/BootstrapDashboard.tsx` -- the client component behind
`/bootstrap` for a logged-in volunteer; it polls stall state, then either
renders itself (the full "lead" dashboard) or delegates to `StallVolunteerView`
for "stall" volunteers.

### Props

| Prop | Type | What it does |
| --- | --- | --- |
| `displayName` | `string` | Volunteer's name, shown in the header. |
| `username` | `string` | The lowercased SRN; used to test ownership (`claimed_by`/`queued_by`) and passed into `StallCard`. |
| `initialRole` | `"stall" \| "lead"` (default `"stall"`) | Server-rendered role so the correct view shows before the first poll; the poll then keeps it live. |

### State

| State | Type | Tracks |
| --- | --- | --- |
| `stalls` | `BootstrapStall[]` | The current stall list from the poll. |
| `mySuggestion` | `string \| null` | Admin's stall suggestion text (the "ADMIN SUGGESTS" banner). |
| `volunteerRole` | `"stall" \| "lead"` | Live role; seeded from `initialRole`, refreshed every poll so an admin role flip lands within 4s. |
| `checkinToken` | `string \| null` | The lead's stable QR check-in token (rides the poll payload). |
| `groupNumber` | `number \| null` | The lead's FCFS group number, or null until assigned. |
| `inClassroom` | `boolean` | Classroom-mode flag; rides the poll payload so it survives re-login. |
| `origin` | `string` | `window.location.origin`, set after mount (window does not exist during SSR); used to build the check-in URL. |
| `showMap` | `boolean` | Whether the full-screen map overlay is open. |
| `lastUpdated` | `number \| null` | Timestamp of the last successful poll (drives "Xs ago"). |
| `now` | `number` | Ticks every 1s so the "LIVE / Xs ago" label counts up. |
| `failCount` | `useRef<number>` | Consecutive poll-failure counter (not state -- no re-render needed). |
| `connectionIssue` | `boolean` | True once `failCount` hits 3; shows the red retry banner. |
| `prevStallsRef` | `useRef<BootstrapStall[]>` | Previous poll snapshot, used to diff for freed-stall detection. Kept in a ref because release clears `queued_by` in the DB, so the "was I waiting on it?" test must read the OLD row. |
| `freedNotifications` | `{ id; name; forme }[]` | Toasts for stalls that just went free; `forme` marks the one the user was queued on. |
| `redirectSuggestions` | `{ id; name; dist }[]` | Nearby-and-free proximity suggestions, ranked by map distance. |

### Key functions

- `poll()` (useCallback, keyed on `username`) -- `GET /api/bootstrap/stalls`.
  On 401 (token cleared by admin unlock or session deactivation) it hard-redirects
  to `/bootstrap`. On success it sets all the poll-fed state, resets the fail
  counter, then runs freed-stall detection:
  - Step 5a: any stall whose status went from non-free to `free` becomes a
    freed notification; each is auto-dismissed after 8000 ms. `forme` is true
    when the previous snapshot's `queued_by` equalled `username`.
  - Step 5b: "genuinely freed" stalls are those that freed with `queued_by ==
    null` in the previous snapshot (nobody was waiting). If the user is queued
    somewhere else and classroom mode is off, those are ranked by Euclidean
    distance from the user's queued stall and shown as redirect suggestions
    (auto-dismissed after 12000 ms). Distances scale the percentage deltas by
    the map's pixel size (1024 x 419) so the metric is isotropic and does not
    overweight the y axis. Classroom mode is read fresh from the poll payload
    (`data.inClassroom`), not the possibly-stale state closure.

  On any throw, `failCount` increments and the connection banner appears at 3.
- `sendAction(stallId, action)` -- `PATCH /api/bootstrap/stalls/{stallId}` with
  `{ action }`. On 401 redirects to login; on success it swaps the one updated
  stall into local state optimistically (the next poll self-corrects on error).
- `signOut()` -- `POST /api/bootstrap/logout`, then redirect to `/bootstrap`.
- Inline (not named): the CLASSROOM MODE button handler toggles `inClassroom`
  optimistically and `PATCH`es `/api/bootstrap/classroom` with `{ in_classroom }`.
  The ADMIN SUGGESTS dismiss button `POST`s `/api/bootstrap/suggestion/dismiss`
  and clears `mySuggestion`.

### The poll loop

`POLL_MS = 4000`. A `useEffect` (keyed on `poll`) runs `poll()` once immediately,
then starts a `setInterval(poll, 4000)`. A `visibilitychange` listener stops the
interval while `document.hidden` and restarts (with an immediate poll) when the
tab is visible again -- described in the source as a battery/Neon courtesy only,
nothing depends on it for correctness. A second, separate `useEffect` runs a 1s
`setInterval` that only updates `now` so the freshness label ticks.

### Role branching

The whole render forks on `volunteerRole`. If it is `"stall"`, the component
returns `<StallVolunteerView>` (passing the stalls, a `liveLabel` string, and
`onAction`/`onSignOut` wrappers) and renders nothing else -- stall volunteers get
no map, no queue, no notifications. Otherwise it renders the full lead dashboard
below.

### Render logic (lead dashboard)

- Header (sticky, 64px): display name, a pulsing LIVE dot (green, or `BS.danger`
  when `connectionIssue`) with "LIVE / Xs ago" or "CONNECTING..." while
  `lastUpdated` is null, the CLASSROOM MODE toggle (filled accent style when
  active, labelled "IN CLASSROOM"), the MAP button, and Sign out.
- A sticky red "CONNECTION ISSUES - RETRYING..." banner under the header when
  `connectionIssue` is true.
- "Your group" card: shows `Group {n}` or "Not assigned yet" (muted).
- "Your group check-in link" card (only when `checkinToken` is set): explanatory
  copy plus `<CheckinQROverlay checkinUrl={origin}/bootstrap/checkin/{token}>`.
- The freed-stall toasts (emphasised orange with a "IS FREE - YOUR GROUP CAN HEAD
  OVER" message when `forme`, muted "just opened up" otherwise), each with an ×
  to dismiss.
- The redirect suggestions (the first/nearest styled distinctly with a "->
  {name} is free and nearby" line and a "No group allocated yet" subtitle).
- The ADMIN SUGGESTS banner (blue), dismissible server-side.
- A "CLASSROOM MODE ACTIVE - QUEUE ACTIONS PAUSED" banner when `inClassroom`.
- The `StallGrid` of `StallCard`s. In classroom mode the cards are passed
  `username={undefined}` and `onAction={undefined}`, so they render read-only
  (no CLAIM/QUEUE buttons) while a lead runs a session.
- A full-screen `<BootstrapMapSVG>` overlay when `showMap` is true.

### Why it exists

This is the lead volunteer's command center on Bootstrap day. It solves the
"which stalls are free right now, and where should my group go next" problem
under a flaky captive-portal network: short-polling instead of WebSockets
(Vercel serverless holds no persistent sockets), optimistic action updates that
self-heal on the next poll, and freed-stall/proximity notifications derived
purely client-side from diffing poll snapshots. The role split keeps stall
volunteers out of all of that complexity.

---

## StallVolunteerView.tsx

`src/components/bootstrap/StallVolunteerView.tsx` -- the deliberately simplified
UI for `role="stall"` volunteers who stand at one stall all day: pick it once,
then toggle OCCUPIED/FREE.

### Props

| Prop | Type | What it does |
| --- | --- | --- |
| `displayName` | `string` | Header name. |
| `username` | `string` | Used to test whether the user is in a stall's `claimed_by`. |
| `stalls` | `BootstrapStall[]` | The stall list (from the parent's poll). |
| `connectionIssue` | `boolean` | Shows the red retry banner. |
| `liveLabel` | `string` | Pre-formatted "LIVE / Xs ago" (or "CONNECTING...") string from the parent. |
| `onAction` | `(stallId, action) => void` | Delegates claim/release to the parent's `sendAction`. |
| `onSignOut` | `() => void` | Delegates sign-out to the parent. |

### State

| State | Type | Tracks |
| --- | --- | --- |
| `myStallId` | `string \| null` | Which stall is "mine". Held locally because releasing (marking FREE) drops the user from `claimed_by`, so the DB alone cannot remember the chosen stall while it sits free. |

Two derived values (not state): `claimedStall` (the stall currently listing this
user in `claimed_by`) and `myStall` (the stall matching `myStallId`). A
`useEffect` re-syncs `myStallId` from `claimedStall` after a reload while the
stall was still occupied by this user. `iAmOnIt` is whether `myStall`'s
`claimed_by` includes `username`.

### Key functions

- `claim(stall)` -- sets `myStallId` locally and calls `onAction(id, "claim")`.
- `switchStall()` -- if the user is currently on their stall, releases it
  (`onAction(id, "release")`), then clears `myStallId` to return to the picker.
- The main toggle button calls `onAction(myStall.id, iAmOnIt ? "release" :
  "claim")`. No API endpoints are hit directly -- everything routes through the
  parent's `sendAction` (which PATCHes `/api/bootstrap/stalls/[id]`).

### Render logic

- Header: display name, a pulsing LIVE dot (red on connection issue), the
  `liveLabel`, and Sign out. Red retry banner when `connectionIssue`.
- If `myStall` is set: a large card with the stall name, a FREE/OCCUPIED status
  line, and one big toggle button ("Mark free" in danger style when the user is
  on it, "Mark occupied" in accent when not), plus a "Switch stall" text link.
- If no stall is chosen: "Tap your stall to claim it." over a `StallGrid` of
  tappable buttons. Each button is joinable when the stall is `free`, or
  `occupied` with room left (`claimed_by.length < max_occupancy`); non-joinable
  stalls render at 0.45 opacity and are disabled. Each shows the name and a
  FREE / "OCCUPIED · {names}" line.

### Why it exists

Stall volunteers have exactly one job -- keep their own stall's status current
-- so anything beyond a single toggle is noise. The local `myStallId` is the one
subtle bit: without it, a stall marked FREE would vanish from "mine" because the
release removed the user from `claimed_by`.

---

## StallCard.tsx

`src/components/bootstrap/StallCard.tsx` -- renders one stall card in either
volunteer mode (rule-based action buttons) or admin mode (a tap-to-expand
override form); it also exports the shared Bootstrap palette and grid helpers
that nearly every other component imports.

### Exports

This file is the module the rest of the directory imports from. It exports:

- `BS` -- the standalone Bootstrap color palette (documented below).
- `bootstrapBtnStyle` -- a shared `React.CSSProperties` for the admin override
  form's "Apply override" button.
- `StallGrid` -- a component wrapping children in a responsive CSS grid (1 column
  on phones, 2 columns at >= 600px) via a scoped `<style>` tag, because Tailwind
  responsive prefixes are unreliable in this setup.
- `VolunteerStallAction` -- the type `"claim" | "release" | "mark_queued" |
  "unqueue"`.
- `StallCard` (default export).

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
| `stall` | `BootstrapStall` | The stall to render. |
| `username` | `string?` | Volunteer mode: whose ownership to test. Presence of both this and `onAction` switches on the volunteer buttons. |
| `onAction` | `(action) => void`? | Volunteer mode: called with the chosen `VolunteerStallAction`. |
| `expanded` | `boolean?` | Admin mode: whether the override form is showing. |
| `onToggle` | `() => void`? | Admin mode: presence of this function is what marks the card as admin mode; toggles the form. |
| `actions` | `React.ReactNode?` | Admin mode: the override form content, shown when expanded. |

### Internal helpers / functions

- `STATUS_META` -- maps each status to its `{ color, label }` (FREE/OCCUPIED/QUEUED).
- `waitMinutes(queued_at)` -- floor-minutes since `queued_at`; returns 0 if null.
  Stays fresh purely from the parent's 4s re-render, no ticker.
- `BTN_KINDS` -- five button style presets: `accent` (filled, the primary CLAIM),
  `accent-outline` (faint accent tint, used for JOIN), `danger` (RELEASE),
  `queued` (MARK QUEUED), `neutral` (BACK TO OCCUPIED).
- `volunteerButtons(stall, username)` -- the Session 25 rule engine returning the
  button list. All action states:
  - `free` -> **Claim** (accent).
  - `occupied` and the user is in `claimed_by` -> **Release** (danger) + **Mark
    queued** (queued).
  - `occupied`, not the user's, and `claimed_by.length < max_occupancy` -> **Join**
    (accent-outline, the shared-stall entry point) + **Mark queued**.
  - `occupied`, not the user's, and full -> **Mark queued** only.
  - `queued`, user is in `claimed_by` -> **Release**; and if the user is also the
    `queued_by` owner, additionally **Back to occupied** (neutral).
  - `queued`, user is the `queued_by` owner but not in `claimed_by` -> **Back to
    occupied** only.
  - `queued`, neither -> no buttons (read-only). Anyone may MARK QUEUED an
    occupied stall, but only the `queued_by` owner may clear it.

### Render logic

`adminMode` is `typeof onToggle === "function"`. The card always shows: the stall
name; a status pill (colored by `meta.color`); a "Leads: {lead_names}" line when
present (informational, from session creation); a claimed-names line ("No one
here" when empty, prefixed "Presenting: " when queued); and, when queued with a
`queued_by`, a "Queued: {name} ({n} min)" line where the minute count turns
`BS.queued` (yellow) past 20 minutes as an urgency cue.

- Volunteer mode (`username` and `onAction` both present): the header is static
  and the `volunteerButtons` render as a stacked column below -- no tap-to-expand
  between a volunteer and the action.
- Admin mode (`onToggle` present): the header is a keyboard-accessible button
  (role/tabIndex/Enter/Space) that toggles `expanded`; when expanded, the
  `actions` override form renders below a divider. The card border turns accent
  while expanded.

### Why it exists

One card serves both the volunteer dashboard and the admin control panel, and
the queue rules (who can claim, join, queue, and unqueue) are centralized here in
`volunteerButtons` so both the button set and the underlying permission model
stay in one place. Exporting `BS` from here (rather than a separate constants
file) keeps the palette next to its heaviest consumer.

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
