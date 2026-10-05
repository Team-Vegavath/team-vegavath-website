# Admin Components

_Current as of Session 82C (2026-10-05)._

Per-file reference for every React component under `src/components/admin/`.
These are the client-side building blocks the `(admin)` pages compose: forms,
tables, upload widgets, toggles, and the sidebar chrome. For the auth model,
account types, invite/reset flows, and the pages themselves, see
`docs/wiki/admin.md` -- this document stays at the component level and every
claim is taken from the source as it stands.

**Uploads (S76E).** Every admin form that uploads a file -- `EventForm`,
`MemberForm`, `SponsorForm`, `PostForm`, `AnnouncementForm`,
`GalleryUploadForm`, `QuickPhotoUpload`, `BulkTeamPhotoUpload` -- goes through
ONE helper, `uploadToR2(file, path)` in `src/lib/utils.ts`, which replaced five
copy-pasted versions. It still `POST`s to `/api/admin/upload`, but fails fast on
a file over 4 MB (Vercel rejects request bodies over roughly 4.5 MB with a
plain-text 413 before the route runs, which the old copies misreported as a
JSON parse error), checks the status before parsing, and names the file and
its size in the error. It surfaces the limit; it does not raise it --
presigned direct-to-R2 uploads are the deferred real fix. Keys stay
timestamped (R2 serves immutable cache headers).

**Editing (S82).** EDIT on the sponsors, announcements, team and events lists
opens the shared slide-in `AdminEditPanel`; each form takes an optional
`onSuccess` (close the panel + `router.refresh()`) and, without it, navigates
as before. Creating ("Add" / "New") keeps its own full page.

Two conventions recur throughout and are stated once here:

- **R2 immutability.** R2 serves objects with immutable cache headers, so every
  upload keys its object by a `Date.now()` timestamp and never reuses a key.
  You will see this in `EventForm`, `MemberForm`, `SponsorForm`,
  `GalleryUploadForm`, `QuickPhotoUpload`, and `BulkTeamPhotoUpload`.
- **Optimistic refresh.** Mutating widgets either update local state
  optimistically or call `router.refresh()` (from `next/navigation`) to re-pull
  the server component data after a successful write.

## Contents

- [AccountsActions.tsx](#accountsactionstsx)
- [AdminRegisterForm.tsx](#adminregisterformtsx)
- [AdminShell.tsx](#adminshelltsx)
- [ApplicationsTable.tsx](#applicationstabletsx)
- [BootstrapAdminDashboard.tsx](#bootstrapadmindashboardtsx)
- [BootstrapCreateSession.tsx](#bootstrapcreatesessiontsx)
- [BootstrapSessions.tsx](#bootstrapsessionstsx)
- [BulkImportTeam.tsx](#bulkimportteamtsx)
- [BulkTeamPhotoUpload.tsx](#bulkteamphotouploadtsx)
- [DeleteEventButton.tsx](#deleteeventbuttontsx)
- [DeleteMemberButton.tsx](#deletememberbuttontsx)
- [DeleteSponsorButton.tsx](#deletesponsorbuttontsx)
- [EventForm.tsx](#eventformtsx)
- [FileUploadField.tsx](#fileuploadfieldtsx)
- [GalleryUploadForm.tsx](#galleryuploadformtsx)
- [InlineDelete.tsx](#inlinedeletetsx)
- [MemberForm.tsx](#memberformtsx)
- [MilestonesTable.tsx](#milestonestabletsx)
- [QuickPhotoUpload.tsx](#quickphotouploadtsx)
- [ResetPasswordForm.tsx](#resetpasswordformtsx)
- [SettingsForm.tsx](#settingsformtsx)
- [SignOutButton.tsx](#signoutbuttontsx)
- [SponsorForm.tsx](#sponsorformtsx)
- [ToggleEventStatusButton.tsx](#toggleeventstatusbuttontsx)
- [ToggleSwitch.tsx](#toggleswitchtsx)
- [Components added after the original sweep (S47-S72C)](#components-added-after-the-original-sweep-s47-s72c)
  -- AdminPageHeader, AdminStatCard, AdminProfileForm, CommandPalette,
  CopyButton, EventRegistrationsTable, PostForm, QRGenerator, SponsorsTable,
  TeamMembersTable, StatefulButton
- [Components added since S72D (S73-S82)](#components-added-since-s72d-s73-s82)
  -- AdminEditPanel, AnnouncementForm, AnnouncementsTable, EventsTable,
  GoogleSheetsExportButton, SegmentedCount

## AccountsActions.tsx

`src/components/admin/AccountsActions.tsx` -- the godfather-only action controls
on `/admin/accounts`: generate an invite link, generate a password-reset link,
and approve/reject pending registration requests.

**Note on naming.** There is no `GenerateInviteButton.tsx` file. Invite
generation lives here as a **named export** `GenerateInviteButton` inside
`AccountsActions.tsx`. This one module exports three components plus one
private helper, and the accounts page imports the named exports it needs.

**Exports.**

- `GenerateInviteButton` (named export) -- invite-link generator.
- `ResetPasswordButton` (named export) -- per-account reset-link generator.
- `PendingRequestActions` (named export) -- approve/reject controls.
- `CopyUrlBox` (private, not exported) -- shared copyable-URL box.

**Props.**

- `GenerateInviteButton` -- none.
- `ResetPasswordButton` -- `accountId: string`, the target account whose reset
  token is created.
- `PendingRequestActions` -- `id: string`, the invite-token row id being
  approved or rejected.
- `CopyUrlBox` -- `url: string` (the link to display) and `note: string` (the
  small caption under it, e.g. the expiry note).

**State.**

- `CopyUrlBox`: `copied` (boolean) -- flips the button label to `COPIED` after a
  successful `navigator.clipboard.writeText`.
- `GenerateInviteButton`: `name` (invitee full name input), `url` (generated
  link, empty until success), `busy` (in-flight guard).
- `ResetPasswordButton`: `url`, `busy` (same roles).
- `PendingRequestActions`: `busy` (in-flight guard).

**Key functions.**

- `CopyUrlBox.copy()` -- writes `url` to the clipboard; on failure it silently
  no-ops since the text is `userSelect: all` and can be copied by hand.
- `GenerateInviteButton.generate()` -- alerts if the name is blank, else
  `POST /api/admin/accounts/invite` with `{ inviteeName }`; on `res.ok` with a
  `url` it renders the `CopyUrlBox` (note: "ONE-TIME LINK - EXPIRES IN 48
  HOURS"), else alerts the returned error.
- `ResetPasswordButton.generate()` -- `POST /api/admin/accounts/${accountId}/reset-token`;
  on success shows the `CopyUrlBox` (note: "ONE-TIME LINK - EXPIRES IN 2
  HOURS").
- `PendingRequestActions.act(action)` -- `action` is `"approve"` or `"reject"`;
  reject asks for a `confirm()` first; posts to
  `POST /api/admin/accounts/${id}/approve` or `.../reject`, alerts on failure,
  then always calls `router.refresh()` to re-pull the pending list.

**Render logic.** `GenerateInviteButton` shows a name input plus a
GENERATE INVITE LINK button (label switches to "GENERATING..." while busy); the
`CopyUrlBox` appears only once `url` is set. `ResetPasswordButton` is a single
inline RESET PASSWORD action that reveals its own `CopyUrlBox` on success.
`PendingRequestActions` renders APPROVE (success color) and REJECT (danger)
buttons; both collapse to "..." while busy.

**Why it exists.** Concentrates the three privileged account mutations behind
one shared copy-link UI so the godfather can hand out one-time links and clear
the pending queue without leaving the Accounts page. The alert-on-error pattern
keeps the surface small; the real authorization is enforced server-side (the
routes require `isGodfather`).

**S76C.** Every action reports `failureText(res, fallback)` -- the server's own
`error` plus the HTTP status -- instead of a hardcoded alert, so a real 500 is no
longer indistinguishable from a dropped request. The open viewer-link block
renders only when `NEXT_PUBLIC_SHOW_VIEWER_INVITES === "true"` (production only,
inlined at build time).

## AdminRegisterForm.tsx

`src/components/admin/AdminRegisterForm.tsx` -- the public, chrome-less
registration form an invitee fills in after opening a valid invite link.

**Props.** `token: string` (the invite token from the URL), `nameSlug: string`
(the URL slug, re-checked server-side), `prefilledName?: string` (defaults to
`""`, pre-fills the display-name field).

**State.** `values` -- a `Record<FieldKey, string>` over the six fields
(displayName, username, email, mobile, password, confirmPassword);
`error` (uppercased message string), `busy` (submit guard), `done` (success
flag that swaps the form for a confirmation panel).

**Key functions.** `handleSubmit(e)` -- validates that every field is non-empty
and that the two passwords match (both surfaced as uppercase error strings),
then `POST /api/admin/register` with `{ token, nameSlug, ...values }`. On
`res.ok` it sets `done`; otherwise it uppercases and shows the server error.

**Render logic.** Centered card on a full-height Bootstrap-palette background.
Fields are generated from a static `FIELDS` array. When `done` is true it shows
a "Request submitted" message explaining the request is awaiting approval; until
then it shows the form with a submit button that reads "Submitting..." while
busy and a red error line beneath.

**Why it exists.** The account does not exist yet at this stage -- submission
only stamps pending fields onto the invite-token row for a godfather to approve
later (see the invite flow in `admin.md`). Uses the Bootstrap `BS` palette
constants and inline styles because it renders outside the `(admin)` chrome and
outside the main token system.

## AdminShell.tsx

`src/components/admin/AdminShell.tsx` -- the admin chrome: a fixed sidebar on
desktop, a hamburger overlay on mobile, wrapping every admin page except the
login screen.

**Props.** `children: ReactNode` (the page body); `signOutSlot: ReactNode` --
`SignOutButton` is a server component (it holds a server action), so the server
layout passes it in as a slot rather than the client shell importing it;
`hasPendingAccounts?: boolean` (default `false`) -- when true, draws an accent
dot on the Accounts nav icon.

**State.** `pathname` (from `usePathname`) drives active-link detection;
`menuOpen` (boolean) toggles the mobile overlay.

**Key behavior.**

- An effect closes the menu whenever `pathname` changes (navigating dismisses
  the overlay).
- A second effect locks `document.body.style.overflow` to `hidden` while the
  overlay is open and restores it on cleanup.
- **Login exception.** If `pathname === "/admin"` it returns `children` bare --
  no sidebar -- so the login page is standalone.
- **Active-state detection.** Each nav link sets
  `data-active={pathname === href || pathname.startsWith(`${href}/`)}`, so both
  the section root and its sub-routes (e.g. an edit page) highlight the link.

**Nav links.** A static `NAV_ITEMS` array of ten entries, each with `href`,
`label`, and an inline SVG icon, in order: Dashboard, Events, Team,
Applications, Bootstrap, Gallery, Road So Far (`/admin/milestones`), Sponsors,
Settings, Accounts. The Accounts item conditionally wraps its icon in a
relatively-positioned span with a small absolute accent square when
`hasPendingAccounts` is set.

**Render logic.** A top bar (brand + hamburger, mobile) and an `<aside>` sidebar
(`data-open={menuOpen}`) containing the brand, the nav, and the sign-out slot in
`.admin-sidebar-foot`; `children` render in `<main className="admin-content">`.
The hamburger's three bars animate into an X via inline transforms keyed on
`menuOpen`.

**Why it exists.** Single source of layout truth for the panel. The logo URL is
a hardcoded R2 shield constant, duplicated from the public Navbar with a comment
noting the Navbar does not export it. `signOutSlot` is the notable design
decision -- it threads a server action through a client component without the
client importing server-only code.

**S73E.** The nav includes **Announcements** (`/admin/announcements`).

## ApplicationsTable.tsx

`src/components/admin/ApplicationsTable.tsx` -- the recruitment pipeline table on
`/admin/applications`: expandable rows, per-row status and interview-group
controls, bulk selection, and an interview-panel auto-assign strip.

**Props.** `applications: Application[]` (the filtered list from the page),
`showPanelAssign?: boolean` (default `false`; the page sets it only on the plain
INTERVIEW tab), and `isViewer?: boolean` (hides every write control, S47).

**State.** `expandedId`; `panelCount` (1--4 or null); `assigning`; `statuses`
(`Record<id, ApplicationStatus>` optimistic overrides); `groups`
(`Record<id, InterviewGroup | null>`); `updatingId`; `selected` (`Set<string>`);
`bulkStatus`; `bulkBusy`.

**Key functions and endpoints.**

- `statusOf(app)` / `groupOf(app)` -- the effective status/group from the override
  or the row. `groupOf` checks `undefined` explicitly: a stored `null` means
  "cleared" and must beat `??`.
- `changeGroup(id, group)` -- optimistic, then
  `PATCH /api/admin/applications/${id}/group`; reverts and alerts on failure.
- `changeStatus(id, status)` -- `PATCH /api/admin/applications/${id}/status`.
- `handleBulkStatus()` -- `POST /api/admin/applications/bulk-status` with
  `{ ids, status }`, then clears the selection and `router.refresh()`.
- `handleAutoAssign()` -- `POST /api/admin/applications/auto-assign-groups` with
  `{ panel_count }`; round-robins unassigned interviewees oldest-first.
- `domainList(app)` -- `orderedDomainLabels` (S82B): the stored domain columns as
  display labels, in the fixed /join order, with a pre-S82B Operations +
  Sponsorship pair collapsed into one "Operations & Sponsorship".

**Render logic.**

- **Auto-assign strip** (only with `showPanelAssign`, unassigned interviewees, and
  not a viewer): A / A--B / A--C / A--D tiles, AUTO-ASSIGN, one line of explanation.
- **Table.** Select-all and per-row checkboxes, name, email, domains, semester,
  date, a `.status-badge status-<value>` cell (S66 -- the colours live in
  globals.css, keyed off the raw DB value), group tiles (only for
  `interview` / `shortlisted` rows), and actions. Checkbox and action cells stop
  propagation so they do not toggle the row.
- **Expanded row.** The applicant line (name, email, mobile, SRN/PRN, semester,
  course), domains, then either:
  - `answers` present (S81 form): `AnswerGroups` walks `QUESTION_GROUPS` --
    General, then each domain set in /join order -- showing only sets with an
    answer, and inside the two merged domains the same branch sub-headings the
    form shows ("Social Media" / "Design", "Operations / Logistics" /
    "Sponsorship", S82B). Multi-selects are joined, an "Other" text is appended,
    and a link answer becomes an `<a>` only when it starts with `https://`;
  - `answers` NULL (pre-S81 row): the old Why join / Value add / Experience /
    Portfolio block, unchanged.
- **Bulk bar** -- sticky, only while `selected.size > 0`: count, status select,
  APPLY, clear.

**Why it exists.** Review, triage and batch operations in one table so a cohort
moves through the pipeline without leaving the page. Optimistic override maps
avoid a refetch per single-row edit; bulk changes use `router.refresh()`.

## BootstrapAdminDashboard.tsx

`src/components/admin/BootstrapAdminDashboard.tsx` -- the live event-day console
for an active Bootstrap session, and the largest admin component (~2,100
lines). It polls the session, lets admins add and remove stalls, override them,
set group capacity live, watch occupants and queues, run the group distribution
and the end-of-event sweep, manage volunteers and visitor groups (including the
manual checklist), review feedback, trigger a Gemini summary, and place map pins.

**Props.** `session`, `initialStalls`, `initialVolunteers` -- seed the first
render; polling keeps them current. `isViewer` (default false) hides every write
control (S47).

**Polling.** `POLL_MS = 4000`: `GET /api/admin/bootstrap/sessions/${id}` replaces
`stalls`, `volunteers` and (since S73G) `groups` -- the poll always returned groups;
the dashboard used to throw them away. A `visibilitychange` listener pauses the
interval while the tab is hidden and polls-then-restarts when it returns.
Feedback is loaded on mount and on REFRESH only, never on the poll.

**State (main groups).** Stalls / volunteers / groups from the poll; the override
form (`expandedId`, `overrideStatus`, `overrideClaimedBy`, `busy`); add-stall form
(`stallFormOpen`, `newStallName`, `newStallOcc`, `newStallGroups`, `stallBusy`,
`stallError`); `capacityBusy` (live group-capacity edits, keyed by stall);
manual checklist (`checklistGroup`, `checklistStalls`, `checklistLoading`,
`checklistBusy`, `checklistError`); volunteer editor (`volEditId`, `volName`,
`volPhone`, `volSrn`, `volBusy`, `volError`); pin placement (`editingStall`);
feedback and the summary modal (`feedback`, `summaryOpen`, `summary`,
`summaryMeta`, `summarizing`, `summaryError`, `elapsedMs` -- the Gemini round
trip, shown in the footer); `origin` (set after mount, hydration-safe).

**Endpoints.** All under `/api/admin/bootstrap/`: `sessions/[id]` (poll),
`sessions/[id]/stalls` (POST add / DELETE remove, S49), `stalls/[id]` (override),
`stalls/[id]/max-groups` (S73B), `stalls/[id]/position` (pins),
`sessions/[id]/distribute` (S73D), `sessions/[id]/sweep-visits` (S73C),
`sessions/[id]/active` (deactivate), `sessions/[id]/groups/[groupId]/checklist`
(S73G), `volunteers/[id]` (edit details), `volunteers/[id]/unlock`,
`volunteers/[id]/reset-code`, `volunteers/[id]/suggest`, `volunteers/[id]/role`,
`volunteers/[id]/switch-request` (approve / deny, S72C), `sessions/[id]/feedback`,
`sessions/[id]/summarize`.

**Render logic (top to bottom).**

- Header: **DISTRIBUTE GROUPS** (S73D -- advisory placements, it leads because it
  runs during the event), **END ALL VISITS** (S73C -- closes open visits; it sits
  before deactivating), and **DEACTIVATE SESSION** (confirm warns volunteers will be
  signed out).
- Long-wait alerts, one per waiting GROUP (S73B -- was one per stall), computed
  from each queue entry's `queued_at` and refreshed by the poll.
- Stats bar (free / occupied / queued / active volunteers).
- Add / remove stalls (S49); an occupied stall cannot be deleted (409).
- **Stall table**: volunteers behind each stall, the **live group-capacity**
  override (S73B, 1--10, admins only), the groups AT the stall from open visit
  rows (S73C), and the **queue** -- groups waiting, in order, including advisory
  placements not yet accepted (S73B / S73D). Group names render through
  `groupLabel` ("Group 1", S73K). Expanding a stall shows the status override.
- **Visitor Groups** (S73G): one row per group -- Group, Lead, Checked in, and a
  CHECKLIST action that opens `ManualChecklistPanel` -- the same panel the lead dashboard
  uses -- to tick or clear stalls when automatic tracking missed a visit.
- **Stall Volunteers** and **Group Volunteers** tables (S35): name, username,
  stall / group number, phone, plaintext login code (by design -- these accounts
  only reach /bootstrap), status, UNLOCK, RESET CODE, an inline details editor
  (name / phone / SRN; phone filtered to digits on every keystroke, S76B --
  this editor has no `<form>`, so a `pattern` would never run), suggest stall,
  role change, an IN CLASS badge, and APPROVE / deny for pending switch requests.
- **Feedback**: REFRESH, a SUMMARISE button (gated -- it spends paid Gemini quota),
  stat tiles, per-stall averages, recent comments.
- **Map setup** (native `<details>`): `BootstrapMapSVG` plus PLACE PIN / CLEAR per stall.
- **Gemini summary modal**: the summary rendered with `react-markdown` (S46), the
  rows Gemini worked from, and a footer with the model and timing. The route calls
  `gemini-3.5-flash`.

**Why it exists.** The single operational surface for a running Bootstrap day.
Visibility-aware polling, on-demand feedback, optimistic pin-drop and
per-field busy flags keep it live without wasting requests.

## BootstrapCreateSession.tsx

`src/components/admin/BootstrapCreateSession.tsx` -- the two-step wizard for
creating a Bootstrap session with its stalls, ending on a success screen with
the registration links.

**Props.** `onDone: () => void` (exit create mode and refresh) and
`sessions?: BootstrapSession[]` (S49 -- past sessions, so step 2 can import a
stall list as a starting point).

**State.** `step`; step 1 `name`, `maxGroupSize`, `groupCount`; step 2 `stalls`
(`StallDraft[]`) and the in-progress `stallName`, `stallOcc` (volunteer capacity
1--4, S77), `stallGroups` (group capacity 1--3, S73B), `stallTimeLimit` (free-text
minutes, `""` = no timer, S77), `stallLeadsText`, `stallError`; import
(`importId`, `importing`, `importError`); submission `busy`, `error`, `created`,
`autoAssigned`; `origin`.

**Key functions and endpoints.**

- `importStalls(sessionId)` -- reuses `GET /api/admin/bootstrap/sessions/${id}`
  for an earlier session's stalls and turns them into editable drafts, clamping
  legacy capacities into today's ranges. Nothing is written until CREATE.
- `addStall()` -- lead names split on newlines/commas, capped at **4** (S78B);
  the time limit must be blank or a positive whole number of minutes.
- `moveStall(index, dir)` -- reorder.
- `submit()` -- `POST /api/admin/bootstrap/sessions` with `{ name, stalls,
  group_count, max_group_size }`; reads back `autoAssigned`.

**Render logic.**

- **Step 1:** session name, visitor groups (1--26), max visitors per group.
- **Step 2:** the import picker, stall name, two clearly labelled
  `SegmentedCount` pickers (S76G) -- volunteer capacity and group capacity -- an
  optional time-limit field (S77; drives the group lead's countdown), lead names,
  and the reorderable stall list.
- **Success screen:** three copyable links -- `/bootstrap/register/stall` and
  `/bootstrap/register/group` (open while the session is active) and
  `/bootstrap/register/pool` (always open, S74B) -- plus how many pre-registered
  pool volunteers were auto-assigned into the new session.

**Why it exists.** Volunteers self-register (S35), so the wizard ends on links,
not a credentials file. Lead names are informational only.

## BootstrapSessions.tsx

`src/components/admin/BootstrapSessions.tsx` -- the Bootstrap landing view when
no session is active: the session list, the create wizard, and the
pre-registration pool.

**Props.** `sessions: BootstrapSession[]`, `pool?: PoolVolunteer[]` (S49 -- volunteers
with `session_id` NULL), and `isViewer?: boolean` (hides create / activate /
delete and the write actions, including the Sheets button, S47).

**State.** `creating`; `busyId`; session edit (`editingId`, `editName`,
`editMaxGroup`, `editError`); pool assignment (`assignId`, `assignSessionId`,
`assignStallId`, `assignStalls`, `assignLoading`, `assignError`); pool volunteer
editor (`volEditId`, `volName`, `volPhone`, `volSrn`, `volError`); bulk wipe
(`wipeOpen`, `wiping`, `wipeError`).

**Endpoints.** `sessions/[id]/active` (ACTIVATE), `sessions/[id]` (DELETE, and
PATCH to rename / change the visitor cap, S49), `sessions/[id]` GET (stalls for
the assign picker), `volunteers/[id]` (PATCH edit / DELETE a pool row, S55 /
S55B), `volunteers/[id]/reset-code`, `volunteers/[id]/assign` (S49),
`volunteers/pool/delete-all` (S73K); the pool CSV
(`GET volunteers/pool/export`) is a plain link and the Sheets export a
`GoogleSheetsExportButton`.

**Render logic.**

- `creating` -> `BootstrapCreateSession`.
- **Sessions table**: name, created, stall count, status, and for inactive rows
  ACTIVATE / edit / DELETE. Inactive sessions older than 7 days get a cleanup
  nudge (self-registered accounts accumulate in old sessions).
- **Pre-registration pool** (volunteers with `session_id` NULL): name, username
  (SRN), phone, **Prefers** (preferred stall, or the LEAD role for a lead -- S74B
  follow-up, so an admin does not mis-assign a lead to a stall), plaintext login
  code, registered. Per row: ASSIGN (pick a session and stall, then CONFIRM),
  edit details (phone digit-filtered, S76B), RESET CODE, delete.
- **Bulk actions** (S73K, only when the pool is non-empty): EXPORT CSV, EXPORT TO
  GOOGLE SHEETS, and DELETE ALL, which opens an inline `admin-danger-zone` confirm
  naming the count with EXPORT FIRST beside DELETE ALL N -- a nudge, not a gate.

**Why it exists.** Session lifecycle and the between-events pool in one place.
The pool lives here, not on the dashboard, because the dashboard only renders
while a session is active and the pool only matters when one is not.

## BulkImportTeam.tsx

`src/components/admin/BulkImportTeam.tsx` -- CSV bulk importer for team members,
with a client-side parse, preview, and result summary.

**Props.** None.

**State.** `dragging` (drop-zone hover); `csvText` (the raw file text sent to
the server); `rows` (the parsed grid); `status` (a state machine:
`idle` | `previewing` | `importing` | `done` | `error`); `result` (an
`ImportResult` of `inserted`, `skipped`, `validationErrors`); `errorMsg`.

**Key functions and endpoints.**

- `parseCSV(text)` -- a full quote-aware CSV parser (handles quoted commas,
  escaped `""`, and CRLF normalization); a display-only mirror of the server's
  parser so the preview matches what will be imported.
- `acceptFile(list)` -- reads the file, parses it, requires at least a header
  plus one data row, and requires the header to match `EXPECTED_HEADER` exactly
  (`name,role,tier,domain,quote,linkedin_url,github_url,display_order`); on
  success moves to `previewing`.
- `handleDrop` / hidden file input -- two ways to feed `acceptFile`.
- `handleImport()` -- `POST /api/admin/import/team` with the raw CSV as
  `text/csv`; on success stores the `ImportResult` and moves to `done`, else
  formats the error (with any `details` array) and moves to `error`.
- `downloadTemplate()` -- builds a Blob from `TEMPLATE_CSV` and triggers a
  client-side download. The template uses `Programming` (the `team_members`
  CHECK value) rather than `Coding` (which is only valid on the applications
  table).
- `reset()` / `handleDone()` -- clear back to idle, or navigate to
  `/admin/team` and refresh.

**Render logic.** Driven by `status`: idle shows the drop zone, a DOWNLOAD
TEMPLATE link, and a tier hint; previewing shows the first 10 rows (values
truncated at 30 chars), a total-rows line, and IMPORT/CANCEL; importing shows
"IMPORTING..."; done shows the inserted/skipped counts plus any per-row
validation errors and a DONE button; error shows the message and TRY AGAIN.

**Why it exists.** Seeds a whole team roster from a spreadsheet in one shot. The
client mirrors the server parser and validates the header up front so mistakes
surface before any network call. Photos are explicitly out of scope here (added
later per-member).

## BulkTeamPhotoUpload.tsx

`src/components/admin/BulkTeamPhotoUpload.tsx` -- drops a batch of image files and
auto-matches each to a team member by filename, then uploads and links them.

**Props.** `members: TeamMember[]` where `TeamMember` is `{ id, name,
photo_url }`.

**State.** `matches` (a `Match[]`, each with the `file`, an object-URL
`preview`, the auto-matched `member`, and an `override` member id); `uploading`;
`done`; `errors` (per-file failure strings).

**Key functions and endpoints.**

- `slugify(s)` and `matchMember(filename, members)` -- the matcher tries, in
  order: exact full-name slug, all significant (>2 char) name parts present in
  the filename, then first-name (>3 char) contains. Returns the first hit or
  null.
- `handleFiles(files)` -- builds the `matches` list with previews and initial
  auto-matches.
- `handleUpload()` -- for every matched file (override wins over auto-match), it
  runs a two-step call in parallel across files: `uploadToR2` (S76E) with a
  timestamped `team/${memberId}-${Date.now()}.<ext>` key, then
  `PATCH /api/admin/team` with `{ id, photo_url }`. Failures are collected
  per-file; if none, it revokes the previews, clears state, and refreshes.
- `handleCancel()` -- revokes previews and clears.

**Render logic.** With no files, a single BULK PHOTO UPLOAD button. With files,
a matched-count line, a preview table (thumb, filename, matched-to name in
success/error color, and an assign select that lets the admin reassign or skip
each row), an UPLOAD button (disabled with zero matches), a CANCEL, and any
per-file errors. A success line shows when done.

**Why it exists.** Turns a folder of "Firstname Lastname.jpg" exports into linked
photos without opening each member's edit form. The fuzzy three-pass matcher
plus a manual override select covers imperfect filenames. Timestamped keys honor
the R2 immutability rule.

## DeleteEventButton.tsx

`src/components/admin/DeleteEventButton.tsx` -- the danger-zone archive and
permanent-delete actions on the event edit page (list rows use `InlineDelete`).

**Props.** `id: string`, `title: string`.

**State.** `archiving`, `deleting` (independent in-flight guards).

**Key functions and endpoints.**

- `handleArchive()` -- confirms, then `DELETE /api/admin/events?id=${id}` (the
  plain DELETE soft-deletes/archives); on success navigates to `/admin/events`.
- `handlePermanentDelete()` -- requires two separate `confirm()` dialogs, then
  `DELETE /api/admin/events?id=${id}&permanent=true`; on success navigates back
  to the list.

**Render logic.** Two buttons -- ARCHIVE EVENT (`admin-btn-danger-outline`) and
PERMANENTLY DELETE (`admin-btn-danger`) -- each showing an in-progress label and
both disabled while either action runs.

**Why it exists.** Separates the reversible archive from the irreversible delete
and gates the latter behind a double confirm. The same endpoint does both,
switched by the `permanent=true` query flag.

## DeleteMemberButton.tsx

`src/components/admin/DeleteMemberButton.tsx` -- danger-zone permanent delete on
the team-member edit page (list rows use `InlineDelete`).

**Props.** `id: string`, `name: string`.

**State.** `deleting` (in-flight guard).

**Key functions and endpoints.** `handleDelete()` -- confirms, then
`DELETE /api/admin/team?id=${id}`; on success navigates to `/admin/team`, else
alerts.

**Render logic.** A single DELETE MEMBER danger button that reads "DELETING..."
while busy.

**Why it exists.** The full-size destructive action for the edit page, kept
distinct from the lightweight row-level `InlineDelete`.

## DeleteSponsorButton.tsx

`src/components/admin/DeleteSponsorButton.tsx` -- danger-zone permanent delete on
the sponsor edit page (list rows use `InlineDelete`).

**Props.** `id: string`, `name: string`.

**State.** `deleting` (in-flight guard).

**Key functions and endpoints.** `handleDelete()` -- confirms, then
`DELETE /api/admin/sponsors?id=${encodeURIComponent(id)}`; on success navigates
to `/admin/sponsors`, else logs and alerts.

**Render logic.** A single DELETE SPONSOR danger button showing "DELETING..."
while busy.

**Why it exists.** Sponsor counterpart to `DeleteMemberButton`; it
`encodeURIComponent`s the id in the query, the one small difference from the
member/event variants.

## EventForm.tsx

`src/components/admin/EventForm.tsx` -- the create/edit form for events, shared by
`/admin/events?new=true` and the edit page.

**Props.** `mode: "create" | "edit"` and `initialData?` (optional partial event:
id, title, slug, category, status, description, event_date, registration_open,
registration_form_url, logo_url, cover_image_url).

**State.** Controlled fields `title`, `slug`, `category` (default
`"workshops"`), `status` (default `"upcoming"`), `description`, `event_date`,
`registration_form_url`, `registration_open`; upload buffers `logoFiles` and
`coverFiles`; `saving`; `error`.

**Key functions and endpoints.**

- `slugify(text)` -- lowercases, trims, and collapses to a URL slug. In create
  mode, typing the title live-updates the slug; editing the slug re-slugifies
  it.
- Upload: `uploadToR2(file, path)` (src/lib/utils.ts, S76E) -- `POST /api/admin/upload`
  (multipart), returns the stored URL; fails fast over 4 MB.
- `handleSubmit(event)` -- validates the registration URL starts with
  `http(s)://` if present; uploads logo/cover under timestamped keys
  (`events/${slug}/logo-${Date.now()}.png`, `.../cover-....jpg`) only when a new
  file was picked; then `POST` (create) or `PATCH` (edit) to `/api/admin/events`
  with the event fields (plus `id` on edit). On success navigates to
  `/admin/events`.

**Render logic.** A single form grouped into Basic Info, Schedule & Status,
Registration, and Media sections. Category options include `hackathons` (see the
known open item below). Registration open uses `ToggleSwitch`; logo and cover
use `FileUploadField` (each passed `initialData` URLs as `currentUrl`). Shows an
error line and a SAVE EVENT button that reads "SAVING..." while busy.

**Why it exists.** One component for both create and edit. The key design note
is the image handling: image fields are omitted from the payload unless a new
file was uploaded, because sending `""` would defeat the service's `COALESCE`
and wipe the stored URL on edit. Known open item (CLAUDE.md): the `hackathons`
category is offered here but the DB CHECK rejects it, causing a 500 on create --
flagged, not fixed.

**S82.** Optional `onSuccess?: () => void` -- SponsorForm's contract. With it, a
successful save calls it instead of `router.push("/admin/events")`; `EventsTable`
passes it from the slide-in panel. The create page and the full edit page pass
nothing, so they behave as before.

## FileUploadField.tsx

`src/components/admin/FileUploadField.tsx` -- the reusable drag-and-drop file
picker used by the event, member, sponsor, and gallery forms.

**Props.** `id: string`; `accept: string`; `files: File[]` and
`onFilesChange: (files: File[]) => void` (controlled by the parent);
`multiple?: boolean` (default false); `currentUrl?: string | null` (existing
image shown as a thumb in edit mode until a replacement is picked); `hint?:
string` (caption inside the zone).

**State.** `dragging` (drop-zone hover). The file list itself is owned by the
parent.

**Key functions.** `acceptFiles(list)` -- in single mode keeps only the first
file, in multiple mode appends; `handleDrop` -- drop handler feeding
`acceptFiles`; `removeAt(index)` -- removes a queued file and resets the hidden
input.

**Render logic.** A hidden `<input type="file">` triggered by clicking or
keyboard-activating the zone. When `currentUrl` is set and no new file is
queued, it shows a "CURRENT / REPLACE" thumbnail (a plain `<img>`, since these
are tiny R2 thumbs where `next/image` adds nothing). Queued files list below with
name, human-readable size (`formatSize`), and a remove x.

**Why it exists.** Central upload control so every form gets the same drag-drop,
preview, and remove behavior. It stays controlled (files live in the parent) so
the parent owns upload timing and can key uploads by timestamp.

## GalleryUploadForm.tsx

`src/components/admin/GalleryUploadForm.tsx` -- the gallery admin uploader: a
batch image uploader with per-file captions and progress, plus a separate
YouTube-video add form.

**Props.** None.

**State.** Image form: `eventLabel`, `eventId`, `files`, `captions`,
`uploading`, `error`, plus a batch snapshot `batch` and per-file `statuses` (a
`UploadStatus[]` of `queued` | `uploading` | `done` | `error`) and a final
`summary` (`{ done, failed }`). Video form: `videoUrl`, `videoCaption`,
`videoEventLabel`.

**Key functions and endpoints.**

- `handleFilesChange` / `updateCaptionAtIndex` / `setStatusAtIndex` -- keep the
  files, captions, and per-file statuses arrays in sync.
- `handleImageUpload(event)` -- defaults a blank label to "General", derives a
  slug, snapshots the batch, then GETs `/api/admin/gallery` to compute a
  `baseOrder` (max existing `display_order` + 1) so new items sort after
  existing ones. It then loops the files sequentially: per file it
  uploads via `uploadToR2` (S76E) under a timestamped
  `gallery/${slug}/${Date.now()}-${filename}` key, then
  `POST`s to `/api/admin/gallery` with `{ event_id, event_label, type:"image",
  url, thumbnail_url, caption, display_order }`. Each file is in its own
  try/catch so one bad file does not abort the batch; it tallies done/failed,
  sets the summary, and refreshes.
- `handleVideoSubmit(event)` -- requires a label and URL, then
  `POST /api/admin/gallery` with `type:"video"` and the YouTube embed URL.
- `resetImageForm()` -- clears the image form back to empty.

**Render logic.** Two forms in one section. The image form shows the label/id
inputs and the `FileUploadField` plus per-file caption inputs until an upload
starts; during and after upload it swaps to a batch status list (color-coded per
`STATUS_COLOR`) so mid-upload file removals cannot desync the list. A summary
line and a DONE button appear once finished; otherwise an UPLOAD button. The
video form has label, embed URL, and caption inputs and an ADD VIDEO button. A
shared error line sits at the bottom.

**Why it exists.** Handles the two gallery content types (batch images and
single videos) in one place, with resilient partial-success uploads and a
computed display order. Timestamped keys honor R2 immutability; the video path
preserves the YouTube-embed pattern mandated across the site.

## InlineDelete.tsx

`src/components/admin/InlineDelete.tsx` -- the lightweight text delete trigger for
table rows on list pages.

**Props.** `endpoint: string` (the full DELETE URL including query string);
`confirmMessage: string`; `label?: string` (default `"DELETE"`, e.g. `"ARCHIVE"`
where the API soft-deletes).

**State.** `busy` (in-flight guard).

**Key functions and endpoints.** `handleClick()` -- confirms with
`confirmMessage`, then `DELETE` to the given `endpoint`; on success
`router.refresh()`, else alerts.

**Render logic.** A single `admin-row-action admin-row-action-danger` button
showing "..." while busy.

**Why it exists.** The row-level counterpart to the full danger-zone delete
buttons on edit pages. Endpoint-agnostic, so events, team, sponsors, gallery,
and applications all reuse it by passing their own URL and message.

## MemberForm.tsx

`src/components/admin/MemberForm.tsx` -- the create/edit form for team members.

**Props.** `mode: "create" | "edit"` and `initialData?` (id, name, role, tier,
domain, quote, linkedin_url, github_url, display_order, is_active, photo_url).

**State.** Controlled fields `name`, `role`, `tier` (default `"core"`), `domain`
(default `"Automotive"`), `quote`, `linkedin_url`, `github_url`, `display_order`
(default 0), `is_active` (default true); `photoFiles`; `saving`; `error`.

**Key functions and endpoints.**

- Upload: `uploadToR2(file, path)` (src/lib/utils.ts, S76E) -- `POST /api/admin/upload`,
  returns the URL; fails fast over 4 MB.
- `handleSubmit(event)` -- uploads the photo (if a new one was picked) under a
  timestamped `team/${tier}/${safeName}-${Date.now()}.jpg` key, then `POST`
  (create) or `PATCH` (edit) to `/api/admin/team` with the member fields. On
  success navigates to `/admin/team`; surfaces the server error otherwise.

**Render logic.** Sections Basic Info (name, role, tier select core/crew/legacy,
domain select), Profile (quote, LinkedIn, GitHub), Media (photo via
`FileUploadField`), and Status & Visibility (display order, active
`ToggleSwitch`). Error line and a SAVE MEMBER button.

**Why it exists.** Single form for both create and edit, mirroring `EventForm`.
It applies the same COALESCE-safe rule: `photo_url` is only included when a new
file was uploaded, so an edit never wipes an existing photo.

**S82.** Optional `onSuccess?: () => void`, same contract as SponsorForm's:
`TeamMembersTable` passes it from the slide-in panel; without it the form
navigates to `/admin/team` as before.

## MilestonesTable.tsx

`src/components/admin/MilestonesTable.tsx` -- the draggable "Road So Far" timeline
editor: reorder by drag, and add/edit/delete milestones inline.

**Props.** `initialData: Milestone[]`.

**State.** `items` (the working list, seeded from props); `editing` (id of the
milestone being edited inline); `adding` (whether the add form is open);
`dragIdx` and `overIdx` (the dragged item and the current drop target, for the
drag visuals). A nested `MilestoneForm` holds its own `dateLabel`, `title`,
`description` state.

**Key functions and endpoints.**

- Drag handlers `onDragStart` / `onDragOver` / `onDrop` -- on drop it reorders
  `items`, recomputes each `sort_order` to its 1-based index, updates local
  state, then persists **only the rows whose `sort_order` actually changed** (by
  comparing a pre-drop id-to-order map) via
  `PATCH /api/admin/milestones/${id}` per changed row.
- `handleSave(id, data)` -- `PATCH /api/admin/milestones/${id}` with the edited
  fields; updates local state on success.
- `handleAdd(data)` -- `POST /api/admin/milestones` with `sort_order =
  items.length + 1`; appends the returned milestone.
- `handleDelete(id, title)` -- confirms, then
  `DELETE /api/admin/milestones?id=${id}`; removes locally on success.
- `MilestoneForm.save()` -- validates all three fields are non-empty before
  calling `onSave`.

**Render logic.** An ADD MILESTONE button (or the inline add form when adding),
then a vertical-line timeline. Each item is a draggable card with an accent dot
handle; the card shows the date label, title, and description, with EDIT and
DELETE actions, or swaps to the inline `MilestoneForm` while editing. The dragged
target dims to 0.5 opacity. An empty state reads "NO MILESTONES YET."

**Why it exists.** Ordering a timeline is inherently spatial, so drag-and-drop
beats editing sort numbers by hand. The "persist only changed rows" optimization
avoids issuing a PATCH for every milestone on each reorder. `MilestoneForm` is a
private shared component so add and edit use identical field UI.

## QuickPhotoUpload.tsx

`src/components/admin/QuickPhotoUpload.tsx` -- a one-click photo upload for a
single member, used inline on the `/admin/team` list.

**Props.** `memberId: string`, `currentPhotoUrl: string | null`.

**State.** `uploading` (in-flight guard); `error` (inline failure string).

**Key functions and endpoints.** `handleFile(file)` -- `uploadToR2` (S76E)
under a timestamped `team/${memberId}-${Date.now()}.<ext>` key, then
`PATCH /api/admin/team` with `{ id, photo_url }`, then `router.refresh()`;
surfaces any error inline.

**Render logic.** A hidden file input plus a small text button that reads "ADD
PHOTO" (accent) when there is no photo, "PHOTO" (muted) when one exists (title
"Replace photo"), and "..." while uploading; any error shows beside it.

**Why it exists.** Skips the full member edit form for the common case of just
attaching or swapping a headshot from the list view. Same timestamped-key R2
rule as the forms.

## ResetPasswordForm.tsx

`src/components/admin/ResetPasswordForm.tsx` -- the public, chrome-less form where
an account holder sets a new password from a valid reset link.

**Props.** `token: string` (the reset token from the URL).

**State.** `password`, `confirmPassword`, `error` (uppercased), `busy`, `done`
(success flag).

**Key functions and endpoints.** `handleSubmit(e)` -- validates both fields are
present, that they match, and that the password is at least 8 characters, then
`POST /api/admin/credentials/reset` with `{ token, password, confirmPassword }`.
On `res.ok` sets `done`; otherwise uppercases and shows the server error.

**Render logic.** A centered card on the Bootstrap-palette background (same shell
as `AdminRegisterForm`). When `done` it shows "Password updated" and a sign-in
prompt; otherwise the two password fields, a "Set new password" button that
reads "Saving..." while busy, and an error line.

**Why it exists.** The client end of the godfather-initiated reset flow. It
mirrors `AdminRegisterForm`'s standalone styling because it also renders outside
the admin chrome. The real token validation and the `token_version` bump that
kills live sessions happen server-side (see `admin.md`).

## SettingsForm.tsx

`src/components/admin/SettingsForm.tsx` -- the site-settings editor on
`/admin/settings`, submitting via a server action.

**Props.** `settings: SiteSettings` -- the current values used to seed the form.

**State.** One controlled value per setting: `recruitmentOpen`,
`maintenanceMode`, `maintenanceMessage`, `contactEmail`, `contactPhone`,
`contactAddress`, `instagramUrl`, `linkedinUrl`, `githubUrl`; plus `saving` and
`saved` (a transient confirmation flag).

**Key functions.** The `<form action={...}>` calls the imported server action
`updateSettings(formData)` (from `app/(admin)/admin/settings/actions`), sets
`saving` around the await, then flashes `saved` for 3 seconds. The two boolean
toggles are backed by hidden inputs (`recruitment_open`, `maintenance_mode`) so
their values reach `formData`, while the text fields carry `name` attributes
directly.

**Render logic.** Sections Site Status (recruitment and maintenance
`ToggleSwitch`es plus the maintenance message), Contact (email, phone, address),
and Social Media (Instagram, LinkedIn, GitHub URLs). A SAVE CHANGES button reads
"SAVING..." while saving, and a green "SAVED" indicator with a check SVG appears
briefly after success.

**Why it exists.** This is the one admin form that uses a Next.js server action
rather than a fetch to an API route. The `maintenance_mode` toggle here is what
the middleware reads to rewrite the public site to `/maintenance`. Booleans go
through hidden inputs because `ToggleSwitch` is a controlled component, not a
native checkbox.

## SignOutButton.tsx

`src/components/admin/SignOutButton.tsx` -- the sign-out control in the sidebar
footer. This is the one **server component** in the folder (no `"use client"`).

**Props.** None.

**Key functions.** Renders a `<form>` whose inline server action
(`"use server"`) calls `signOut({ redirectTo: "/admin" })` from `@/lib/auth`.

**Render logic.** A single Sign Out submit button (`admin-signout`).

**Why it exists.** Sign-out needs a server action, and a client component cannot
hold one, so `AdminShell` receives this rendered element through its
`signOutSlot` prop rather than importing it. That prop threading is the whole
reason the component is split out.

## SponsorForm.tsx

`src/components/admin/SponsorForm.tsx` -- the create/edit form for sponsors.

**Props.** `mode: "create" | "edit"` and `initialData?` (id, name, tier,
website_url, description, display_order, is_active, logo_url).

**State.** Controlled fields `name`, `tier` (default `"community"`),
`website_url`, `description`, `display_order` (default 0), `is_active` (default
true); `logoFiles`; `saving`; `error`.

**Key functions and endpoints.**

- Upload: `uploadToR2(file, path)` (src/lib/utils.ts, S76E) -- `POST /api/admin/upload`,
  returns the URL; fails fast over 4 MB.
- `handleSubmit(event)` -- uploads the logo (if picked) under a timestamped
  `sponsors/${safeName}-${Date.now()}.png` key, then `POST` (create) or `PATCH`
  (edit) to `/api/admin/sponsors`; on success navigates to `/admin/sponsors`.

**Render logic.** Sections Basic Info (name, tier select premium/community,
website URL, description), Media (logo via `FileUploadField`, accepting SVG too),
and Status & Visibility (display order, active `ToggleSwitch`). Error line and a
SAVE SPONSOR button.

**Why it exists.** Sponsor counterpart to `EventForm`/`MemberForm`. Note it does
not use the omit-on-empty image trick: `logo_url` is a plain `string |
undefined` passed straight through (undefined when no new file), which the
service treats as "leave unchanged". `is_active` controls whether a sponsor
counts toward the dashboard's Active Sponsors stat and shows publicly.

## ToggleEventStatusButton.tsx

`src/components/admin/ToggleEventStatusButton.tsx` -- a one-click status cycler on
the event edit page.

**Props.** `id: string`, `currentStatus: string`.

**State.** `loading` (in-flight guard).

**Key functions and endpoints.** `toggleStatus()` -- computes the next status
(`archived` -> `past`, `past` -> `upcoming`, `upcoming` -> `past`), then
`PATCH /api/admin/events` with `{ id, status }`; on success `router.refresh()`,
else alerts.

**Render logic.** A single `btn-outline` whose label reflects the transition:
"Unarchive -> Past" (from archived), "Mark as Past" (from upcoming), or "Mark as
Upcoming" (from past); "Updating..." while busy.

**Why it exists.** A fast way to flip an event's lifecycle state from the edit
page without opening the full form's status select. Note the cycle is not a
clean loop -- from `past` it goes to `upcoming` and from `upcoming` back to
`past`, while `archived` is an entry point that leads to `past`.

## ToggleSwitch.tsx

`src/components/admin/ToggleSwitch.tsx` -- the shared segmented ON/OFF control
used by the event, member, sponsor, and settings forms.

**Props.** `value: boolean`; `onChange: (value: boolean) => void`;
`ariaLabel: string` (accessible name for the group).

**State.** None -- fully controlled by the parent.

**Render logic.** A `role="group"` wrapper (`admin-toggle`) with two real
`<button>`s, ON and OFF, each carrying `data-active` and `aria-pressed` from
`value`; ON calls `onChange(true)`, OFF calls `onChange(false)`.

**Why it exists.** Replaces an older pill-slider div with sharp segmented
buttons that fit the editorial aesthetic (no rounded corners) and are keyboard-
and screen-reader-usable. Being controlled and stateless, it drops into any form
that owns the boolean; in `SettingsForm` a hidden input carries its value into
the server action.

---

## Components added after the original sweep (S47-S72C)

The entries above were written against an earlier snapshot. The components
below exist on disk and were not covered. Each entry is deliberately short:
one line on what it is, plus anything non-obvious a maintainer would trip on.

### AdminPageHeader.tsx
Shared page title + action-slot header for admin pages. Introduced during the
admin chrome pass so every page stops hand-rolling its own heading block.
Reuse it rather than adding another title layout.

### AdminStatCard.tsx
The dashboard stat tile (label, value, optional trend). Pairs with
`AdminPageHeader` as part of the same chrome vocabulary.

### AdminProfileForm.tsx
Form behind `/admin/profile`. Edits the signed-in admin's own record via
`PATCH /api/admin/accounts/me` (the page reads the record server-side) --
display name, mobile number, password. The mobile field is capped at 10 and
filtered to digits on every keystroke (S73I, S76B).

### CommandPalette.tsx
Keyboard-driven navigation over the admin routes.

### CopyButton.tsx
Extracted copy-to-clipboard button, used for invite links and gallery URLs.
Note the known duplicate: `AccountsActions.tsx` still contains an unexported
`CopyLinkButton` that does the same job and was left un-refactored. Prefer this
component; folding the other one in is an open cleanup.

### EventRegistrationsTable.tsx
Per-event registration list with a status dropdown, backed by
`PATCH /api/admin/events/[id]/registrations/[regId]` (there is no DELETE handler). Takes the
optional `isViewer` prop, so write controls disappear for the read-only tier.

### PostForm.tsx
Create/edit form for blog posts: markdown body, draft/publish, published-date
field, thumbnail upload via `FileUploadField`. The slug is generated on create
only, so editing a title never breaks a published URL.

### QRGenerator.tsx
Client component behind `/admin/qr`. Builds QR codes for the site's public
routes from the shared `src/types/routes.ts` list. That list lives in
`src/types/` and not in a service on purpose: a value import from
`src/lib/services/*` would drag `lib/db.ts` and the Neon driver into the
browser bundle, where db.ts's module-level `DATABASE_URL` check throws. The list
includes `/bootstrap/feedback` (S76D), and each code downloads as SVG or as a
1024px PNG (S76F).

### SponsorsTable.tsx / TeamMembersTable.tsx
Extracted list tables for sponsors and team members. Both accept `isViewer` to
hide write controls, and EDIT opens the form in the shared `AdminEditPanel`
(sponsors since S62, team since S82). `TeamMembersTable` also carries
drag-to-reorder within a tier, an inline active toggle and a per-row quick photo
upload. Its rows live in local state for those optimistic updates, so it resets
them from the prop whenever `router.refresh()` delivers a new array (S82) --
without that, a panel save or a quick photo upload looked like it did nothing
until a full reload.

### StatefulButton.tsx
Save button with idle / saving / saved states, wired into the admin save paths
so a submit gives immediate feedback instead of appearing inert.

## Components added since S72D (S73-S82)

### AdminEditPanel.tsx
The shared slide-in edit panel (S82), extracted from `SponsorsTable` (S62/D5) and
`AnnouncementsTable`, which carried identical copies; also used by
`TeamMembersTable` and `EventsTable`. Props: `open`, `onClose`, `label` (the small
heading and the `<aside>`'s accessible name), `title`, `children` (the form). It
owns the mechanics: Escape closes, body scroll locks while open, the backdrop
renders only while open (a mounted fixed inset-0 element would swallow every
click on the table), and the `<aside class="admin-panel">` stays mounted so it can
slide both ways, with `inert` while closed to keep the off-screen form out of the
tab order. Callers own `open` and the selected row, and keep the selection on
close so the content does not blank mid-slide. Only "Edit" uses it; "Add" keeps
its own page.

### AnnouncementForm.tsx
Create/edit form for the homepage announcement (S73E). Same shape as
`SponsorForm` -- `uploadToR2`, `StatefulButton`, the `onSuccess`-or-navigate
contract -- plus what SponsorForm cannot do: REMOVE buttons that clear an image.
The service is read-then-write, so an absent field means "leave alone" and an
explicit null clears. Separate desktop and mobile images so each is cropped for
its own aspect ratio.

### AnnouncementsTable.tsx
The `/admin/announcements` list: title, active, order, which images are set, the
CTA; EDIT opens `AnnouncementForm` in `AdminEditPanel`, `InlineDelete` hits the
DELETE route, viewers get no actions. Two active rows are not prevented here --
`getActiveAnnouncement`'s `LIMIT 1` is what makes only one show.

### EventsTable.tsx
The `/admin/events` list (S82), moved out of the server page so EDIT can open the
panel -- the move S62 made for sponsors. Row actions: EDIT (`EventForm` in the
panel), REGISTRATIONS (the full edit page, which keeps the registrations table and
the permanent-delete Danger Zone), ARCHIVE (soft delete). The panel ends with an
"open full page" link. Takes `rows: { event, dateLabel, formDate }[]`: both dates
are formatted by the server page, because formatting a SQL DATE in the client
uses the viewer's timezone while SSR uses the server's -- a hydration mismatch.

### GoogleSheetsExportButton.tsx
"Export to Google Sheets" beside a CSV download (S73K). One component for both
surfaces (applications, volunteer pool); only `endpoint` differs. It POSTs, then
shows an OPEN SHEET link to the exported tab, or the error inline. The CSV link
beside it is independent -- this failing, or Google being unconfigured, never
affects it. Hidden for viewers (the routes are viewer-guarded).

### SegmentedCount.tsx
The 1/2/3 segmented number tiles (S73B), extracted when `max_groups` would
otherwise have made four copies. Props: `value`, `onChange`, `max` (default 3),
`label` (the group's accessible name). Used by `BootstrapCreateSession` and the
dashboard's add-stall row, for volunteer capacity (`max` 4 since S77) and group
capacity. Deliberately NOT used for the live 1--10 capacity override, where ten
tiles would be a worse control than a number input.

