# All Routes

_Current as of Session 82C (2026-10-05)._

Complete inventory of every page and API route in the Team Vegavath
Next.js 16 App Router repo.

**Auth model (from src/middleware.ts).** Middleware runs on every path
except `_next` internals and files with a dot. It (1) rewrites public
pages to `/maintenance` when the settings toggle is on, leaving `/admin`,
`/api`, and `/maintenance` reachable; (2) lets a fixed set of token-gated
paths through with no session -- `/admin/invite/*`, `/api/admin/register`,
`/api/admin/credentials/reset`, and `/admin/<username>/credentials/*`;
(3) gates every other `/admin/*` (except the bare `/admin` login page)
and every `/api/admin/*` behind a NextAuth session, redirecting to
`/admin` when absent. Bootstrap routes (`/bootstrap/*`,
`/api/bootstrap/*`) are never touched by middleware.

A fourth middleware job was added in S52B: `/docs/*` sits behind a
shared-secret cookie gate (`DOCS_PASSWORD`), checked **before** the admin
gate. It **fails OPEN when the env var is unset** -- if `DOCS_PASSWORD` goes
missing in Vercel the docs are public again with no error and no signal, and
the robots disallow is the only remaining layer.

Two extra layers matter:
- **Admin API routes re-check `session.user.isAdmin` in-route** even
  though middleware already guards them -- both layers are kept
  deliberately. Some also require `session.user.isGodfather`.
- **Bootstrap** uses its own `vg_vol_session` httpOnly cookie (set by
  `/api/bootstrap/login`, resolved by `getVolunteerFromCookie` in
  src/app/api/bootstrap/volunteer-auth.ts). It is independent of the
  admin session.

Auth labels used below: **public** (no auth), **admin session**
(middleware + in-route isAdmin), **godfather-only** (in-route
isGodfather), **bootstrap cookie** (vg_vol_session), **token-gated**
(a one-time or per-lead token in the URL is the gate, no session).

---

# Pages

## GET /
Public homepage / landing, including the single announcement slot (first active `announcements` row, S73E) and the projects teaser. File: src/app/(public)/page.tsx. Auth: public.

## GET /about
Public about page (team story, domains). File: src/app/(public)/about/page.tsx. Auth: public.

## GET /events
Public events listing. File: src/app/(public)/events/page.tsx. Auth: public.

## GET /events/[slug]
Public single-event detail page (lightbox + YouTube embeds). File: src/app/(public)/events/[slug]/page.tsx. Auth: public.

## GET /events/[slug]/register
Native event registration form (S47), replacing the old external Google Form link. Only reachable for `hackathons` and `competitions` categories; 404 for other slugs, closed message when the event's `registration_open` flag is off. File: src/app/(public)/events/[slug]/register/page.tsx. Auth: public.

## GET /posts
Public blog listing. Category filter is a `?category=` searchParam, so each category is its own linkable, cacheable URL (which is also why the page reports dynamic). File: src/app/(public)/posts/page.tsx. Auth: public.

## GET /posts/[slug]
Single post. Markdown body rendered through the shared DocsContent map; optional source link for content cross-posted from LinkedIn. File: src/app/(public)/posts/[slug]/page.tsx. Auth: public.

## GET /f1
F1 stats index: next race, driver and constructor standings, last race, calendar. File: src/app/(public)/f1/page.tsx. Auth: public. Gated by the `site_settings.f1_enabled` kill switch; `revalidate = 60` is the kill-switch response time, NOT a freshness setting.

## GET /f1/drivers, /f1/drivers/[driverId], /f1/circuits, /f1/seasons
Remaining F1 pages, all under the same kill switch and the same `revalidate = 60`. `/f1/seasons` is deliberately N+1 (one champion lookup per season) and capped at the most recent 30. Auth: public.

## GET /projects, /projects/kart, /projects/combat-bot, /projects/maze-solver
Project index plus per-project build pages. `/projects/maze-solver` (S78) is an interactive 8x8 BFS maze-solver demo: animated search, shortest path, and the robot command sequence; the solver is pure TypeScript in src/lib/maze/ with Vitest tests. File: src/app/(public)/projects/*. Auth: public.

## GET /gallery
Public photo gallery with lightbox. File: src/app/(public)/gallery/page.tsx. Auth: public.

## GET /crew
Public team / crew page (member cards, GitHub links). File: src/app/(public)/crew/page.tsx. Auth: public.

## GET /sponsors
Public sponsors page with SponsorMarquee. File: src/app/(public)/sponsors/page.tsx. Auth: public.

## GET /join
Public recruitment application form, 4 steps (rebuilt S81, S82B): basic details + course; up to 3 of 5 domains in a fixed order; four general questions; then the selected domains' question sets with an optional link per set. Renders a "recruitment closed" screen unless `site_settings.recruitment_open` is true. Every domain, question and rule comes from src/lib/utils/joinQuestions.ts, shared with the API. File: src/app/(public)/join/page.tsx (JoinClient). Auth: public. Posts to /api/join.

## GET /legal
Public legal / license page. File: src/app/(public)/legal/page.tsx. Auth: public.

## GET /maintenance
Maintenance splash shown via middleware rewrite when the toggle is on. File: src/app/maintenance/page.tsx. Auth: public.

## GET /docs
Docs index. File: src/app/(docs)/docs/page.tsx. Auth: **docs password cookie** (S52B) -- gated in middleware, fails OPEN when `DOCS_PASSWORD` is unset.

## GET /docs/[slug]
Single docs article by slug. Nav order comes from src/lib/docs-config.ts; a file added to docs/wiki/ is not surfaced until it is registered there. File: src/app/(docs)/docs/[slug]/page.tsx. Auth: docs password cookie.

## GET /docs/login
Password entry page for the docs gate. Lives at src/app/docs/login/page.tsx, OUTSIDE the `(docs)` route group on purpose: a nested layout.tsx nests inside DocsLayout rather than replacing it, so a page under `(docs)/docs/` cannot escape the sidebar. Do not move it. Auth: public.

**Admin pages (AdminShell, admin session)**

## GET /admin
Admin login page. File: src/app/(admin)/admin/page.tsx. Auth: public -- middleware explicitly excludes the bare `/admin` path so the login form is reachable unauthenticated.

## GET /admin/dashboard
Admin dashboard landing. File: src/app/(admin)/admin/dashboard/page.tsx. Auth: admin session.

## GET /admin/accounts
Admin account management (approve / reject / invite / delete admins). File: src/app/(admin)/admin/accounts/page.tsx. Auth: admin session (account actions are godfather-only at the API layer).

## GET /admin/announcements
Homepage announcement CMS (S73E): list, create, edit in the slide-in panel, delete. File: src/app/(admin)/admin/announcements/page.tsx. Auth: admin session (viewers read only).

## GET /admin/applications
Recruitment application review: status pipeline, interview groups, an expandable detail row showing course and every answer grouped by domain set and branch, and EXPORT CSV / EXPORT TO GOOGLE SHEETS (the latter hidden for viewers). Old pre-S81 rows render their old fields. File: src/app/(admin)/admin/applications/page.tsx. Auth: admin session.

## GET /admin/events
Admin events list (`EventsTable`). Row actions: EDIT opens the slide-in panel (S82), REGISTRATIONS opens the full edit page, ARCHIVE soft-deletes. ADD EVENT keeps its own page (`?new=true`). File: src/app/(admin)/admin/events/page.tsx. Auth: admin session.

## GET /admin/events/[id]/edit
Full-page event editor plus the event's registrations table and the permanent-delete Danger Zone. Since S82 the list's EDIT opens a slide-in panel instead; this page remains the target of REGISTRATIONS, the panel's "open full page" link, and any bookmark. Viewers see registrations only. File: src/app/(admin)/admin/events/[id]/edit/page.tsx. Auth: admin session.

## GET /admin/gallery
Admin gallery manager (bulk upload). File: src/app/(admin)/admin/gallery/page.tsx. Auth: admin session.

## GET /admin/milestones
Admin milestones manager. File: src/app/(admin)/admin/milestones/page.tsx. Auth: admin session.

## GET /admin/posts, /admin/posts/new, /admin/posts/[id]/edit
Blog post manager (markdown body, draft/publish, thumbnail upload, published-date field). Slug is auto-generated on create only, so published URLs stay stable across edits. Files: src/app/(admin)/admin/posts/*. Auth: admin session.

## GET /admin/profile
Signed-in admin's own profile page (S67). File: src/app/(admin)/admin/profile/page.tsx. Auth: admin session.

## GET /admin/qr
QR-code generator for the site's public route pages (S72C). Dropdown is driven by the shared src/types/routes.ts list -- that file exists precisely so a client component can share the route list without importing a service and dragging the Neon driver into the browser bundle. File: src/app/(admin)/admin/qr/page.tsx. Auth: admin session.

## GET /admin/settings
Admin site settings (maintenance toggle etc.). File: src/app/(admin)/admin/settings/page.tsx. Auth: admin session.

## GET /admin/sponsors
Admin sponsors list (`SponsorsTable`); EDIT opens the slide-in panel. File: src/app/(admin)/admin/sponsors/page.tsx. Auth: admin session.

## GET /admin/sponsors/[id]/edit
Full-page sponsor editor, kept for bookmarks and deep links; the list edits in the slide-in panel. File: src/app/(admin)/admin/sponsors/[id]/edit/page.tsx. Auth: admin session.

## GET /admin/team
Admin team list (`TeamMembersTable`): drag reorder within a tier, active toggle, quick photo upload, EDIT in the slide-in panel (S82), bulk CSV import. File: src/app/(admin)/admin/team/page.tsx. Auth: admin session.

## GET /admin/team/[id]/edit
Full-page team-member editor, kept for bookmarks and deep links; the list edits in the slide-in panel. File: src/app/(admin)/admin/team/[id]/edit/page.tsx. Auth: admin session.

## GET /admin/bootstrap
Bootstrap event-day operations console (sessions, groups, stalls, map, visitors). File: src/app/(admin)/admin/bootstrap/page.tsx. Auth: admin session.

**Token-gated public pages (no AdminShell, no session)**

## GET /admin/invite/[name]/[token]
Invite acceptance / account-setup page. File: src/app/admin/invite/[name]/[token]/page.tsx. Auth: token-gated (middleware lets `/admin/invite/*` bypass session; the one-time token is the gate, S27).

## GET /admin/register
Open viewer-invite registration page (S48). One reusable link, 30-day expiry, always role `viewer`, still approved per person. The open token is deliberately **never consumed**: registering through it inserts a fresh named row rather than updating the token, so the link stays reusable. File: src/app/admin/register/page.tsx. Auth: token-gated.

## GET /admin/[username]/credentials/[token]
Password-reset / credentials page. File: src/app/admin/[username]/credentials/[token]/page.tsx. Auth: token-gated (middleware regex `/admin/<username>/credentials/` bypasses session, S29).

**Bootstrap pages**

## GET /bootstrap
Volunteer login / dashboard entry for the active Bootstrap session. File: src/app/bootstrap/page.tsx. Auth: public page; content unlocks with the bootstrap cookie after login.

## GET /bootstrap/feedback
Public post-event feedback form for the active session. File: src/app/bootstrap/feedback/page.tsx. Auth: public.

## GET /bootstrap/checkin/[token]
Visitor self check-in via a group lead's per-lead QR link. File: src/app/bootstrap/checkin/[token]/page.tsx. Auth: token-gated public (S33).

## GET /bootstrap/checklist/[id]
A student's stall checklist (S73D): which stalls their group has visited, from `bootstrap_stall_visits`. The id is the visitor's own row id, handed to them in their check-in response; an unknown or malformed id renders the same dead end as a bad check-in token. Force-dynamic, no polling -- a reload is the refresh. File: src/app/bootstrap/checklist/[id]/page.tsx. Auth: public (the visitor id is the key; read-only).

## GET /bootstrap/register/pool
Always-open pre-registration with a role choice (stall volunteer or group lead), S74B. Registers into the pool (`session_id` NULL) for an admin to assign later. File: src/app/bootstrap/register/pool/page.tsx. Auth: public.

## GET /bootstrap/register/stall
Stall-volunteer registration INTO the active session (S35). Since S74B it requires an active session, like the group link; before an event, use /bootstrap/register/pool. File: src/app/bootstrap/register/stall/page.tsx. Auth: public.

## GET /bootstrap/register/group
Group-lead registration into the active session (S35). File: src/app/bootstrap/register/group/page.tsx. Auth: public.

---

# API -- Public

The old read-only `GET /api/events`, `/api/gallery`, `/api/sponsors` and
`/api/team` were deleted in S52B as caller-less; public pages read through the
service layer.

## POST /api/join
Submits a recruitment application. 403 while `recruitment_open` is not "true"; a filled honeypot field returns a silent success. Validates name and email (required); mobile (10 digits), SRN or PRN, and semester when given -- the form requires them; course (one of five; "Other" needs its own text); 1-3 of the five current domain keys; and the answers via `parseJoinAnswers` -- only the general questions and the SELECTED domains' visible questions are read, everything else is dropped, and an empty link is always accepted. Writes `course` + `answers` (migration 030); the pre-S81 question columns stay NULL. File: src/app/api/join/route.ts. Auth: public.

## POST /api/events/[slug]/register
Native event registration (S47). Phone checked with `normalisePhone`, SRN/PRN with `normaliseSrnPrn` (S73F). Validates against real state: unknown event 404s, closed registration 409s, and a duplicate email 409s matched case-insensitively so `A@x.com` cannot re-register as `a@x.com`. File: src/app/api/events/[slug]/register/route.ts. Auth: public.

## POST /api/docs/auth
Exchanges the shared `DOCS_PASSWORD` secret for the docs cookie (S52B). Never log or hardcode the value. File: src/app/api/docs/auth/route.ts. Auth: public.

---

# API -- Admin accounts

## GET /api/admin/accounts
Lists admin accounts plus pending requests (never returns password hashes). File: src/app/api/admin/accounts/route.ts. Auth: admin session.

## PATCH /api/admin/accounts/me
Self-service profile update backing /admin/profile (S67): display name, mobile number, password. PATCH only -- the page reads the account server-side. Deliberately NO viewer guard: it can only write the caller's own row (scoped by session id, never the body). File: src/app/api/admin/accounts/me/route.ts. Auth: admin session.

## DELETE /api/admin/accounts
Deletes an admin account by `?id=` (refuses the last remaining admin). File: src/app/api/admin/accounts/route.ts. Auth: godfather-only.

## POST /api/admin/accounts/invite
Creates an invite: a named one-time admin or viewer invite, or (`type: "open"`) a reusable open viewer link (S48). File: src/app/api/admin/accounts/invite/route.ts. Auth: godfather-only.

## GET, DELETE /api/admin/accounts/invite
GET `?type=open` lists the active open viewer links; DELETE `?tokenId=` revokes one. Failures return the underlying reason (S76C). File: src/app/api/admin/accounts/invite/route.ts. Auth: godfather-only (DELETE also viewer-guarded).

## POST /api/admin/accounts/[id]/approve
Approves a pending admin access request. File: src/app/api/admin/accounts/[id]/approve/route.ts. Auth: godfather-only.

## POST /api/admin/accounts/[id]/reject
Rejects a pending admin access request. File: src/app/api/admin/accounts/[id]/reject/route.ts. Auth: godfather-only.

## POST /api/admin/accounts/[id]/reset-token
Generates a credentials-reset link/token for an account. File: src/app/api/admin/accounts/[id]/reset-token/route.ts. Auth: godfather-only.

---

# API -- Admin applications

## GET /api/admin/applications
Lists recruitment applications (filterable). File: src/app/api/admin/applications/route.ts. Auth: admin session.

## DELETE /api/admin/applications
Deletes an application. File: src/app/api/admin/applications/route.ts. Auth: admin session.

## PATCH /api/admin/applications/[id]/status
Updates a single application's status. File: src/app/api/admin/applications/[id]/status/route.ts. Auth: admin session.

## PATCH /api/admin/applications/[id]/group
Assigns a single application to a group. File: src/app/api/admin/applications/[id]/group/route.ts. Auth: admin session.

## POST /api/admin/applications/auto-assign-groups
Auto-assigns applicants into groups. File: src/app/api/admin/applications/auto-assign-groups/route.ts. Auth: admin session.

## POST /api/admin/applications/bulk-status
Bulk status update across multiple applications. File: src/app/api/admin/applications/bulk-status/route.ts. Auth: admin session.

## GET /api/admin/applications/export
CSV download of applications (optional `?status=`). Every table column (id, the FY25 `portfolio_url`, the full UTC timestamp), course, Domain 1-3 as display labels in the fixed /join order, and one column per question. Columns are defined once in src/lib/utils/exportTables.ts. File: src/app/api/admin/applications/export/route.ts. Auth: admin session (viewers allowed -- it only reads).

## POST /api/admin/applications/export/google
Same dataset written into the "Applications" tab of the shared Google Sheet (S73K, S74A); returns `{ ok, url, name }`, or 502 with Google's own error code and message. File: src/app/api/admin/applications/export/google/route.ts. Auth: admin session + viewer guard (it writes to a shared file).

---

# API -- Admin auth (token-gated)

## POST /api/admin/register
Completes new-admin registration from an invite token. File: src/app/api/admin/register/route.ts. Auth: token-gated (middleware bypasses session; the invite token is the gate).

## POST /api/admin/credentials/reset
Sets a new password from a reset token. File: src/app/api/admin/credentials/reset/route.ts. Auth: token-gated (middleware bypasses session; the reset token is the gate).

---

# API -- Admin content

## GET /api/admin/events
Lists events for the admin manager. File: src/app/api/admin/events/route.ts. Auth: admin session.

## POST /api/admin/events
Creates an event. File: src/app/api/admin/events/route.ts. Auth: admin session.

## PATCH /api/admin/events
Updates an event. File: src/app/api/admin/events/route.ts. Auth: admin session.

## DELETE /api/admin/events
Deletes an event. File: src/app/api/admin/events/route.ts. Auth: admin session.

## GET /api/admin/gallery
Lists gallery items for the admin manager. File: src/app/api/admin/gallery/route.ts. Auth: admin session.

## POST /api/admin/gallery
Adds gallery item(s) (bulk). File: src/app/api/admin/gallery/route.ts. Auth: admin session.

## DELETE /api/admin/gallery
Deletes a gallery item. File: src/app/api/admin/gallery/route.ts. Auth: admin session.

## GET /api/admin/sponsors
Lists sponsors for the admin manager. File: src/app/api/admin/sponsors/route.ts. Auth: admin session.

## POST /api/admin/sponsors
Creates a sponsor. File: src/app/api/admin/sponsors/route.ts. Auth: admin session.

## PATCH /api/admin/sponsors
Updates a sponsor. File: src/app/api/admin/sponsors/route.ts. Auth: admin session.

## DELETE /api/admin/sponsors
Deletes a sponsor. File: src/app/api/admin/sponsors/route.ts. Auth: admin session.

## GET /api/admin/team
Lists team members for the admin manager. File: src/app/api/admin/team/route.ts. Auth: admin session.

## POST /api/admin/team
Creates a team member. File: src/app/api/admin/team/route.ts. Auth: admin session.

## PATCH /api/admin/team
Updates a team member. File: src/app/api/admin/team/route.ts. Auth: admin session.

## DELETE /api/admin/team
Deletes a team member. File: src/app/api/admin/team/route.ts. Auth: admin session.

## POST /api/admin/import/team
Bulk-imports team members. File: src/app/api/admin/import/team/route.ts. Auth: admin session.

## PATCH /api/admin/team/reorder
Persists drag-to-reorder ordering within a tier. File: src/app/api/admin/team/reorder/route.ts. Auth: admin session.

## GET, POST /api/admin/posts
Lists and creates blog posts. Slug is generated on create only, so published URLs stay stable. File: src/app/api/admin/posts/route.ts. Auth: admin session.

## PATCH, DELETE /api/admin/posts/[id]
Updates or deletes a post. Uses the read-then-write shape rather than `COALESCE(${value ?? null}, column)`, because a post has columns the admin must be able to CLEAR and COALESCE can never write a NULL back. File: src/app/api/admin/posts/[id]/route.ts. Auth: admin session.

## PATCH /api/admin/events/[id]/registrations/[regId]
Updates the status of one event registration (there is no DELETE handler). File: src/app/api/admin/events/[id]/registrations/[regId]/route.ts. Auth: admin session.

## GET /api/admin/milestones
Lists milestones. File: src/app/api/admin/milestones/route.ts. Auth: admin session.

## POST /api/admin/milestones
Creates a milestone. File: src/app/api/admin/milestones/route.ts. Auth: admin session.

## DELETE /api/admin/milestones
Deletes a milestone. File: src/app/api/admin/milestones/route.ts. Auth: admin session.

## PATCH /api/admin/milestones/[id]
Updates a single milestone. File: src/app/api/admin/milestones/[id]/route.ts. Auth: admin session.

## GET /api/admin/settings
Reads site settings. File: src/app/api/admin/settings/route.ts. Auth: admin session.

## PATCH /api/admin/settings
Updates site settings (e.g. maintenance toggle). File: src/app/api/admin/settings/route.ts. Auth: admin session.

## POST /api/admin/upload
Uploads an asset to R2 (timestamped keys, never overwrites). File: src/app/api/admin/upload/route.ts. Auth: admin session.

---

## GET, POST, PATCH, DELETE /api/admin/announcements
Homepage announcement CRUD (S73E): list, create, update, delete (`?id=`). Mirrors /api/admin/sponsors. File: src/app/api/admin/announcements/route.ts. Auth: admin session; viewer guard on POST / PATCH / DELETE.

---

# API -- Admin bootstrap ops

All under `/api/admin/bootstrap/*`: admin session (middleware + in-route
isAdmin), even though they drive the Bootstrap event. Every mutating route also
carries the viewer guard (S47); the read-only routes do not.

## POST /api/admin/bootstrap/sessions
Creates a new Bootstrap session with its stalls. Per stall: volunteer capacity `max_occupancy` (1-4), group capacity `max_groups`, and an optional `time_limit_minutes` (S77; null = no timer, otherwise an integer >= 1). File: src/app/api/admin/bootstrap/sessions/route.ts. Auth: admin session.

## GET /api/admin/bootstrap/sessions/[id]
Reads a single Bootstrap session with its details. File: src/app/api/admin/bootstrap/sessions/[id]/route.ts. Auth: admin session.

## PATCH /api/admin/bootstrap/sessions/[id]
Renames a session or changes its visitor cap after creation (S49); an empty body is refused. File: src/app/api/admin/bootstrap/sessions/[id]/route.ts. Auth: admin session + viewer guard.

## DELETE /api/admin/bootstrap/sessions/[id]
Deletes a Bootstrap session. File: src/app/api/admin/bootstrap/sessions/[id]/route.ts. Auth: admin session.

## PATCH /api/admin/bootstrap/sessions/[id]/active
Sets a session active/inactive (only one active at a time). File: src/app/api/admin/bootstrap/sessions/[id]/active/route.ts. Auth: admin session.

## GET /api/admin/bootstrap/sessions/[id]/feedback
Reads collected feedback for a session. File: src/app/api/admin/bootstrap/sessions/[id]/feedback/route.ts. Auth: admin session.

## POST /api/admin/bootstrap/sessions/[id]/groups
Creates / manages groups for a session. File: src/app/api/admin/bootstrap/sessions/[id]/groups/route.ts. Auth: admin session.

## PATCH /api/admin/bootstrap/sessions/[id]/map
Updates the session campus-map layout. File: src/app/api/admin/bootstrap/sessions/[id]/map/route.ts. Auth: admin session.

## POST /api/admin/bootstrap/sessions/[id]/summarize
Generates a summary for the session (feedback/visitors). File: src/app/api/admin/bootstrap/sessions/[id]/summarize/route.ts. Auth: admin session.

## GET /api/admin/bootstrap/sessions/[id]/visitors
Reads the checked-in visitor list for a session. File: src/app/api/admin/bootstrap/sessions/[id]/visitors/route.ts. Auth: admin session.

## PATCH /api/admin/bootstrap/stalls/[id]
Updates a stall record. File: src/app/api/admin/bootstrap/stalls/[id]/route.ts. Auth: admin session.

## PATCH /api/admin/bootstrap/stalls/[id]/max-groups
Live per-stall group capacity (S73B), `{ max_groups }`. A bare single-column write that stays out of the stall status logic, like ./position. File: src/app/api/admin/bootstrap/stalls/[id]/max-groups/route.ts. Auth: admin session + viewer guard.

## PATCH /api/admin/bootstrap/stalls/[id]/position
Updates a stall's map position. File: src/app/api/admin/bootstrap/stalls/[id]/position/route.ts. Auth: admin session.

## PATCH /api/admin/bootstrap/groups/[id]/lead
Assigns / changes a group's lead. File: src/app/api/admin/bootstrap/groups/[id]/lead/route.ts. Auth: admin session.

## PATCH /api/admin/bootstrap/volunteers/[id]/role
Changes a volunteer's role. File: src/app/api/admin/bootstrap/volunteers/[id]/role/route.ts. Auth: admin session.

## PATCH /api/admin/bootstrap/volunteers/[id]/suggest
Sets / clears an admin suggestion for a volunteer. File: src/app/api/admin/bootstrap/volunteers/[id]/suggest/route.ts. Auth: admin session.

## PATCH, DELETE /api/admin/bootstrap/volunteers/[id]
PATCH corrects a volunteer's name / phone / SRN (S55, validated per S73F); DELETE removes a pre-registration pool entry -- pool rows only, via the service's `session_id IS NULL` guard (S55B). File: src/app/api/admin/bootstrap/volunteers/[id]/route.ts. Auth: admin session + viewer guard.

## PATCH /api/admin/bootstrap/volunteers/[id]/unlock
Unlocks a volunteer's session (releases a claimed login). File: src/app/api/admin/bootstrap/volunteers/[id]/unlock/route.ts. Auth: admin session.

## PATCH /api/admin/bootstrap/volunteers/[id]/assign
Assigns a pre-registration pool member (NULL `session_id`) to a session. One-way door: the service guards on `WHERE ... AND session_id IS NULL`, so a double-assign is a 409 rather than a silent move. File: src/app/api/admin/bootstrap/volunteers/[id]/assign/route.ts. Auth: admin session.

## POST /api/admin/bootstrap/volunteers/[id]/reset-code
Regenerates a volunteer's plaintext login code (S55C). POST, not PATCH: it generates a value rather than writing one supplied. File: src/app/api/admin/bootstrap/volunteers/[id]/reset-code/route.ts. Auth: admin session.

## PATCH /api/admin/bootstrap/volunteers/[id]/switch-request
Approves or denies a stall volunteer's switch request, `{action: "approve"|"deny"}` (S72C). File: src/app/api/admin/bootstrap/volunteers/[id]/switch-request/route.ts. Auth: admin session.

## POST, DELETE /api/admin/bootstrap/sessions/[id]/stalls
Adds or removes stalls on a live session. File: src/app/api/admin/bootstrap/sessions/[id]/stalls/route.ts. Auth: admin session + viewer guard.

## POST /api/admin/bootstrap/sessions/[id]/distribute
Advisory auto-distribution (S73D): spreads groups that have no queue row anywhere across stalls, as suggestions (`bootstrap_stall_queue` rows with `accepted_at` NULL) that each lead accepts or declines. Re-runnable and idempotent -- a second press only fills gaps, never reshuffles. File: src/app/api/admin/bootstrap/sessions/[id]/distribute/route.ts. Auth: admin session + viewer guard.

## POST /api/admin/bootstrap/sessions/[id]/sweep-visits
End-of-event sweep (S73C): closes every still-open visit in the session. Visits otherwise only close when a volunteer taps RELEASE, and at the end of a real event people walk away. File: src/app/api/admin/bootstrap/sessions/[id]/sweep-visits/route.ts. Auth: admin session + viewer guard.

## GET, PATCH /api/admin/bootstrap/sessions/[id]/groups/[groupId]/checklist
The admin half of the manual checklist backup (S73G): read a group's checklist, or tick / clear a stall for it. A tick writes an already-closed visit row. File: src/app/api/admin/bootstrap/sessions/[id]/groups/[groupId]/checklist/route.ts. Auth: admin session; viewer guard on PATCH.

## GET /api/admin/bootstrap/volunteers/pool/export
CSV of the whole pre-registration pool (S73K), including login codes (they already show in the pool table). The "export first" escape hatch beside the bulk delete. File: src/app/api/admin/bootstrap/volunteers/pool/export/route.ts. Auth: admin session (viewers allowed).

## POST /api/admin/bootstrap/volunteers/pool/export/google
The same pool written into the "Pool Volunteers" tab of the shared Google Sheet. File: src/app/api/admin/bootstrap/volunteers/pool/export/google/route.ts. Auth: admin session + viewer guard.

## POST /api/admin/bootstrap/volunteers/pool/delete-all
Wipes the pre-registration pool between events (S73K). Irreversible. The service's `WHERE session_id IS NULL` is what stops it ever reaching a volunteer assigned to a session. POST rather than DELETE so no prefetch or link scanner can trip it. File: src/app/api/admin/bootstrap/volunteers/pool/delete-all/route.ts. Auth: admin session + viewer guard.

---

# API -- Bootstrap public

## POST /api/bootstrap/login
Volunteer login against the active session; claims the login and sets the `vg_vol_session` cookie (24h). File: src/app/api/bootstrap/login/route.ts. Auth: public (issues the bootstrap cookie).

## POST /api/bootstrap/logout
Clears the volunteer's claimed session and deletes the cookie. File: src/app/api/bootstrap/logout/route.ts. Auth: bootstrap cookie.

## POST /api/bootstrap/register/pool
Pre-registration into the pool (S74B): always open, with a role choice (stall volunteer or group lead), `session_id` NULL until an admin assigns them. This branch used to live inside the stall route. File: src/app/api/bootstrap/register/pool/route.ts. Auth: public.

## POST /api/bootstrap/register/stall
Stall-volunteer registration into the ACTIVE session (S35); since S74B it refuses when no session is active (pre-registration has its own route). The stall id must belong to the active session. File: src/app/api/bootstrap/register/stall/route.ts. Auth: public.

## POST /api/bootstrap/register/group
Group-lead registration into the active session (S35). File: src/app/api/bootstrap/register/group/route.ts. Auth: public.

## GET /api/bootstrap/stalls
Returns stalls for the logged-in volunteer's active session, with derived status, occupants, queue and time limit. File: src/app/api/bootstrap/stalls/route.ts. Auth: bootstrap cookie.

## PATCH /api/bootstrap/stalls/[id]
Volunteer stall actions, `{ action, group_id? }`. `claim` / `release`: stall volunteers only, on their OWN stall (S72B). Since S73C they also move a group through `bootstrap_stall_visits`: claiming with a group logs its arrival (naming the group is mandatory unless every group has already visited); release closes that group's visit, and the volunteer steps off only when the last group leaves. `mark_queued` / `unqueue` / `accept_queued`: group leads only (S73B), for their own group, resolved server-side from the cookie. `accept_queued` confirms an admin auto-placement (S73D); declining is plain `unqueue`. File: src/app/api/bootstrap/stalls/[id]/route.ts. Auth: bootstrap cookie.

## GET /api/bootstrap/stalls/[id]/groups
The groups this stall may still receive -- every group in the session that has not visited it yet (S73C); feeds the "which group just arrived?" picker. Same role and ownership gates as the claim it feeds. File: src/app/api/bootstrap/stalls/[id]/groups/route.ts. Auth: bootstrap cookie.

## GET /api/bootstrap/roster
The logged-in lead's own group roster (S73D). Takes no parameters: the group comes from the cookie volunteer, so there is no group id to tamper with. File: src/app/api/bootstrap/roster/route.ts. Auth: bootstrap cookie, leads only.

## GET, PATCH /api/bootstrap/checklist/manual
The lead half of the manual checklist backup (S73G): read, or tick / clear stalls on, the lead's own group's checklist, resolved from the cookie. File: src/app/api/bootstrap/checklist/manual/route.ts. Auth: bootstrap cookie, leads only.

## POST /api/bootstrap/checkin/[token]
Checks a visitor into a group via the lead's per-lead QR token (enforces group capacity; phone and SRN/PRN validated, S73F). The response carries the visitor's id for their /bootstrap/checklist/[id] page. File: src/app/api/bootstrap/checkin/[token]/route.ts. Auth: token-gated public (S33).

## POST /api/bootstrap/switch-request
A stall volunteer raises a request to move to a different stall (S72C, migration 025). Stall volunteers are locked to their assigned stall, so this plus the admin approve/deny route is the only way they move. File: src/app/api/bootstrap/switch-request/route.ts. Auth: bootstrap cookie.

## PATCH /api/bootstrap/classroom
Updates the logged-in volunteer's classroom assignment. File: src/app/api/bootstrap/classroom/route.ts. Auth: bootstrap cookie.

## POST /api/bootstrap/feedback
Submits public feedback against the active session. File: src/app/api/bootstrap/feedback/route.ts. Auth: public (resolves the active session server-side).

## POST /api/bootstrap/suggestion/dismiss
Dismisses the admin suggestion shown to the logged-in volunteer. File: src/app/api/bootstrap/suggestion/dismiss/route.ts. Auth: bootstrap cookie.
