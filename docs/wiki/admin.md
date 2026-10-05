# Admin System

_Current as of Session 82C (2026-10-05)._

The admin panel is the protected back-office for the Team Vegavath site.
It lives under `/admin`, is guarded by NextAuth v5 (beta) plus middleware,
and is wrapped in the `AdminShell` chrome (collapsible sidebar nav on
desktop, an overlay menu on mobile). This guide describes the auth model,
the three account roles, the invite and password-reset flows, every admin
page, and the login audit log.

All claims below are taken from the code as it stands: `src/lib/auth.ts`,
`src/lib/services/admin.ts`, `src/middleware.ts`, the `(admin)` route group,
the token-gated public pages, the account API routes, and migrations 006,
010, 012, 019, 020 and 026.

## The three roles, and the counter-intuitive part

There are three roles: `godfather`, `admin`, and `viewer` (the last added in
migration 019). A role is exactly one of the three.

**`session.user.isAdmin` is TRUE for viewers, and that is deliberate.** It
means "may enter the admin panel", and every admin page and every admin GET
route gates on it. Viewers are supposed to read everything -- that is the
entire point of the tier -- so making `isAdmin` false for them would lock
them out of the panel completely. Do not "fix" it.

The write gate is a **separate** flag, `isViewer`, checked immediately after
the `isAdmin` check in every mutating route, and used to hide write controls
in the UI (each table takes an optional `isViewer?: boolean` defaulting to
false, so existing callers are unaffected).

**The rule for anyone adding a route: every new mutating admin handler needs
the viewer guard.** Forgetting it is a silent privilege escalation, not a
build error. The only legitimate omissions are the godfather-only account
handlers (`isGodfather && isViewer` is impossible, so the check would be dead
code) and the public token-gated routes, which have no session at all.

One judgement call worth knowing: the Bootstrap feedback *summarize* endpoint
writes nothing to the database but spends paid Gemini quota, so it is gated
with the writes rather than with the reads.

## Auth system overview

Authentication is NextAuth v5 (beta) configured in `src/lib/auth.ts` with a
single **Credentials** provider (username + password). There is no OAuth.

### The `authorize` order (DB first, env fallback)

When a user submits the login form, `authorize()` runs in this order:

1. **DB accounts first.** It looks up `admin_accounts` by lowercased
   `username`. If a row exists, the submitted password is checked against
   `password_hash` with `bcrypt.compare`. On success it returns a user
   object with `isAdmin: true`, `isGodfather: (role === "godfather")`,
   `isViewer: (role === "viewer")`, and the account's `token_version` (read in a separate query so login still
   works if migration 012 has not added the column yet -- it defaults to 0).
2. **Env "godfather" fallback.** If the `admin_accounts` table does not
   exist yet (the DB lookup throws), or the username matched no row, it
   falls through to the environment super-admin. It compares the lowercased
   username to `ADMIN_USERNAME` and the password to `ADMIN_PASSWORD_HASH`
   (a bcrypt hash). On success it returns a user with `id: "godfather"`,
   `isAdmin: true`, `isGodfather: true`, `isViewer: false`, and display name
   `ADMIN_DISPLAY_NAME` (default "Vegavath Admin").

`bcrypt.compare` is wrapped in `.catch(() => false)` in both branches so a
malformed hash (for example a bad env value) is treated as invalid
credentials rather than crashing the route.

### Sessions (JWT strategy)

Sessions use the `jwt` strategy with `maxAge` of 24 hours. The `jwt`
callback stamps `isAdmin`, `isGodfather`, `isViewer`, `accountId` (the user
id), and `tokenVersion` onto the token at sign-in. On every later refresh, for DB
accounts only (`accountId !== "godfather"`), the callback re-reads
`token_version` from `admin_accounts` and returns `null` (forcing
re-login) if it no longer matches the token's stored version, or if the
account row is gone (a deleted account is logged out on its next refresh). This is the
mechanism that kills every live session for an account when its password is
reset. If the column/table is missing or the DB errors, it allows the token
through rather than locking everyone out. The env godfather is exempt from
this check, so its JWTs are never invalidated by a version bump.

The `session` callback copies `isAdmin`, `isGodfather`, `isViewer` and
`accountId` onto `session.user`. `accountId` (S67) is the `admin_accounts.id`,
or the literal `"godfather"` for the env account -- that string, not
`isGodfather`, is the exact test for "environment-configured account", since a
DB account can carry `role = 'godfather'` too. `pages.signIn` is `/admin`, so unauthenticated access
redirects to the login screen.

### Two-layer guard

`/admin` is protected at two layers, and both are kept on purpose (see the
architecture contract in CLAUDE.md):

- **Middleware (`src/middleware.ts`).** The default export wraps the
  handler in `auth(...)`. It treats `pathname.startsWith("/admin")` (except
  the login page `/admin` itself) and `pathname.startsWith("/api/admin")`
  as protected; if there is no `req.auth`, it redirects to `/admin`.
- **In-route re-check.** Every admin page calls `await auth()` and
  `redirect("/admin")` when `!session?.user?.isAdmin`. Every admin API route
  calls `await auth()` and returns `401` when `!session?.user?.isAdmin`.
  Every mutating route then returns `403` when `isViewer`. Routes that mutate
  accounts additionally require `isGodfather`.

### Middleware exemptions

The middleware lets a few paths through without a session because a
one-time token in the URL is the gate, not the cookie:

- `/admin/invite/...` (S27 registration pages)
- `/admin/register` (S48 open viewer link page)
- `/api/admin/register` and `/api/admin/credentials/reset`
- any path matching `/admin/[username]/credentials/...` (S29 reset pages)

The middleware matcher also runs on public pages to drive **maintenance
mode**: it reads the `maintenance_mode` row from `site_settings` (cached
per Edge isolate for 60 s, with `NEXT_PUBLIC_MAINTENANCE_MODE=true` as an
emergency override) and rewrites non-admin, non-API traffic to
`/maintenance`. `/admin` and `/api` stay reachable so the toggle can be
switched off from the panel. On a DB error it fails open (site stays up).
The middleware also runs the S52B `/docs` password gate; see
[Middleware and Config](/docs/files-middleware).

## Account types

There are three roles, enforced by the `isGodfather` and `isViewer` session
flags and by `role` in `admin_accounts` (migration 010 allowed `'admin'` and
`'godfather'`, default `'admin'`; migration 019 added `'viewer'`).

| Capability | godfather | admin | viewer |
| --- | --- | --- | --- |
| Enter the panel and read every page (events, team, applications, etc.) | Yes | Yes | Yes |
| Create, edit, delete, upload, export to Google Sheets | Yes | Yes | No |
| See the Accounts list | Yes | Yes | Yes |
| Generate invite links (named, or the open viewer link) | Yes | No | No |
| See and approve/reject pending registration requests | Yes | No | No |
| Generate password-reset links for accounts | Yes | No | No |
| Delete admin accounts | Yes | No | No |

Viewers see the same pages with the write controls hidden: every table and
form takes an `isViewer` prop, and the `?new=true` / `?import=true` create
screens fall back to the list for them. The CSV exports stay open to viewers
(they are reads).

There are two ways to be a godfather:

- **The env godfather** (`id: "godfather"`) authenticated via
  `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH`. Per the code comment it "cannot
  be deleted or overridden" -- it is not a DB row, so nothing in the panel
  can remove it, and its JWT is never version-checked. This is the recovery
  account.
- **A DB account with `role = 'godfather'`.** Stored in `admin_accounts`
  like any other, but with elevated privileges.

Admins and viewers are DB accounts with `role = 'admin'` / `'viewer'`. In
the Accounts table the role renders as uppercase text with a small square dot:
gold for `godfather`, accent for `admin`, muted for `viewer`.

The account-mutating API routes all enforce
`session.user.isAdmin && session.user.isGodfather`; the Accounts page also
hides the invite controls, pending-requests table, reset button, and delete
control from non-godfather sessions.

## Invite flow

New DB accounts are created only through an invite that a godfather issues
and then approves. An invite carries the role the account will get
(`pending_role`, migration 019: `admin` or `viewer`). The state machine lives on the `admin_invite_tokens`
table (migration 010, extended by 012), whose `status` moves through
`generated` -> `pending_approval` -> `approved` | `rejected`.

### 1. Godfather generates an invite

On `/admin/accounts` the godfather enters a name, picks a role ("Admin" or
"Viewer - read only") and clicks "Generate invite", which POSTs to
`POST /api/admin/accounts/invite` with `{ inviteeName, role }`. The route
requires godfather, validates the name slugifies to something non-empty,
treats any role other than `"viewer"` as `"admin"` (an unknown value is never
trusted into a privilege level), then calls
`createInviteToken(inviteeName, role)`. That inserts a row with a 32-byte hex
`token`, the `invitee_name`, an `invitee_slug` (lowercased,
non-alphanumerics collapsed to `-`), the `pending_role`,
`status = 'generated'`, and `expires_at = now() + 48 hours`. The route
returns a full URL of the form `/admin/invite/{slug}/{token}` plus the role,
and the copy box notes "ADMIN INVITE" or "VIEWER INVITE" and the 48-hour
expiry.

Since S76C a failure returns the underlying error text
(`Failed to create invite: <message>`) and the UI shows it via `failureText`.
The route is godfather-only, so this is not a wider disclosure; swallowing it
had cost a full diagnosis round-trip on a live prod failure.

### 2. Invitee opens the registration page

`/admin/invite/[name]/[token]` (`src/app/admin/invite/[name]/[token]/page.tsx`)
is a **public** page (middleware-exempt) that lives outside the `(admin)`
route group so it gets no sidebar chrome. It calls `getInviteToken(token,
slug)`, which only returns a row while `status = 'generated'`,
`expires_at > now()`, and the slug in the URL matches `invitee_slug`. If
that returns nothing the page shows "Invalid invite link"; otherwise it
renders `AdminRegisterForm` with the name pre-filled.

### 3. Invitee submits registration

The form POSTs to `POST /api/admin/register` (public route, token is the
gate). It validates all fields, that passwords match, and length >= 8, then
re-checks the token with `getInviteToken`, bcrypt-hashes the password, and
calls `submitRegistration`. That does a conditional UPDATE: it sets
`status = 'pending_approval'` and stores `pending_username` (lowercased),
`pending_display_name`, `pending_email`, `pending_mobile`, and
`pending_password_hash` on the token row -- only if the row is still
`generated` and unexpired. No account exists yet. The response tells the
user the request is awaiting approval.

### 4. Godfather approves or rejects

Pending rows surface in the "PENDING REQUESTS" table at the top of
`/admin/accounts` (godfather only), and the Accounts nav link shows an
accent dot when any exist (`hasPendingAccounts` in `AdminShell`).

- **Approve** -> `POST /api/admin/accounts/[id]/approve` (godfather only).
  It loads the invite, verifies it is `pending_approval` with the pending
  fields present, calls `createAdminAccount(...)` (which inserts into
  `admin_accounts` with the already-hashed password and
  `role = pending_role === 'viewer' ? 'viewer' : 'admin'`), then sets the
  invite `status = 'approved'`. The account
  can now log in. If the username already exists the insert fails and the
  route returns 500 with an explanatory message.
- **Reject** -> `POST /api/admin/accounts/[id]/reject` (godfather only).
  It verifies the invite is `pending_approval` and sets `status =
  'rejected'`; no account is created.

### The open viewer link (S48)

Named invites do not scale to a 30-person domain, so a godfather can also
mint ONE reusable, unnamed link that registers anyone as a viewer. Per-person
approval still happens in Pending Requests.

- **Create.** `POST /api/admin/accounts/invite` with `{ type: "open" }` calls
  `createOpenViewerToken()`: a row with `is_open = true` (migration 020),
  `pending_role = 'viewer'`, `status = 'generated'`, and a **30-day** expiry.
  The URL is the flat `/admin/register?token={token}` (there is no invitee name
  to slugify).
- **List and revoke.** `GET /api/admin/accounts/invite?type=open` returns the
  active open links (the accounts page server-renders the same list; this lets
  the client refresh it). `DELETE /api/admin/accounts/invite?tokenId=...`
  revokes one by setting `status = 'rejected'`.
- **Register.** `/admin/register` is public and chrome-less. A valid open token
  renders `AdminRegisterForm` in open mode; a still-valid NAMED token pasted
  into that URL redirects to its canonical `/admin/invite/{slug}/{token}` page;
  anything else shows "Invalid invite link". The form POSTs
  `/api/admin/register` with `open: true`, and `submitOpenRegistration` writes a
  **fresh named row** (`is_open = false`, `status = 'pending_approval'`, its own
  48-hour expiry) carrying the registration -- the open token itself is left
  untouched so it stays reusable. From there approval is identical to a named
  invite.
- **Production only (S67).** The `OpenViewerLink` control renders only when
  `NEXT_PUBLIC_SHOW_VIEWER_INVITES === "true"`, which is set in the prod Vercel
  project and nowhere else: an open link minted against the draft or a local
  database would be a live credential path into that environment. It renders
  nothing at all otherwise (a disabled control would advertise the feature).
  This is an additional condition on top of the godfather gate, not a
  replacement for it.

## Password reset flow

Password resets are godfather-initiated and use a separate table,
`admin_password_reset_tokens` (migration 012: 2-hour expiry, single-use via
`used_at`, `ON DELETE CASCADE` from `admin_accounts`).

### 1. Godfather generates a reset link

From the Accounts table the godfather clicks "Reset password" for a row,
which POSTs to `POST /api/admin/accounts/[id]/reset-token` (godfather only).
It calls `createPasswordResetToken(accountId)`, which deletes any
outstanding reset token for that account, inserts a fresh 32-byte hex
token, and the route returns a URL of the form
`/admin/{username}/credentials/{token}`.

### 2. Account holder opens the reset page

`/admin/[username]/credentials/[token]`
(`src/app/admin/[username]/credentials/[token]/page.tsx`) is a **public**,
chrome-less page (middleware-exempt). It calls `getPasswordResetToken(token)`
-- which joins to `admin_accounts` and only returns a row where `used_at IS
NULL` and `expires_at > now()` -- and additionally checks that the row's
`username` matches the one baked into the URL. Otherwise it shows "Invalid
reset link". On success it renders `ResetPasswordForm`.

### 3. New password is set

The form POSTs to `POST /api/admin/credentials/reset` (public, token is the
gate). It validates match and length >= 8 and calls
`consumePasswordResetToken(token, newPassword)`. That re-validates the token,
bcrypt-hashes the new password, updates `admin_accounts` setting
`password_hash` and **`token_version = token_version + 1`**, then marks the
reset token `used_at = now()`. Bumping `token_version` is what invalidates
every live JWT for that account on its next refresh (see the jwt callback
above), forcing a re-login everywhere.

## Admin pages

All pages live in the `(admin)` route group, are `force-dynamic`, re-check
`isAdmin` at the top, and (except the login screen) render inside
`AdminShell`. The sidebar is grouped into four labelled sections (S65):

- **Overview:** Dashboard
- **Content:** Events, Posts, Team, Gallery, Road So Far, Sponsors,
  Announcements
- **Recruitment:** Applications
- **System:** Bootstrap, Settings, QR Codes, Profile, Accounts

**Editing (S82).** On the Events, Team, Sponsors and Announcements lists, EDIT
opens the form in a slide-in panel over the table (`AdminEditPanel`, one shared
component) instead of navigating away; the panel closes and the table refreshes
on save. "Add" / "New" still uses its own page (`?new=true`). Events, Team and Sponsors also keep
their full-page edit routes; announcements are panel-only.

**Uploads (S76E).** Every admin upload goes through one helper,
`uploadToR2(file, path)` in `src/lib/utils.ts`, which POSTs to
`/api/admin/upload`. It refuses a file over 4 MB before uploading (Vercel's
request body limit is about 4.5 MB, and a phone HDR photo is routinely 4-6 MB),
with a message that names the file and its size.

### `/admin` -- Login

Standalone screen with no sidebar (`AdminShell` returns children bare when
`pathname === "/admin"`). If already authenticated it redirects to
`/admin/dashboard`. The login server action captures IP
(`x-forwarded-for` / `x-real-ip`) and user-agent, applies a **DB-backed rate
limit** (5 failed attempts per IP per 15 minutes, queried against
`admin_login_log`; locked users get `?error=locked`), calls
`signIn("credentials", ...)`, and writes a success or failure row to
`admin_login_log`. It distinguishes success from failure by catching
`AuthError` (failure) versus Next.js's internal redirect throw (success).

### `/admin/dashboard` -- Dashboard

Overview page. Shows a recruitment OPEN/CLOSED badge (from `site_settings`),
four stat cards (Events, Team Members, Gallery Items, Active Sponsors), a
**Recent Logins** table (latest 10 from `admin_login_log`), and a **Recent
Applications** table (latest 10 from the join form, domains shown in the
fixed /join order). All data is fetched in
parallel with per-query `.catch` fallbacks so one failing service does not
blank the page.

### `/admin/events` and `/admin/events/[id]/edit` -- Events

The list page loads up to 100 events into `EventsTable` (S82): EDIT opens
`EventForm` in the slide-in panel, REGISTRATIONS goes to the full edit page,
and ARCHIVE is a soft delete (`InlineDelete` against
`DELETE /api/admin/events?id=...`). `?new=true` shows the create form
(`EventForm mode="create"`). Dates are formatted on the server and passed in,
because formatting a SQL DATE in the client would use the viewer's timezone
while SSR uses the server's.

The edit page loads the event with `getEventById` and its registrations with
`getEventRegistrations` (both in `services/events.ts`), and renders
`EventForm`, `ToggleEventStatusButton`, `EventRegistrationsTable` (S47, the
native /register sign-ups) and a Danger Zone with `DeleteEventButton`
(permanent delete). Viewers can read the registrations; the form, toggle and
Danger Zone are hidden for them.

The `hackathons` category is accepted by the DB since migration 018 (applied)
but has never been exercised through the form; creating one is the remaining
check.

### `/admin/team` and `/admin/team/[id]/edit` -- Team

Manages team members. The list supports `?new=true` (add member via
`MemberForm`) and `?import=true` (bulk import via `BulkImportTeam`), and
shows `BulkTeamPhotoUpload` above `TeamMembersTable`. The table carries
drag-to-reorder within a tier, an inline active toggle, a per-row
`QuickPhotoUpload`, `InlineDelete`, and EDIT in the slide-in panel (S82). The
edit page (`getTeamMemberById`) edits a single member and holds
`DeleteMemberButton`.

### `/admin/applications` -- Applications

The recruitment pipeline viewer. Filter tabs are the status pipeline (ALL,
PENDING, SHORTLISTED, INTERVIEW, SELECTED, REJECTED) plus one tab per
interview group (from `INTERVIEW_GROUPS`), which filter by `interview_group`
rather than status. It loads up to 200 applications for the active filter
(`?status=` or `?group=`) and renders `ApplicationsTable`.

- **Rows.** Domains are listed in the fixed /join order (`orderedDomainLabels`,
  S82B); a stored pre-S82B "Operations" or "Sponsorship" displays as
  "Operations & Sponsorship". Expanding a row shows the contact details, the
  course (S81), and either the new-form answers -- grouped by question set in
  /join order, with the merged domains' answers under their branch headings --
  or, for a pre-S81 row (`answers IS NULL`), the old free-text fields.
- **Controls.** Per-row status and interview-group selects, bulk status on a
  selection, and (on the plain INTERVIEW tab) an auto-assign strip that
  round-robins unassigned interviewees across 1-4 panels. All hidden for
  viewers.
- **Export.** EXPORT CSV (`GET /api/admin/applications/export`, honours the
  status filter, open to viewers) and, for non-viewers, "Export to Google
  Sheets" (`POST /api/admin/applications/export/google`, S73K) via
  `GoogleSheetsExportButton`. The two are independent: the CSV never depends on
  the Google integration being configured or reachable.

### `/admin/bootstrap` -- Bootstrap

Event-day operations for the "Bootstrap" event. If a `BootstrapSession` is
active it renders `BootstrapAdminDashboard` seeded with that session's stalls
and volunteers; otherwise it renders `BootstrapSessions` (all sessions, the
unassigned pre-registration pool, and `isViewer`) to create or select one. The
whole subsystem -- QR check-in, groups, the stall queue and visits, the visitor
checklist, volunteer self-registration, feedback -- is documented in
[Bootstrap](/docs/bootstrap).

### `/admin/gallery` -- Gallery

Lists up to 200 gallery items (event label, type, caption, URL) with a
delete control, and provides `GalleryUploadForm` for adding items (image
uploads go to R2). Remember the R2 gotcha: never overwrite an object key,
upload under a new timestamped filename.

### `/admin/milestones` -- Road So Far

Manages the milestone timeline (the `milestones` table from migration 010:
`date_label`, `title`, `description`, `sort_order`). Loads all milestones and
renders `MilestonesTable` for inline editing/ordering.

### `/admin/sponsors` and `/admin/sponsors/[id]/edit` -- Sponsors

Manages sponsors. The list page supports `?new=true` (add via `SponsorForm
mode="create"`) and renders `SponsorsTable`, where EDIT opens the form in the
slide-in panel (the first table to get it, S62) and `InlineDelete` removes a
row. The edit page (`getSponsorById`) edits a single sponsor. `is_active`
controls whether a sponsor counts toward the dashboard's "Active Sponsors" stat
and appears publicly.

### `/admin/announcements` -- Announcements

The homepage announcement slot (S73E, table `announcements`, migration 026).
`?new=true` shows `AnnouncementForm mode="create"`; the list (up to 50 rows)
is `AnnouncementsTable`, with EDIT in the slide-in panel and `InlineDelete`.
Each announcement has a title, optional body, an optional CTA (shown only when
both label and link are set), and separate desktop and mobile images, each
removable. Only one shows: the homepage takes the first active row by
`display_order` (`LIMIT 1`), so two active rows are allowed but only the first
appears.

### `/admin/posts`, `/admin/posts/new`, `/admin/posts/[id]/edit` -- Posts

Blog post manager backing `/posts`. Markdown body, draft/publish toggle, a
published-date field, and a thumbnail upload through `FileUploadField`.

Two things to know before editing this code. The slug is generated **on create
only**, so published URLs stay stable when a title is later edited. And the
update path uses the read-then-write shape rather than
`COALESCE(${value ?? null}, column)`, because posts have columns an admin must
be able to CLEAR and COALESCE can never write a NULL back. `posts.ts` is the
reference implementation for both.

### `/admin/profile` -- Profile

The signed-in admin's own account record: display name, mobile number
(10 digits, filtered as typed), and a password change that requires the current
password. The page reads the record server-side; saves go to
`PATCH /api/admin/accounts/me`, which scopes its UPDATE to the caller's own
`accountId`. The env godfather has no `admin_accounts` row, so it gets a
read-only "Environment-configured account" card instead of the form.

### `/admin/qr` -- QR generator

"QR Codes" in the nav. Generates QR codes for the site's public route pages.
The dropdown is driven by `QR_ROUTES` in the shared `src/types/routes.ts`
list: the sitemap's routes plus `/bootstrap/feedback` (S76D), which is public
and shareable but not crawlable. Each code downloads as SVG or as a 1024px PNG
(S76F). That file exists precisely so a client component can share the route
list **without** importing a service -- a value import from
`src/lib/services/*` drags `lib/db.ts` and the Neon driver into the browser
bundle, where db.ts's module-level `DATABASE_URL` check throws.

### `/admin/settings` -- Settings

Edits the `site_settings` key/value store via `SettingsForm`. The
`SiteSettings` shape covers `recruitment_open`, `maintenance_mode`,
`maintenance_message`, `contact_email`, `contact_phone`, `contact_address`,
`instagram_url`, `linkedin_url`, `github_url`, and `f1_enabled`. The
`maintenance_mode` toggle here is what the middleware reads to rewrite the
public site to `/maintenance`; `f1_enabled` is the kill switch for every `/f1`
page, and a missing row reads as OFF by design.

The read-only "Recent Applications" table that used to sit below the form was
removed in S58; `/admin/applications` is the canonical view. A viewer has
nothing writable here, so it sees a notice instead of the form.

### `/admin/accounts` -- Accounts

Admin account management (covered in detail above). Everyone with `isAdmin`
can view the accounts table (display name, username, mobile, role, created).
Godfathers additionally see the pending-requests table (with each request's
role), the "Generate invite" control, the open viewer link (production only),
a per-row "Reset password" button, and a delete control. Deletion goes through `DELETE /api/admin/accounts?id=...`,
which requires godfather and refuses to delete the **last** admin account
(`countAdminAccounts() <= 1` -> 400); the UI also disables delete when only
one account remains.

## Login audit log

Every login attempt is recorded in `admin_login_log` (migration 006):

| Column | Meaning |
| --- | --- |
| `id` | UUID primary key |
| `attempted_at` | timestamp, defaults to `now()` (indexed DESC) |
| `success` | boolean -- did the credentials pass |
| `ip_address` | client IP from `x-forwarded-for` / `x-real-ip` |
| `user_agent` | raw user-agent string |
| `device_hint` | derived: "Mobile", "Desktop", or "Unknown" |

Writes happen in the login server action on `/admin` via
`logAdminLogin(...)`, which computes `device_hint` from the user-agent with a
`mobile|android|iphone|ipad` regex. The write is wrapped in `.catch(() => {})`
so a logging failure never breaks login. The same table doubles as the
**rate-limit** source: the action counts `success = false` rows for the IP in
the last 15 minutes and locks at 5.

The log is surfaced in the UI on the **Dashboard** page via
`getRecentLogins(10)` -- the "Recent Logins" table shows the latest 10
attempts with when, status (green SUCCESS / red FAILED dot), IP, and device.
