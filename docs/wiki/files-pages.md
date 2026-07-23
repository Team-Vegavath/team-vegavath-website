# Pages

Per-file reference for every Next.js App Router page, layout, and
special file in the Team Vegavath repo. Documents route, rendering
mode, data fetching, auth, child components, and any non-delegated
logic. Confirmed against source, not inferred. For the flat
route/auth inventory see routes.md; this file is the file-level
companion.

**Reading the rendering-mode field.** "static" = prerendered at build
with no revalidation. "ISR (Ns)" = `export const revalidate = N`.
"dynamic" = `export const dynamic = "force-dynamic"` or a runtime API
(`auth()`, `cookies()`, `headers()`, `searchParams`) that forces
per-request rendering. Every `(admin)` page calls `auth()` and so is
dynamic regardless of any other signal, and all also carry an explicit
`force-dynamic`.

---

## Contents

- [Root and special files](#root-and-special-files)
- [Public route group](#public-route-group)
- [Admin route group](#admin-route-group)
- [Docs route group](#docs-route-group)
- [Standalone admin token pages](#standalone-admin-token-pages)
- [Bootstrap pages](#bootstrap-pages)

---

# Root and special files

## Root layout
File: src/app/layout.tsx

- **Purpose.** The single `<html>`/`<body>` shell wrapping every route
  group (public, admin, docs, bootstrap all nest under it).
- **Fonts.** Loads four `next/font/google` families -- Orbitron (900),
  Chakra Petch (400/600/700), Space Grotesk (400/500/600), Space Mono
  (400/700) -- and binds them to CSS variables (`--font-orbitron`,
  `--font-chakra`, `--font-space`, `--font-mono`) on the `<html>`
  className.
- **Metadata.** Exports a `metadata` object: title template
  `%s | Team Vegavath`, `metadataBase` of `https://vegavath.live`,
  description, keywords, canonical `/`, `icon: "/icon"` (the dynamic
  icon route below), and OpenGraph + Twitter cards whose images point
  at `${R2}/icons/logo.png`. `R2` is read from
  `NEXT_PUBLIC_R2_PUBLIC_URL` with a hardcoded `pub-...r2.dev`
  fallback. Also exports `viewport` (device-width, initialScale 1).
- **Renders.** `<CursorControls />` then `<PageTransition>` wrapping
  `children`. No data fetching.

## Dynamic favicon
File: src/app/icon.tsx

- **Purpose.** Generates the 32x32 PNG favicon at `/icon` via
  `next/og` `ImageResponse` (referenced by the root layout's
  `icons.icon`).
- **Exports.** `size` (32x32), `contentType` `image/png`, and a default
  component drawing an inline SVG shield ("V" mark) in accent
  `#EF5D08` on a `#0a0a0a` background. No data, no auth.

## Not found (404)
File: src/app/not-found.tsx

- **Route.** Rendered for any unmatched path (Next.js convention).
- **Rendering mode.** Static.
- **Metadata.** `title: "404 | Team Vegavath"`.
- **Renders.** A full-bleed 404 layout (Orbitron watermark, "Page Not
  Found" copy, links to `/` and `/events`) plus `KartGameWrapper` -- a
  playable kart mini-game shown under a "While you're here" label. The
  watermark `h1` is deliberately pinned to `100svh` (not `inset: 0`)
  because the page grows past one viewport for the game.

## robots
File: src/app/robots.ts

- **Purpose.** Emits `/robots.txt` via `MetadataRoute.Robots`.
- **Behavior.** One rule: `userAgent: "*"`, `allow: "/"`,
  `disallow: ["/admin", "/api/admin"]`. Declares
  `sitemap: https://vegavath.live/sitemap.xml` and `host`.

## sitemap
File: src/app/sitemap.ts

- **Purpose.** Emits `/sitemap.xml` via `MetadataRoute.Sitemap`.
- **Behavior.** Maps a hardcoded list of eight public routes (`/`,
  `/about`, `/events`, `/gallery`, `/crew`, `/sponsors`, `/join`,
  `/legal`) to entries, each with `lastModified` set to build time. No
  dynamic event/gallery URLs are included.

## /maintenance
File: src/app/maintenance/page.tsx

- **Route.** `/maintenance`. Shown when middleware rewrites public
  paths here while the maintenance toggle is on.
- **Rendering mode.** Static.
- **Auth.** Public.
- **Metadata.** `title: "Back Soon | Team Vegavath"`,
  `robots: { index: false, follow: false }`.
- **Notable.** Pure presentational splash ("BACK SOON"), no data
  fetching. Note this is a *second*, separate maintenance UI -- the
  `(public)` layout renders its own inline maintenance block too (see
  below); this standalone page is the middleware-rewrite target.

---

# Public route group

The `(public)` group is a route group (parentheses = no URL segment),
so its children render at bare paths (`/about`, `/events`, ...).

## (public) layout
File: src/app/(public)/layout.tsx

- **Purpose.** Chrome for all public pages.
- **Rendering mode.** Async server layout; calls `getAllSettings()` so
  it renders per-request against settings.
- **Data.** `getAllSettings()` from `@/lib/services/settings` (errors
  swallowed to `null`).
- **Notable.** If `settings.maintenance_mode` is true it short-circuits
  and returns an inline "We'll be right back" maintenance block
  (using `maintenance_message` if set) instead of the page. Otherwise
  renders `<Navbar />`, `<main>{children}</main>`, and `<Footer>` with
  `settings` passed down.

## /
File: src/app/(public)/page.tsx

- **Route.** `/` (home).
- **Rendering mode.** ISR (60s) -- `export const revalidate = 60`.
- **Data.** `Promise.all` of `getUpcomingEvents(3)`,
  `getPastEvents(3)` (both `@/lib/services/events`), and
  `getActiveSponsors()` (`@/lib/services/sponsors`); each `.catch`es to
  `[]`.
- **Auth.** Public.
- **Metadata.** `title: "Team Vegavath | Karts, Code & Innovation at
  PESU ECC"`.
- **Renders.** Hero (JOIN / VIEW EVENTS CTAs), `StatsTicker`,
  `KartModelWrapper` (3D kart), `DomainGrid`, `EventsPreview` (fed
  slimmed upcoming/past event objects), `SponsorMarquee` (only when
  sponsors exist), and a Join CTA section.
- **Notable.** Event objects are projected down to just
  `{slug, title, category, event_date, cover_image_url}` before being
  handed to `EventsPreview`.

## /about
File: src/app/(public)/about/page.tsx

- **Route.** `/about`.
- **Rendering mode.** ISR (120s).
- **Data.** `getActiveSponsors()` and `getMilestones()`
  (`@/lib/services/about`).
- **Auth.** Public.
- **Renders.** `AboutHeroImage`, mission pull-quote, `DomainGrid`,
  a stats grid, a milestones timeline, a values grid (inline
  `ValueShape` SVGs), and `SponsorMarquee` when sponsors exist.
- **Notable.** Ships a `TIMELINE_FALLBACK` constant (three hardcoded
  milestones) used when `getMilestones()` throws or returns empty, so
  the timeline never renders blank pre-migration-010. `STATS` and
  `VALUES` are hardcoded in-file.

## /crew
File: src/app/(public)/crew/page.tsx

- **Route.** `/crew`.
- **Rendering mode.** ISR (120s).
- **Data.** `getMembers()` (`@/lib/services/team`); on throw falls back
  to `[]`.
- **Auth.** Public.
- **Metadata.** `title: "The Crew | Team Vegavath"`.
- **Renders.** In-file components `PhotoOrInitial`, `LinkedInLink`,
  `GitHubLink`, `MemberInfo`, `SectionHeading`. Members are filtered to
  `is_active !== false` then split into three tiers -- `core`, `crew`,
  `legacy` -- each rendered as its own section (core uses a distinct
  larger card grid).
- **Notable.** Each card's LinkedIn link falls back to a hardcoded club
  URL (`CLUB_LINKEDIN_URL`) when the member has no `linkedin_url`.
  Photos use `next/image` with `unoptimized` (R2 already CDN-delivers,
  saves Vercel transform credits).

## /events
File: src/app/(public)/events/page.tsx

- **Route.** `/events`.
- **Rendering mode.** ISR (60s).
- **Data.** `getEvents({ limit: 50 })`; on throw falls back to `[]`.
- **Auth.** Public.
- **Renders.** `Container` wrapping a header and `EventsClient`
  (client component that does the filtering/list UI).

## /events/[slug]
File: src/app/(public)/events/[slug]/page.tsx

- **Route.** `/events/<slug>`.
- **Rendering mode.** dynamic -- `export const dynamic =
  "force-dynamic"`. See note below re: `generateStaticParams`.
- **Data.** `getEventBySlug(slug)`; if null -> `notFound()`. Then
  `getGalleryByEvent(event.id)` (`@/lib/services/gallery`).
- **Auth.** Public.
- **Metadata.** `generateMetadata` sets the title from the event
  title (falls back to "Event | Team Vegavath").
- **Renders.** Back-link, event header (logo via `next/image` when
  present), markdown description via `ReactMarkdown`, a
  registration block, a cover image / initials aside, and
  `EventMediaClient` (lightbox + YouTube embeds) when gallery items
  exist.
- **Notable.** Also exports `generateStaticParams` (mapping
  `getEvents({ limit: 50 })` to slugs) -- but `force-dynamic` overrides
  it, so params are resolved per-request and the static-params export
  is effectively inert. The registration block deliberately renders
  nothing when there is neither an open registration nor a form URL
  ("the absence IS the signal"); it shows a "closed" message only when
  a form URL exists but registration is off.

## /gallery
File: src/app/(public)/gallery/page.tsx

- **Route.** `/gallery`.
- **Rendering mode.** ISR (120s).
- **Data.** `Promise.all` of `getGalleryItems()`, `getGalleryEvents()`
  (both `@/lib/services/gallery`), and `getEvents({ limit: 100 })`; the
  whole block `.catch`es to empty arrays.
- **Auth.** Public.
- **Renders.** `Container` + header + `GalleryClient` (lightbox UI).
- **Notable.** Builds the filter list server-side: intersects events
  against the set of `event_id`s that actually have gallery rows, sorts
  by title, and prepends an "All" option -- so only events with media
  become filter tabs.

## /join
File: src/app/(public)/join/page.tsx

- **Route.** `/join`.
- **Rendering mode.** dynamic -- `export const dynamic =
  "force-dynamic"`.
- **Data.** `getAllSettings()`; reads `recruitment_open` (defaults
  false on throw).
- **Auth.** Public. The form posts to `/api/join`.
- **Renders.** `JoinClient` with the `recruitmentOpen` flag; the client
  component gates the form vs a "recruitment closed" state.

## /legal
File: src/app/(public)/legal/page.tsx

- **Route.** `/legal`.
- **Rendering mode.** ISR (120s), but the component is synchronous with
  no data fetching -- content is fully static hardcoded copy.
- **Auth.** Public.
- **Renders.** Privacy Policy and Terms of Service sections plus a
  license summary, all inline. Links to the repo `LICENSE` and GitHub.
- **Notable.** Copy describes the "Team Vegavath Custom Educational
  License (derived from MIT)". (CLAUDE.md flags a known open item that
  legal copy elsewhere still says MIT -- this page already presents the
  custom license.)

## /sponsors
File: src/app/(public)/sponsors/page.tsx

- **Route.** `/sponsors`.
- **Rendering mode.** ISR (120s).
- **Data.** `getActiveSponsors()`; on throw falls back to `[]`.
- **Auth.** Public.
- **Renders.** Splits sponsors into `premium` and `community` tiers,
  each its own grid of cards (logos via `next/image` `unoptimized`),
  plus a "Sponsor Vegavath" CTA linking to
  `mailto:teamvegavathracing@pes.edu`.

---

# Admin route group

The `(admin)` group renders under `/admin/*`. The shared layout wraps
everything in `AdminShell`. Every page below independently calls
`auth()` and `redirect("/admin")` when `session.user.isAdmin` is
falsy -- an in-page third layer on top of middleware and the layout.
All carry `export const dynamic = "force-dynamic"`.

## (admin) layout
File: src/app/(admin)/layout.tsx

- **Purpose.** Admin chrome for all `/admin/*` pages.
- **Rendering mode.** Async server layout.
- **Data.** `getPendingRequests()` (`@/lib/services/admin`), reduced to
  a `hasPendingAccounts` boolean (errors swallowed to false so a
  missing pre-migration-010 table cannot break the panel).
- **Renders.** `AdminShell` (client sidebar chrome; hides itself on the
  `/admin` login route) with a `SignOutButton` server component passed
  as `signOutSlot`, plus the `hasPendingAccounts` flag driving the
  Accounts nav badge.

## /admin
File: src/app/(admin)/admin/page.tsx

- **Route.** `/admin` (login).
- **Rendering mode.** dynamic -- uses `auth()`, `headers()`, and
  `searchParams`.
- **Auth.** Public by design -- middleware explicitly exempts the bare
  `/admin` path so the login form is reachable. If an admin session
  already exists it redirects to `/admin/dashboard`.
- **Data / logic.** Reads `?error=` for the flash message. Defines a
  `handleLogin` server action that: derives IP/user-agent from
  `headers()`; enforces a DB-backed rate limit (5 failed attempts per
  IP per 15 min via a direct `admin_login_log` query -- the one place
  a page runs inline SQL); redirects to `?error=locked` when tripped;
  calls `signIn("credentials", ...)`; and logs the attempt via
  `logAdminLogin`.
- **Notable.** The auth flow leans on a subtlety: `signIn` succeeds by
  throwing Next's internal redirect error, so the `catch` block treats
  an `AuthError` as failure (`?error=invalid`) and any *other* thrown
  error as the success path before re-throwing it. `instanceof
  AuthError` is used deliberately because constructor-name checks break
  under production minification.

## /admin/dashboard
File: src/app/(admin)/admin/dashboard/page.tsx

- **Route.** `/admin/dashboard`.
- **Rendering mode.** dynamic.
- **Auth.** Admin session (`auth()` + redirect).
- **Data.** `Promise.all` of `getAllSettings`, `getApplications({
  limit: 10 })`, `getEvents({ limit: 100 })`, `getMembers`,
  `getGalleryItemsLimited(200)`, `getSponsors`, `getRecentLogins(10)` --
  each `.catch`ing to a default/empty value; a `DEFAULT_SETTINGS`
  constant backstops settings.
- **Renders.** Recruitment open/closed badge, four stat cards (events /
  members / gallery / active sponsors), a recent-logins table, and a
  latest-10-applications table. All inline markup, no dedicated child
  components.

## /admin/accounts
File: src/app/(admin)/admin/accounts/page.tsx

- **Route.** `/admin/accounts`.
- **Rendering mode.** dynamic.
- **Auth.** Admin session to view. Godfather-gated features: pending
  requests, invite generation, password reset, and delete are only
  rendered when `session.user.isGodfather === true` (and enforced
  again at the API layer).
- **Data.** `getAdminAccounts()`; `getPendingRequests()` only when
  godfather.
- **Renders.** A pending-requests table with `PendingRequestActions`,
  a `GenerateInviteButton`, and an accounts table with
  `ResetPasswordButton` and `InlineDelete` per row.
- **Notable.** The last remaining admin cannot be deleted -- when
  `accounts.length <= 1` a disabled "DELETE" label is shown instead of
  the delete control.

## /admin/applications
File: src/app/(admin)/admin/applications/page.tsx

- **Route.** `/admin/applications`.
- **Rendering mode.** dynamic (also reads `searchParams`).
- **Auth.** Admin session.
- **Data.** `getApplications({ status, interviewGroup, limit: 200 })`
  filtered by the active tab.
- **Renders.** A tab bar (status pipeline `ALL/PENDING/SHORTLISTED/
  INTERVIEW/SELECTED/REJECTED` plus one tab per `INTERVIEW_GROUPS`
  entry), an "EXPORT CSV" link to `/api/admin/applications/export`, and
  `ApplicationsTable`.
- **Notable.** Group tabs filter by `interview_group` (ignoring
  status); status and group are mutually exclusive in the query.
  `showPanelAssign` is passed to the table only on the INTERVIEW status
  tab. Copy notes ACCEPTED/REVIEWED are legacy statuses reachable only
  via ALL.

## /admin/bootstrap
File: src/app/(admin)/admin/bootstrap/page.tsx

- **Route.** `/admin/bootstrap`.
- **Rendering mode.** dynamic.
- **Auth.** Admin session.
- **Data.** `getBootstrapSessions()`; if an active session exists,
  `Promise.all` of `getBootstrapStalls(active.id)` and
  `getBootstrapVolunteers(active.id)`.
- **Renders.** Branches: with an active session it mounts
  `BootstrapAdminDashboard` (session + initial stalls/volunteers);
  otherwise `BootstrapSessions` (the session list / creator).

## /admin/events
File: src/app/(admin)/admin/events/page.tsx

- **Route.** `/admin/events`.
- **Rendering mode.** dynamic (also reads `searchParams`).
- **Auth.** Admin session.
- **Data.** `getEvents({ limit: 100 })`.
- **Renders.** With `?new=true`, an `EventForm` in create mode.
  Otherwise a table of events with per-row EDIT link and an
  `InlineDelete` labelled "ARCHIVE".
- **Notable.** The row delete is a soft-delete/archive (the API's
  non-permanent path); permanent deletion lives on the edit page's
  danger zone. Title cells link to the public `/events/<slug>` page.

## /admin/events/[id]/edit
File: src/app/(admin)/admin/events/[id]/edit/page.tsx

- **Route.** `/admin/events/<id>/edit`.
- **Rendering mode.** dynamic.
- **Auth.** Admin session.
- **Data.** Direct `sql`SELECT * FROM events WHERE id = ${id}`` via
  `@/lib/db` (this page queries the DB inline rather than through a
  service function). Missing row -> `notFound()`.
- **Renders.** `ToggleEventStatusButton`, `EventForm` in edit mode
  (event_date normalized to `YYYY-MM-DD`), and a danger zone with
  `DeleteEventButton` (permanent delete).

## /admin/gallery
File: src/app/(admin)/admin/gallery/page.tsx

- **Route.** `/admin/gallery`.
- **Rendering mode.** dynamic.
- **Auth.** Admin session.
- **Data.** `getGalleryItemsLimited(200)`.
- **Renders.** `GalleryUploadForm` (bulk upload) and a table of items
  with an in-file `truncateUrl` helper and per-row `InlineDelete`.

## /admin/milestones
File: src/app/(admin)/admin/milestones/page.tsx

- **Route.** `/admin/milestones`.
- **Rendering mode.** dynamic.
- **Auth.** Admin session.
- **Data.** `getMilestones()` (`@/lib/services/about`).
- **Renders.** `MilestonesTable` seeded with `initialData`. Page title
  is "Road So Far".

## /admin/settings
File: src/app/(admin)/admin/settings/page.tsx

- **Route.** `/admin/settings`.
- **Rendering mode.** dynamic.
- **Auth.** Admin session.
- **Data.** `Promise.all` of `getAllSettings()` and
  `getApplications({ limit: 50 })`, backstopped by `DEFAULT_SETTINGS`
  and `[]`.
- **Renders.** `SettingsForm` (bound to the settings, submits the
  server action below) plus a recent-applications table.

## Settings server actions
File: src/app/(admin)/admin/settings/actions.ts

- **Purpose.** `"use server"` module exporting one action.
- **`updateSettings(formData)`.** Re-checks `auth()` /
  `session.user.isAdmin` (redirects to `/admin` if not) -- server
  actions are not covered by route middleware, so this in-action check
  is the guard. Iterates a fixed whitelist of nine keys
  (`recruitment_open`, `maintenance_mode`, `maintenance_message`,
  `contact_email`, `contact_phone`, `contact_address`, `instagram_url`,
  `linkedin_url`, `github_url`), writing each present value via
  `setSetting`. Then `revalidatePath`es `/`, `/join`, `/about`,
  `/crew`, `/sponsors`, `/events` so ISR public pages pick up changes.

## /admin/sponsors
File: src/app/(admin)/admin/sponsors/page.tsx

- **Route.** `/admin/sponsors`.
- **Rendering mode.** dynamic (also reads `searchParams`).
- **Auth.** Admin session.
- **Data.** `getSponsors()` (list mode only).
- **Renders.** With `?new=true`, a `SponsorForm` in create mode.
  Otherwise a sponsors table with per-row EDIT link and `InlineDelete`;
  uses an in-file `truncateText` helper for logo URLs.

## /admin/sponsors/[id]/edit
File: src/app/(admin)/admin/sponsors/[id]/edit/page.tsx

- **Route.** `/admin/sponsors/<id>/edit`.
- **Rendering mode.** dynamic.
- **Auth.** Admin session.
- **Data.** Direct `sql`SELECT * FROM sponsors WHERE id = ${id}`` via
  `@/lib/db` (inline SQL). Missing -> `notFound()`.
- **Renders.** `SponsorForm` in edit mode + danger zone with
  `DeleteSponsorButton`.

## /admin/team
File: src/app/(admin)/admin/team/page.tsx

- **Route.** `/admin/team`.
- **Rendering mode.** dynamic (reads `searchParams`).
- **Auth.** Admin session.
- **Data.** `getMembers()`.
- **Renders.** Three modes via query params: `?import=true` ->
  `BulkImportTeam`; `?new=true` -> `MemberForm` create; default ->
  `BulkTeamPhotoUpload` plus a members table. Each row has
  `QuickPhotoUpload`, an EDIT link, and `InlineDelete` (permanent).
- **Notable.** Row thumbnails use a raw `<img>` (with the
  `no-img-element` lint disabled inline) rather than `next/image`.

## /admin/team/[id]/edit
File: src/app/(admin)/admin/team/[id]/edit/page.tsx

- **Route.** `/admin/team/<id>/edit`.
- **Rendering mode.** dynamic.
- **Auth.** Admin session.
- **Data.** Direct `sql`SELECT * FROM team_members WHERE id = ${id}``
  via `@/lib/db` (inline SQL). Missing -> `notFound()`.
- **Renders.** `MemberForm` in edit mode + danger zone with
  `DeleteMemberButton`.

---

# Docs route group

The `(docs)` group renders a filesystem-backed wiki at `/docs`. It
reads markdown straight from `docs/wiki/*.md` on the server. Not
middleware-gated -- public.

## (docs) docs layout
File: src/app/(docs)/docs/layout.tsx

- **Purpose.** Docs chrome.
- **Rendering mode.** Static (synchronous, no data).
- **Metadata.** `title: { default: "Docs", template: "%s | Vegavath
  Docs" }`.
- **Renders.** `Navbar` (offset by a fixed 72px nav height), a sticky
  260px `DocsSidebar` aside, and a max-800px content `main`.

## /docs
File: src/app/(docs)/docs/page.tsx

- **Route.** `/docs`.
- **Rendering mode.** Static -- reads `docs/wiki/README.md` with
  `fs.readFileSync` at build/render time; no dynamic markers.
- **Auth.** Public.
- **Metadata.** `title: "Overview"`.
- **Renders.** `DocsContent` with the README markdown.

## /docs/[slug]
File: src/app/(docs)/docs/[slug]/page.tsx

- **Route.** `/docs/<slug>`.
- **Rendering mode.** SSG -- `generateStaticParams` prebuilds one page
  per non-empty slug in `ALL_DOC_PAGES` (`@/lib/docs-config`).
- **Data.** Validates `slug` against `ALL_DOC_PAGES`
  (`notFound()` if unknown), then reads `docs/wiki/<slug>.md` with
  `fs.readFileSync` (`notFound()` if the file is missing).
- **Auth.** Public.
- **Metadata.** `generateMetadata` sets the title from the matching
  `ALL_DOC_PAGES` entry (falls back to the raw slug).
- **Renders.** `DocsContent` with the file's markdown.
- **Notable.** This is the route that will serve this very file once
  `files-pages` is registered in `docs-config` and lives at
  `docs/wiki/files-pages.md`.

---

# Standalone admin token pages

These live under `/admin/*` but *outside* the `(admin)` route group, so
they get no `AdminShell` chrome. Middleware exempts their path
patterns; the URL token is the only gate (no session).

## /admin/[username]/credentials/[token]
File: src/app/admin/[username]/credentials/[token]/page.tsx

- **Route.** `/admin/<username>/credentials/<token>`.
- **Rendering mode.** dynamic (`force-dynamic`).
- **Auth.** Token-gated public -- middleware regex
  `/admin/<username>/credentials/` bypasses session (S29).
- **Data.** `getPasswordResetToken(token)` (`@/lib/services/admin`).
- **Renders.** If the token is missing *or* does not belong to the
  `username` baked into the URL, an inline "Invalid reset link" panel;
  otherwise `ResetPasswordForm` (posts to
  `/api/admin/credentials/reset`).
- **Metadata.** `robots: { index: false, follow: false }`.

## /admin/invite/[name]/[token]
File: src/app/admin/invite/[name]/[token]/page.tsx

- **Route.** `/admin/invite/<name>/<token>`.
- **Rendering mode.** dynamic (`force-dynamic`).
- **Auth.** Token-gated public -- middleware exempts `/admin/invite/*`
  (S27).
- **Data.** `getInviteToken(token, name)` (`@/lib/services/admin`).
- **Renders.** An inline "Invalid invite link" panel when the invite is
  missing/expired/used; otherwise `AdminRegisterForm` (prefilled with
  `invitee_name`, posts to `/api/admin/register`).
- **Metadata.** `robots: { index: false, follow: false }`.

---

# Bootstrap pages

The `/bootstrap/*` tree drives Team Vegavath's event-day operations.
Middleware never touches these paths. Auth (where present) is the
`vg_vol_session` httpOnly cookie, independent of the admin session. All
pages are `force-dynamic`.

## Bootstrap layout
File: src/app/bootstrap/layout.tsx

- **Purpose.** Minimal wrapper -- a full-height `<div>` setting base
  background/text colors. No nav, no data, no auth.

## /bootstrap
File: src/app/bootstrap/page.tsx

- **Route.** `/bootstrap`.
- **Rendering mode.** dynamic (`force-dynamic`, reads `cookies()`).
- **Auth.** Reads the `vg_vol_session` cookie and resolves it via
  `getVolunteerByToken`. No cookie / invalid token -> logged-out view.
- **Renders.** `BootstrapLogin` when unauthenticated; otherwise
  `BootstrapDashboard` seeded with the volunteer's display name,
  username, and role (defaulting to `"stall"`).

## /bootstrap/checkin/[token]
File: src/app/bootstrap/checkin/[token]/page.tsx

- **Route.** `/bootstrap/checkin/<token>`.
- **Rendering mode.** dynamic.
- **Auth.** Token-gated public -- visitors arrive from a group lead's
  QR code, no login (S33, migration 015).
- **Data.** `getCheckinContext(token)`.
- **Renders.** `BootstrapCheckin` with the resolved session/group names
  and an `isFull` flag computed from `visitor_count >=
  max_group_size`. A bad token or inactive session yields a "not
  started" state (all context null).

## /bootstrap/feedback
File: src/app/bootstrap/feedback/page.tsx

- **Route.** `/bootstrap/feedback`.
- **Rendering mode.** dynamic.
- **Auth.** Public.
- **Data.** `getActiveBootstrapSession()`; if a session exists,
  `getBootstrapStalls(session.id)`.
- **Renders.** `BootstrapFeedback` with `hasSession` and a slimmed
  stall list (`{id, stall_name}`). Posts to `/api/bootstrap/feedback`.

## /bootstrap/register/group
File: src/app/bootstrap/register/group/page.tsx

- **Route.** `/bootstrap/register/group`.
- **Rendering mode.** dynamic.
- **Auth.** Public self-registration (S35).
- **Data.** `getActiveBootstrapSession()`.
- **Renders.** `BootstrapRegister` with `variant="group"` and
  `hasSession`.

## /bootstrap/register/stall
File: src/app/bootstrap/register/stall/page.tsx

- **Route.** `/bootstrap/register/stall`.
- **Rendering mode.** dynamic.
- **Auth.** Public self-registration (S35).
- **Data.** `getActiveBootstrapSession()`; if a session exists,
  `getBootstrapStalls(session.id)`.
- **Renders.** `BootstrapRegister` with `variant="stall"`, `hasSession`,
  and a slimmed stall list (`{id, stall_name}`).
