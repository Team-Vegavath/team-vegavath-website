# Admin System

The admin panel is the protected back-office for the Team Vegavath site.
It lives under `/admin`, is guarded by NextAuth v5 (beta) plus middleware,
and is wrapped in the `AdminShell` chrome (sidebar nav on desktop, an
overlay menu on mobile). This guide describes the auth model, the two
account types, the invite and password-reset flows, every admin page, and
the login audit log.

All claims below are taken from the code as it stands: `src/lib/auth.ts`,
`src/lib/services/admin.ts`, `src/middleware.ts`, the `(admin)` route group,
the token-gated public pages, the account API routes, and migrations 006,
010, and 012.

## Auth system overview

Authentication is NextAuth v5 (beta) configured in `src/lib/auth.ts` with a
single **Credentials** provider (username + password). There is no OAuth.

### The `authorize` order (DB first, env fallback)

When a user submits the login form, `authorize()` runs in this order:

1. **DB accounts first.** It looks up `admin_accounts` by lowercased
   `username`. If a row exists, the submitted password is checked against
   `password_hash` with `bcrypt.compare`. On success it returns a user
   object with `isAdmin: true`, `isGodfather: (role === "godfather")`, and
   the account's `token_version` (read in a separate query so login still
   works if migration 012 has not added the column yet -- it defaults to 0).
2. **Env "godfather" fallback.** If the `admin_accounts` table does not
   exist yet (the DB lookup throws), or the username matched no row, it
   falls through to the environment super-admin. It compares the lowercased
   username to `ADMIN_USERNAME` and the password to `ADMIN_PASSWORD_HASH`
   (a bcrypt hash). On success it returns a user with `id: "godfather"`,
   `isAdmin: true`, `isGodfather: true`, and display name
   `ADMIN_DISPLAY_NAME` (default "Vegavath Admin").

`bcrypt.compare` is wrapped in `.catch(() => false)` in both branches so a
malformed hash (for example a bad env value) is treated as invalid
credentials rather than crashing the route.

### Sessions (JWT strategy)

Sessions use the `jwt` strategy with `maxAge` of 24 hours. The `jwt`
callback stamps `isAdmin`, `isGodfather`, `accountId` (the user id), and
`tokenVersion` onto the token at sign-in. On every later refresh, for DB
accounts only (`accountId !== "godfather"`), the callback re-reads
`token_version` from `admin_accounts` and returns `null` (forcing
re-login) if it no longer matches the token's stored version. This is the
mechanism that kills every live session for an account when its password is
reset. If the column/table is missing or the DB errors, it allows the token
through rather than locking everyone out. The env godfather is exempt from
this check, so its JWTs are never invalidated by a version bump.

The `session` callback copies `isAdmin` and `isGodfather` onto
`session.user`. `pages.signIn` is `/admin`, so unauthenticated access
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
  Routes that mutate accounts additionally require `isGodfather`.

### Middleware exemptions

The middleware lets a few paths through without a session because a
one-time token in the URL is the gate, not the cookie:

- `/admin/invite/...` (S27 registration pages)
- `/api/admin/register` and `/api/admin/credentials/reset`
- any path matching `/admin/[username]/credentials/...` (S29 reset pages)

The middleware matcher also runs on public pages to drive **maintenance
mode**: it reads the `maintenance_mode` row from `site_settings` (cached
per Edge isolate for 60 s, with `NEXT_PUBLIC_MAINTENANCE_MODE=true` as an
emergency override) and rewrites non-admin, non-API traffic to
`/maintenance`. `/admin` and `/api` stay reachable so the toggle can be
switched off from the panel. On a DB error it fails open (site stays up).

## Account types

There are exactly two roles. The distinction is enforced by the
`isGodfather` flag on the session and by `role` in `admin_accounts` (a CHECK
constraint allows only `'admin'` and `'godfather'`, default `'admin'` --
migration 010).

| Capability | godfather | regular admin |
| --- | --- | --- |
| Log in and use every content page (events, team, gallery, etc.) | Yes | Yes |
| See the Accounts list | Yes | Yes |
| Generate invite links | Yes | No |
| See and approve/reject pending registration requests | Yes | No |
| Generate password-reset links for accounts | Yes | No |
| Delete admin accounts | Yes | No |

There are two ways to be a godfather:

- **The env godfather** (`id: "godfather"`) authenticated via
  `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH`. Per the code comment it "cannot
  be deleted or overridden" -- it is not a DB row, so nothing in the panel
  can remove it, and its JWT is never version-checked. This is the recovery
  account.
- **A DB account with `role = 'godfather'`.** Stored in `admin_accounts`
  like any other, but with elevated privileges.

Regular admins are DB accounts with `role = 'admin'`. In the Accounts UI the
role renders with a colored dot: gold for `godfather`, accent for `admin`.

The account-mutating API routes all enforce
`session.user.isAdmin && session.user.isGodfather`; the Accounts page also
hides the invite button, pending-requests table, reset button, and delete
control from non-godfather sessions.

## Invite flow

New DB accounts are created only through an invite that a godfather issues
and then approves. The state machine lives on the `admin_invite_tokens`
table (migration 010, extended by 012), whose `status` moves through
`generated` -> `pending_approval` -> `approved` | `rejected`.

### 1. Godfather generates an invite

On `/admin/accounts` the godfather clicks "Generate invite", which POSTs to
`POST /api/admin/accounts/invite` with an `inviteeName`. The route requires
godfather, validates the name slugifies to something non-empty, then calls
`createInviteToken(inviteeName)`. That inserts a row with a 32-byte hex
`token`, the `invitee_name`, and an `invitee_slug` (lowercased,
non-alphanumerics collapsed to `-`), `status = 'generated'`, and
`expires_at = now() + 48 hours`. The route returns a full URL of the form
`/admin/invite/{slug}/{token}` for the godfather to share.

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
  `admin_accounts` with the already-hashed password and default
  `role = 'admin'`), then sets the invite `status = 'approved'`. The account
  can now log in. If the username already exists the insert fails and the
  route returns 500 with an explanatory message.
- **Reject** -> `POST /api/admin/accounts/[id]/reject` (godfather only).
  It verifies the invite is `pending_approval` and sets `status =
  'rejected'`; no account is created.

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
`usePasswordResetToken(token, newPassword)`. That re-validates the token,
bcrypt-hashes the new password, updates `admin_accounts` setting
`password_hash` and **`token_version = token_version + 1`**, then marks the
reset token `used_at = now()`. Bumping `token_version` is what invalidates
every live JWT for that account on its next refresh (see the jwt callback
above), forcing a re-login everywhere.

## Admin pages

All pages live in the `(admin)` route group, are `force-dynamic`, re-check
`isAdmin` at the top, and (except the login screen) render inside
`AdminShell`. The sidebar nav order is: Dashboard, Events, Team,
Applications, Bootstrap, Gallery, Road So Far, Sponsors, Settings, Accounts.

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
Applications** table (latest 10 from the join form). All data is fetched in
parallel with per-query `.catch` fallbacks so one failing service does not
blank the page.

### `/admin/events` and `/admin/events/[id]/edit` -- Events

The list page (`?new=true` shows the create form via `EventForm mode="create"`)
lists up to 100 events with dates and a delete control (`InlineDelete`). The
edit page loads a single event by id (via a direct `SELECT` in the page --
note: the wider contract wants SQL in services, this page reads inline),
renders `EventForm` for editing, plus `ToggleEventStatusButton` and
`DeleteEventButton`. Known open item (CLAUDE.md): the `hackathons` category
is offered by the form but rejected by the DB CHECK constraint, causing a
500 on create.

### `/admin/team` and `/admin/team/[id]/edit` -- Team

Manages team members. The list supports `?new=true` (add member via
`MemberForm`) and `?import=true` (bulk import via `BulkImportTeam`). It also
wires up `BulkTeamPhotoUpload` and `QuickPhotoUpload` for member photos, and
`InlineDelete` per row. The edit page edits a single member.

### `/admin/applications` -- Applications

The recruitment pipeline viewer. Filter tabs are the status pipeline (ALL,
PENDING, SHORTLISTED, INTERVIEW, SELECTED, REJECTED) plus one tab per
interview group (from `INTERVIEW_GROUPS`), which filter by `interview_group`
rather than status. It loads up to 200 applications for the active filter
and renders `ApplicationsTable`. Selects by `?status=` or `?group=`.

### `/admin/bootstrap` -- Bootstrap

Event-day operations for the "Bootstrap" event. If a `BootstrapSession` is
active it renders `BootstrapAdminDashboard` seeded with that session's stalls
and volunteers; otherwise it renders `BootstrapSessions` to create/select a
session. (Bootstrap has its own extensive subsystem of API routes and public
visitor pages -- QR check-in, feedback, volunteer self-registration -- which
are outside this admin guide's scope.)

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
mode="create"`) and shows all sponsors with `InlineDelete`. The edit page
edits a single sponsor. `is_active` controls whether a sponsor counts toward
the dashboard's "Active Sponsors" stat and appears publicly.

### `/admin/settings` -- Settings

Edits the `site_settings` key/value store via `SettingsForm`. The
`SiteSettings` shape covers `recruitment_open`, `maintenance_mode`,
`maintenance_message`, `contact_email`, `contact_phone`, `contact_address`,
`instagram_url`, `linkedin_url`, and `github_url`. The `maintenance_mode`
toggle here is what the middleware reads to rewrite the public site to
`/maintenance`.

### `/admin/accounts` -- Accounts

Admin account management (covered in detail above). Everyone with `isAdmin`
can view the accounts table. Godfathers additionally see the pending-requests
table, the "Generate invite" button, a per-row "Reset password" button, and
a delete control. Deletion goes through `DELETE /api/admin/accounts?id=...`,
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
