# Admin Components

_Current as of Session 72D (2026-08-12)._

Per-file reference for every React component under `src/components/admin/`.
These are the client-side building blocks the `(admin)` pages compose: forms,
tables, upload widgets, toggles, and the sidebar chrome. For the auth model,
account types, invite/reset flows, and the pages themselves, see
`docs/wiki/admin.md` -- this document stays at the component level and every
claim is taken from the source as it stands.

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

## ApplicationsTable.tsx

`src/components/admin/ApplicationsTable.tsx` -- the recruitment pipeline table on
`/admin/applications`: expandable rows, per-row status and interview-group
controls, bulk selection, and an interview-panel auto-assign strip.

**Props.** `applications: Application[]` (the filtered list from the page) and
`showPanelAssign?: boolean` (default `false`). The page sets `showPanelAssign`
only on the plain INTERVIEW tab so the auto-assign strip appears exactly where
it makes sense.

**State.** `expandedId` (which row's detail panel is open); `panelCount`
(1--4 or null, the auto-assign panel count); `assigning` (auto-assign in
flight); `statuses` (a `Record<id, ApplicationStatus>` of optimistic status
overrides); `groups` (a `Record<id, InterviewGroup | null>` of optimistic group
overrides); `updatingId` (row with a status PATCH in flight); `selected` (a
`Set<string>` of checked row ids); `bulkStatus` (the chosen bulk status);
`bulkBusy` (bulk apply in flight).

**Key functions and endpoints.**

- `statusOf(app)` / `groupOf(app)` -- resolve the effective status/group from
  the optimistic override or the row. `groupOf` uses an explicit `undefined`
  check because a stored `null` means "cleared" and must beat `??`.
- `toggleSelected(id)` -- add/remove a row id from `selected`.
- `changeGroup(id, group)` -- optimistically sets the group, then
  `PATCH /api/admin/applications/${id}/group` with `{ group }`; reverts and
  alerts on failure.
- `handleBulkStatus()` -- `POST /api/admin/applications/bulk-status` with
  `{ ids: [...selected], status }`; on success clears the selection and
  `router.refresh()`.
- `handleAutoAssign()` -- `POST /api/admin/applications/auto-assign-groups` with
  `{ panel_count }`; round-robins unassigned interviewees oldest-first, then
  refreshes.
- `changeStatus(id, status)` -- `PATCH /api/admin/applications/${id}/status`
  with `{ status }`; records the optimistic override on success.
- `hasUnassignedInterviewees` -- derived flag; gates the panel strip so it only
  shows when there is actually someone at `interview` with no group.

**Render logic.**

- **Auto-assign panel strip** (only when `showPanelAssign` and unassigned
  interviewees exist): segmented A / A--B / A--C / A--D tiles select the panel
  count, an AUTO-ASSIGN button fires `handleAutoAssign`, with a one-line
  explanation.
- **Table.** A header select-all checkbox; each row has a per-row checkbox,
  name, email, domain list (built by `domainList` joining up to three domain
  fields with a middle dot), semester, formatted date, a status cell with a
  colored `admin-dot` (`STATUS_COLORS` maps each pipeline stage; `reviewed` and
  `accepted` are legacy), group tiles, and an actions cell.
- **Group tiles** render only for `interview` or `shortlisted` rows -- one
  square button per `INTERVIEW_GROUPS` entry, toggling the group on/off. The
  checkbox and actions/group cells call `stopPropagation` so clicking them does
  not toggle the row's expand.
- **Expanded row** spans all columns and shows applicant contact line, domains,
  why-join, value-add, experience, and an optional portfolio link.
- **Empty state:** a single "NO APPLICATIONS" row.
- **Bulk action bar** is sticky to the bottom and appears only when
  `selected.size > 0`: it shows the count, a status select, an APPLY button, and
  an x to clear the selection.

**Why it exists.** Combines review (read the answers inline), triage (status +
group in one place), and batch operations (bulk status, panel auto-assign) into
one table so recruitment can move a cohort through the pipeline without leaving
the page. The optimistic override maps avoid a full refetch on every single-row
edit while still using `router.refresh()` for bulk changes.

## BootstrapAdminDashboard.tsx

`src/components/admin/BootstrapAdminDashboard.tsx` -- the live event-day console
for an active Bootstrap session (the largest admin component). It polls stall
and volunteer state, lets admins override stalls, place pins on a map, manage
two classes of volunteers, review feedback, and trigger a Gemini summary.

**Props.** `session: BootstrapSession`, `initialStalls: BootstrapStall[]`,
`initialVolunteers: BootstrapVolunteer[]` -- the server seeds the first render;
polling keeps them current thereafter.

**State.** `stalls`, `volunteers` (seeded from props, replaced by polls);
`expandedId` (open stall card); `overrideStatus` and `overrideClaimedBy` (the
manual-override form values for the expanded stall); `busy` (override in
flight); `editingStall` (the stall whose pin the next map click sets);
`feedback` (the feedback summary object, loaded on demand); `summaryOpen`,
`summary`, `summaryMeta`, `summarizing`, `summaryError` (the Gemini summary
modal); `origin` (set from `window.location.origin` after mount to avoid a
hydration mismatch on the feedback URL line).

**Polling.** `POLL_MS = 4000`. `poll()` GETs
`/api/admin/bootstrap/sessions/${session.id}` and replaces `stalls` and
`volunteers`. An effect starts a `setInterval(poll, 4000)`, and a
`visibilitychange` listener stops the interval when the tab is hidden and
polls-then-restarts when it returns, so a backgrounded tab does not hammer the
API.

**Key functions and endpoints.**

- `expandStall(stall)` -- toggles the card open and seeds the override form from
  the stall.
- `applyOverride(stallId)` -- `PATCH /api/admin/bootstrap/stalls/${stallId}` with
  `{ status, claimed_by }` (claimed_by is the comma-split, trimmed, rejoined
  input); replaces the stall locally on success.
- `handlePositionSet(stallId, x, y)` -- pin-drop:
  `PATCH .../stalls/${stallId}/position` with `{ map_x, map_y }`, optimistic
  local update, then deselects the stall.
- `handleClearPosition(stallId)` -- same endpoint with nulls to clear a pin.
- `unlock(volunteerId)` -- `PATCH .../volunteers/${volunteerId}/unlock`, then
  `poll()`.
- `deactivate()` -- confirms, then
  `PATCH .../sessions/${session.id}/active` with `{ is_active: false }`, then
  `router.refresh()` (which drops back to the session picker).
- `suggest(volunteerId, stallId)` -- `PATCH .../volunteers/${volunteerId}/suggest`
  with `{ stall_id }` (null clears), then `poll()`.
- `loadFeedback()` -- GET `.../sessions/${session.id}/feedback`; loaded once on
  mount and again on the manual REFRESH button, deliberately not on the 4s poll
  since feedback is low-churn.
- `handleSummarizeFeedback()` -- opens the modal and
  `POST .../sessions/${session.id}/summarize`; stores the returned summary and
  meta (responseCount, avgOverall, avgJoin) or an error.

**Derived data.** `stallVolunteers` (role `"stall"`) and `groupVolunteers`
(role `"lead"`, re-sorted by `group_number`, unassigned last); `longWaiters`
(queued stalls waiting more than 15 minutes, computed from polled `queued_at`);
`counts` (free/occupied/queued stall tallies and active-volunteer count); and a
`stats` tuple array using the Bootstrap status palette.

**Render logic (top to bottom).**

- Header with the session name and a DEACTIVATE SESSION button (whose `confirm`
  warns that volunteers will be signed out of `/bootstrap`).
- The shared feedback URL line.
- Long-wait warning banners, one per `longWaiters` entry, showing who has waited
  how many minutes.
- A stats bar of the four counts.
- A `StallGrid` of `StallCard`s; each card's expanded actions are a status
  select, a claimed-by text input, and an "Apply override" button.
- **Stall Volunteers** table (name, username, stall, phone, login code, status,
  unlock action) and **Group Volunteers** table (adds group number, an IN CLASS
  badge, and a "suggest stall" select alongside unlock). Login codes are shown
  in plaintext by design, since these accounts only reach `/bootstrap`.
- **Feedback** section: a REFRESH button, a SUMMARISE FEEDBACK button (disabled
  when there are zero responses), stat tiles (avg overall /10, avg join /5,
  response count), a per-stall average table, and a collapsible list of up to
  five recent comments; a "No feedback yet" line when empty.
- **Stall positions on map** in a native `<details>` (shown only while the
  session is active): an inline `BootstrapMapSVG` plus a per-stall list with
  PLACE PIN / PLACING... toggles, the current `(x%, y%)`, and a CLEAR action.
- **Gemini summary modal** (when `summaryOpen`): a backdrop plus a centered
  panel with a header (title + meta line), a body that shows "GENERATING
  SUMMARY...", the error, or the summary (with `**bold**` markdown rendered as
  styled spans), and a footer crediting "Gemini 3.5 Flash".

**Why it exists.** It is the single operational surface for a running Bootstrap
day. The visibility-aware polling, on-demand (non-polled) feedback loads, and
optimistic pin-drop are all deliberate choices to keep it live without wasting
requests. Volunteer roles are baked in at self-registration (S35), so there is
no role toggle here -- only unlock and stall suggestion.

## BootstrapCreateSession.tsx

`src/components/admin/BootstrapCreateSession.tsx` -- a two-step wizard for
creating a Bootstrap session with its stalls, ending on a success screen that
hands over the two self-registration links.

**Props.** `onDone: () => void` -- called from the success screen's DONE button
(the parent `BootstrapSessions` uses it to exit create mode and refresh).

**State.** `step` (1 or 2); step-1 fields `name`, `maxGroupSize`, `groupCount`;
step-2 stall builder `stalls` (a `StallDraft[]`), plus the in-progress
`stallName`, `stallOcc` (1--3), `stallLeadsText`, and `stallError`; submission
`busy`, `error`, `created` (success flag); `origin` (set after mount for the
link display).

**Key functions and endpoints.**

- `addStall()` -- parses lead names from the textarea (split on newlines/commas),
  caps them at 3 (else sets `stallError`), pushes a `StallDraft`
  (`stall_name`, `max_occupancy`, `lead_names`), and clears the inputs.
- `moveStall(index, dir)` -- swaps a stall with its neighbor to reorder the list.
- `submit()` -- `POST /api/admin/bootstrap/sessions` with
  `{ name, stalls, group_count, max_group_size }`; on success sets `created`,
  else surfaces the error.

**Render logic.**

- A step indicator (two segments) reads "Step N of 2".
- **Step 1:** session name, a "Visitor groups" number (1--26) and a "Max visitors
  per group" number, with a NEXT button gated on a non-empty name and a valid
  group count.
- **Step 2:** a stall-name input (Enter adds), a 1/2/3 segmented max-occupancy
  picker, an ADD button, an optional stall-lead-names textarea (max 3, reference
  only -- no accounts created), and the running stall list with up/down reorder
  and remove controls; BACK and CREATE SESSION buttons (the latter disabled with
  zero stalls).
- **Success screen** (`created`): two copyable link boxes --
  `/bootstrap/register/stall` and `/bootstrap/register/group` -- a note that
  registration opens once the session is activated and that group numbers are
  handed out first-come-first-served, and a DONE button calling `onDone`.

**Why it exists.** The S35 redesign removed the old credential-CSV step:
volunteers now self-register, so the wizard is two steps and the payoff is the
pair of registration links rather than a downloadable file. Lead names are kept
purely informational (shown on stall cards). `origin` is read after mount to
keep the link display free of hydration mismatches.

## BootstrapSessions.tsx

`src/components/admin/BootstrapSessions.tsx` -- the Bootstrap landing view when
no session is active: lists sessions, activates/deletes them, and hosts the
create wizard.

**Props.** `sessions: BootstrapSession[]` -- all sessions from the page.

**State.** `creating` (boolean; when true it renders `BootstrapCreateSession`
instead of the list); `busyId` (the session id with an action in flight).

**Key functions and endpoints.**

- `activate(id)` -- `PATCH /api/admin/bootstrap/sessions/${id}/active` with
  `{ is_active: true }`, then `router.refresh()`.
- `handleDelete(id, name)` -- confirms (warning that stalls and volunteer
  accounts go too), then `DELETE /api/admin/bootstrap/sessions/${id}`; alerts on
  failure, else refreshes.
- `isStale(s)` -- derived: an inactive session created more than 7 days ago
  (`created_at` is the only timestamp available), used to surface a cleanup
  nudge.

**Render logic.** If `creating`, it delegates to `BootstrapCreateSession` with
an `onDone` that exits create mode and refreshes. Otherwise: a header with a
CREATE SESSION button and a table (name, created date, stall count, status dot,
actions). Stale rows show a sub-line nudging deletion to clear volunteer
accounts. Only inactive rows expose ACTIVATE and DELETE; the active session has
no actions here (it is managed from the dashboard). An empty state prompts
creating the first session.

**Why it exists.** Keeps session lifecycle (create, activate, delete) in one
place, and the stale-session warning exists because self-registered volunteer
accounts accumulate in old sessions and deletion is intentionally a manual
click, never automated.

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
  runs a two-step call in parallel across files: `POST /api/admin/upload` with a
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
- `uploadFile(file, path)` -- `POST /api/admin/upload` (multipart), returns the
  stored URL.
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
  `POST`s to `/api/admin/upload` under a timestamped
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

- `uploadFile(file, path)` -- `POST /api/admin/upload`, returns the URL.
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

**Key functions and endpoints.** `handleFile(file)` -- `POST /api/admin/upload`
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

- `uploadFile(file, path)` -- `POST /api/admin/upload`, returns the URL.
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
`GET`/`PATCH /api/admin/accounts/me` -- display name, mobile number, password.

### CommandPalette.tsx
Keyboard-driven navigation over the admin routes.

### CopyButton.tsx
Extracted copy-to-clipboard button, used for invite links and gallery URLs.
Note the known duplicate: `AccountsActions.tsx` still contains an unexported
`CopyLinkButton` that does the same job and was left un-refactored. Prefer this
component; folding the other one in is an open cleanup.

### EventRegistrationsTable.tsx
Per-event registration list with a status dropdown, backed by
`PATCH`/`DELETE /api/admin/events/[id]/registrations/[regId]`. Takes the
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
browser bundle, where db.ts's module-level `DATABASE_URL` check throws.

### SponsorsTable.tsx / TeamMembersTable.tsx
Extracted list tables for sponsors and team members. `TeamMembersTable` carries
drag-to-reorder within a tier, an inline active toggle, and a per-row quick
photo upload. Both accept `isViewer` to hide write controls.

### StatefulButton.tsx
Save button with idle / saving / saved states, wired into the admin save paths
so a submit gives immediate feedback instead of appearing inert.
