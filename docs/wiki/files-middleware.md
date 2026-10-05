# Middleware and Config

_Current as of Session 82C (2026-10-05)._

Reference for the Edge middleware, the Next.js build config, and the shared TypeScript type definitions that describe the site's data model.

## src/middleware.ts

The middleware wraps NextAuth's `auth()` helper and runs on the Edge. It does three jobs on every matched request, in this order: enforce maintenance mode, gate `/docs` behind a shared password (S52B), and gate the admin surface behind a session.

### What it guards

- `/admin/*` (every admin route except the bare `/admin` login page itself) -- requires a session.
- `/api/admin/*` -- requires a session.

Guard logic:

```
const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin";
const isAdminApiRoute = pathname.startsWith("/api/admin");
if ((isAdminRoute || isAdminApiRoute) && !req.auth) {
  return NextResponse.redirect(new URL("/admin", req.url));
}
```

If there is no `req.auth` (no session) on an admin route or admin API route, the request is redirected to `/admin` (the login page). The bare `/admin` path is deliberately excluded from the guard so the login page stays reachable.

Note: the middleware only redirects when unauthenticated. It does not check `isAdmin` here -- per the project architecture contract, admin API routes re-check session/isAdmin inside the route itself. The middleware is the outer of the two layers.

### What it exempts (passes straight through)

Everything that is not an admin route or admin API route passes through with no session. This explicitly includes the public visitor routes (per the code comment): the Bootstrap public flows.

- `/bootstrap/checkin/[token]` (S33, per-lead QR check-in)
- `/bootstrap/feedback`
- `/bootstrap/register/stall` and `/bootstrap/register/group` (S35 volunteer self-registration)
- `/bootstrap/register/pool` (S49 pre-registration pool; S74B role choice)
- `/bootstrap/checklist/[id]` (S73D visitor checklist, keyed by the visitor's own row id)
- their `/api/bootstrap/*` endpoints

(The code comment only names the first three; the rest pass for the same reason -- nothing outside `/admin` and `/api/admin` is session-gated.)

There is also an explicit token-gated allowlist that returns `NextResponse.next()` before the auth gate. These are public auth pages where a one-time URL token is the gate, not a session:

- `/admin/invite/*` (S27 invites)
- `/admin/register` and `/api/admin/register` (S48 open viewer link)
- `/api/admin/credentials/reset` (S29 password resets)
- any path matching `/^\/admin\/[^/]+\/credentials\//` (per-account credential flows)

Without this allowlist those `/admin/*` and `/api/admin/*` paths would be caught by the auth gate and redirected, which would break invite and reset links for logged-out users.

### /docs password gate (S52B)

The internal docs at `/docs/*` publish the auth flow, env var names, the DB schema and every API route with its guards, so they sit behind a shared secret (threat model: `docs/superpowers/plans/2026-07-26-docs-password-gate.md`). The check runs after the token allowlist and before the admin gate:

- `/docs/login` always passes.
- Any other `/docs` path without a `docs_session` cookie equal to `DOCS_PASSWORD` is redirected to `/docs/login`.
- `/api/docs/auth` (which sets the cookie) is not caught here -- it starts with `/api`, not `/docs`.

It **fails OPEN** when `DOCS_PASSWORD` is unset, deliberately, so local dev needs no setup and a var that goes transiently missing mid-deploy cannot lock the docs out. Since S68 that state is loud: every request logs `[docs] DOCS_PASSWORD is not set -- the /docs password gate is OPEN ...` to the function logs. Only the absence is logged, never the value. `robots.ts` disallowing `/docs` is the independent second layer.

### Maintenance-mode check behavior

Maintenance mode rewrites (not redirects) matched public requests to `/maintenance`. The check runs first, before the auth gate:

```
if (
  !pathname.startsWith("/admin") &&
  !pathname.startsWith("/api") &&
  pathname !== "/maintenance" &&
  (await isMaintenanceEnabled())
) {
  const url = req.nextUrl.clone();
  url.pathname = "/maintenance";
  return NextResponse.rewrite(url);
}
```

Key details:

- `/admin`, `/api`, and `/maintenance` itself are exempt from the maintenance rewrite, so the admin panel and API stay reachable to turn maintenance off. The path checks are ordered first so those routes never pay for the DB lookup.
- The rewrite serves the maintenance page while preserving the original URL in the browser.

`isMaintenanceEnabled()` (local to the middleware) resolves the flag with three tiers:

1. `NEXT_PUBLIC_MAINTENANCE_MODE === "true"` -- an emergency override (used when the DB is down) that short-circuits to `true`.
2. An in-memory cache per Edge isolate, valid for 60 seconds (`60_000` ms). A toggle flip from the admin panel takes effect within a minute without a DB query on every request.
3. `getMaintenanceMode()` from `src/lib/services/settings.ts` (reads `site_settings` key `maintenance_mode`), treating the string `"true"` as enabled, then caching the result.

On any DB error the function returns `false` -- it fails open to keep the site up.

The lookup goes through the settings service and therefore `lib/db.ts`, which is the Neon HTTP driver (Edge-safe). An earlier local `neon(...)` instance in the middleware is gone, so the SQL-in-services contract holds here too. If the pending dev-TCP `db.ts` fix ever lands, the middleware must stay on an Edge-compatible driver.

### Cookie / session validation

Session validation is delegated to NextAuth's `auth()` wrapper. The middleware reads `req.auth` (populated by `auth()`) and treats its presence/absence as the session check; it does not parse cookies directly. The augmented session shape (`isAdmin`, `isGodfather`, `isViewer`, `accountId`) is defined in `next-auth.d.ts` (documented below).

### The exact config.matcher

```
export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
```

This matcher runs the middleware on every path EXCEPT:

- anything starting with `_next` (Next.js internals), and
- any path containing a dot (`.*\..*`), which excludes static files such as images, fonts, and `.js`/`.css` assets.

Per the code comment, this is broader than the old matcher (which only ran on `/admin` and `/api/admin`); the wider matcher is what lets the maintenance rewrite cover public pages too.

## next.config.ts

Typed as `NextConfig`. The file is small and image-focused; there are no redirects, no custom headers, no `experimental` flags, and no `env` block. There is an explicit comment stating build errors are never ignored (no `ignoreBuildErrors`, no `ignoreDuringBuilds`).

### Image optimization settings

- `deviceSizes: [384, 768, 1200]` -- restricted from Vercel's default 8 sizes down to 3 (mobile/tablet/desktop). Fewer sizes means proportionally fewer transformation credits, since each optimized image generates at most one variant per device size per format.
- `minimumCacheTTL: 31536000` -- 1 year (`60 * 60 * 24 * 365`). Once a given (image, size, format) is transformed it is served from Vercel's CDN cache indefinitely, so many students loading the same photo cost a single transformation.
- `imageSizes` -- not set (uses Next.js defaults).
- `formats` -- not set (uses Next.js defaults).

### remotePatterns (allowed image hostnames)

All entries are `protocol: "https"`.

1. `process.env.R2_PUBLIC_HOSTNAME` with `pathname: "/**"` -- included only when the env var is present (spread conditionally).
2. `pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev` with `pathname: "/**"` -- a hardcoded fallback. The comment explains it prevents image optimization from silently degrading to unoptimized originals when `R2_PUBLIC_HOSTNAME` is missing from an environment.
3. `img.youtube.com` with `pathname: "/vi/**"` -- YouTube video thumbnails (the `/vi/` path serves per-video thumbnail images), tied to the YouTube-embed patterns used in gallery/events/about.

## src/types/event.ts

### `Event` (interface)

Represents a single event record.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | Primary key. |
| `slug` | `string` | URL-safe identifier for the event page. |
| `title` | `string` | Event title. |
| `category` | `"workshops" \| "hackathons" \| "competitions" \| "talks" \| "other"` | Event category. `hackathons` is allowed by the DB CHECK since migration 018 (applied); never yet exercised through the admin UI. |
| `status` | `"upcoming" \| "past" \| "archived"` | Lifecycle state. |
| `description` | `string \| null` | Optional description. |
| `event_date` | `string` | Date of the event. |
| `logo_url` | `string \| null` | Optional event logo. |
| `cover_image_url` | `string \| null` | Optional cover image. |
| `registration_open` | `boolean` | Whether registration is currently open. |
| `registration_form_url` | `string \| null` | Optional external registration form link. |
| `sponsors` | `string[]` | List of sponsor identifiers/names for this event. |
| `created_at` | `string` | Creation timestamp. |
| `updated_at` | `string` | Last-update timestamp. |

### `CreateEventInput` (type)

`Omit<Event, "id" | "created_at" | "updated_at">` -- the `Event` shape without the server-managed fields, used when creating an event.

### `UpdateEventInput` (type)

`Partial<CreateEventInput>` -- all create fields optional, used for partial updates.

## src/types/gallery.ts

### `GalleryItem` (interface)

Represents one media item in the gallery.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | Primary key. |
| `event_id` | `string \| null` | Optional link to an `Event`. |
| `event_label` | `string` | Human-readable label for the associated event. |
| `type` | `"image" \| "video"` | Media kind. |
| `url` | `string` | Media URL (R2 object or video link). |
| `thumbnail_url` | `string \| null` | Optional thumbnail. |
| `caption` | `string \| null` | Optional caption. |
| `taken_at` | `string \| null` | Optional capture date. |
| `display_order` | `number` | Sort order within the gallery. |
| `created_at` | `string` | Creation timestamp. |

### `CreateGalleryItemInput` (type)

`Omit<GalleryItem, "id" | "created_at">` -- used when adding a gallery item.

## src/types/member.ts

### `TeamMember` (interface)

Represents a team member profile.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | Primary key. |
| `name` | `string` | Member name. |
| `role` | `string` | Role title. |
| `tier` | `"core" \| "crew" \| "legacy"` | Membership tier. |
| `domain` | `"Automotive" \| "Robotics" \| "Design" \| "Media" \| "Marketing" \| "Programming" \| "Operations" \| null` | Functional domain (nullable). |
| `quote` | `string \| null` | Optional personal quote. |
| `linkedin_url` | `string \| null` | Optional LinkedIn link. |
| `github_url` | `string \| null` | Optional GitHub link. |
| `photo_url` | `string \| null` | Optional profile photo. |
| `display_order` | `number` | Sort order. |
| `is_active` | `boolean` | Whether the member is shown. |
| `created_at` | `string` | Creation timestamp. |

### `CreateMemberInput` (type)

`Omit<TeamMember, "id" | "created_at">` -- used when creating a member.

### `UpdateMemberInput` (type)

`Partial<CreateMemberInput>` -- partial update shape.

## src/types/settings.ts

This file carries both site settings and the full recruitment/application model.

### `SiteSetting` (interface)

A single key/value row from `site_settings`.

| Field | Type | Meaning |
| --- | --- | --- |
| `key` | `string` | Setting key. |
| `value` | `string` | Setting value (stored as string). |
| `updated_at` | `string` | Last-update timestamp. |

### `SiteSettings` (interface)

The typed, aggregated view of all settings after parsing.

| Field | Type | Meaning |
| --- | --- | --- |
| `recruitment_open` | `boolean` | Whether recruitment is accepting applications. |
| `maintenance_mode` | `boolean` | Maintenance toggle (read by the middleware). |
| `f1_enabled` | `boolean` | Kill switch for the /f1 pages (S50). Off means no Jolpica calls; a missing row reads as OFF. |
| `maintenance_message` | `string` | Message shown on the maintenance page. |
| `contact_email` | `string` | Public contact email. |
| `contact_phone` | `string` | Public contact phone. |
| `contact_address` | `string` | Public contact address. |
| `instagram_url` | `string` | Instagram link. |
| `linkedin_url` | `string` | LinkedIn link. |
| `github_url` | `string` | GitHub link. |

### `ApplicationDomain` (type)

The five current /join domain keys (S82B). The ordered source of truth -- order, labels, test tracks, question sets -- is `JOIN_DOMAINS` in `src/lib/utils/joinQuestions.ts`; these keys must also be allowed by the CHECKs in `migrations/031`.

`"Automotives" | "Robotics" | "Coding" | "Social Media" | "Operations & Sponsorship"`

"Social Media" is the stored key for the domain shown as "Design & Social Media" (S81 relabelled it without touching stored data).

### `LegacyApplicationDomain` (type)

Values still allowed on stored rows but no longer offered by /join: `"Operations"` and `"Sponsorship"` (separate domains until S82B merged them; they display as "Operations & Sponsorship"), the FY25 names from before migration 004, and the long FY26 name Session 19 shortened.

`"Operations" | "Sponsorship" | "Automotive" | "Design" | "Media" | "Marketing" | "Programming" | "Sponsorship & Finance"`

### `APPLICATION_STATUSES` (const) and `ApplicationStatus` (type)

`APPLICATION_STATUSES` is a `readonly` tuple: `["pending", "shortlisted", "interview", "selected", "rejected", "reviewed", "accepted"]` (migration 005; `reviewed` and `accepted` are pre-S19 values kept for existing DB rows).

`ApplicationStatus = (typeof APPLICATION_STATUSES)[number]` -- the union of those string literals.

### `Application` (interface)

A recruitment application record.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | Primary key. |
| `name` | `string` | Applicant name. |
| `email` | `string` | Applicant email. |
| `domain_interest` | `ApplicationDomain \| LegacyApplicationDomain` | Primary domain of interest (accepts legacy values). |
| `domain_interest_2` | `string \| null` (optional) | Second-choice domain. |
| `domain_interest_3` | `string \| null` (optional) | Third-choice domain. |
| `portfolio_url` | `string \| null` | Optional portfolio link. |
| `mobile_number` | `string \| null` (optional) | FY26 field (migration 004); null on pre-FY26 rows. |
| `srn_prn` | `string \| null` (optional) | FY26 student ID field. |
| `semester` | `"1" \| "3" \| "5" \| null` (optional) | FY26 semester field. |
| `why_join` | `string \| null` (optional) | FY26 free-text field. Not written since S81 (kept for old rows). |
| `value_addition` | `string \| null` (optional) | FY26 free-text field. Not written since S81. |
| `domain_experience` | `string \| null` (optional) | FY26 free-text field. Not written since S81. |
| `design_portfolio_url` | `string \| null` (optional) | FY26 design portfolio link. Not written since S81. |
| `status` | `ApplicationStatus` | Pipeline status. |
| `interview_group` | `InterviewGroup \| null` (optional) | Migration 011; null until an admin assigns a group. |
| `submitted_at` | `string` | Submission timestamp. |
| `course` | `string \| null` (optional) | Migration 030 (S81). A course option, or the applicant's own text for "Other". |
| `answers` | `JoinAnswers \| null` (optional) | Migration 030 (S81). Every page 3/4 answer; NULL on every pre-S81 row, which is how an old-form row is identified. |

### `JoinAnswers` (type)

`Record<string, string | string[]>` -- the S81 answers object, keyed by the stable question ids in `src/lib/utils/joinQuestions.ts`. Multi-selects are string arrays.

### `INTERVIEW_GROUPS` (const) and `InterviewGroup` (type)

`INTERVIEW_GROUPS` is a `readonly` tuple `["A", "B", "C", "D"]`.

`InterviewGroup = (typeof INTERVIEW_GROUPS)[number]` -- `"A" | "B" | "C" | "D"`.

### `CreateApplicationInput` (interface)

The public submission shape. Same core fields as `Application`, but `domain_interest` is narrowed to `ApplicationDomain` only (no legacy values on new submissions), and it omits `status`, `interview_group`, `id`, and `submitted_at`.

| Field | Type |
| --- | --- |
| `name` | `string` |
| `email` | `string` |
| `domain_interest` | `ApplicationDomain` |
| `domain_interest_2` | `string \| null` (optional) |
| `domain_interest_3` | `string \| null` (optional) |
| `portfolio_url` | `string \| null` |
| `mobile_number` | `string \| null` (optional) |
| `srn_prn` | `string \| null` (optional) |
| `semester` | `"1" \| "3" \| "5" \| null` (optional) |
| `why_join` | `string \| null` (optional) |
| `value_addition` | `string \| null` (optional) |
| `domain_experience` | `string \| null` (optional) |
| `design_portfolio_url` | `string \| null` (optional) |
| `course` | `string \| null` (optional) |
| `answers` | `JoinAnswers \| null` (optional) |

`/api/join` now sends `course` and `answers` and leaves the four pre-S81 text fields unset.

## src/types/sponsor.ts

### `Sponsor` (interface)

Represents a sponsor record.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | Primary key. |
| `name` | `string` | Sponsor name. |
| `logo_url` | `string` | Logo image URL (required). |
| `website_url` | `string \| null` | Optional website link. |
| `description` | `string \| null` | Optional description. |
| `tier` | `"premium" \| "community"` | Sponsor tier. |
| `is_active` | `boolean` | Whether the sponsor is shown. |
| `display_order` | `number` | Sort order. |
| `created_at` | `string` | Creation timestamp. |

### `CreateSponsorInput` (type)

`Omit<Sponsor, "id" | "created_at">` -- used when creating a sponsor.

### `UpdateSponsorInput` (type)

`Partial<CreateSponsorInput>` -- partial update shape.

## src/types/next-auth.d.ts

Module augmentation that extends NextAuth's built-in types so the custom admin fields are typed everywhere the session, user, or JWT is read.

### `declare module "next-auth"`

Augments `User`:

| Field | Type | Meaning |
| --- | --- | --- |
| `isAdmin` | `boolean` (optional) | Whether the account has admin rights. |
| `isGodfather` | `boolean` (optional) | Whether the account is a "godfather" (super-admin) account. |
| `isViewer` | `boolean` (optional) | Read-only admin tier (S47): sees everything, writes nothing. |
| `tokenVersion` | `number` (optional) | Token version, used to invalidate sessions when bumped. |

Augments `Session` with a fully specified `user` object (this replaces, rather than extends, the default session user):

| Field | Type | Meaning |
| --- | --- | --- |
| `user.name` | `string \| null` (optional) | Display name. |
| `user.email` | `string \| null` (optional) | Email. |
| `user.image` | `string \| null` (optional) | Avatar. |
| `user.isAdmin` | `boolean` | Admin flag (required, non-optional here). |
| `user.isGodfather` | `boolean` | Godfather flag (required, non-optional here). |
| `user.isViewer` | `boolean` | The write gate. `isAdmin` is TRUE for viewers too (it means "may enter the panel"), so every mutating admin route checks `isViewer` right after `isAdmin`. |
| `user.accountId` | `string` | `admin_accounts.id`, or the literal `"godfather"` for the env account (S67). |

### `declare module "next-auth/jwt"`

Augments `JWT`:

| Field | Type | Meaning |
| --- | --- | --- |
| `isAdmin` | `boolean` (optional) | Admin flag carried in the token. |
| `isGodfather` | `boolean` (optional) | Godfather flag carried in the token. |
| `isViewer` | `boolean` (optional) | Viewer flag carried in the token. |
| `accountId` | `string` (optional) | The account's ID. |
| `tokenVersion` | `number` (optional) | Token version for invalidation checks. |

## src/types/announcement.ts

The homepage announcement (S73E, table `announcements`, migration 026).

### `Announcement` (interface)

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | Primary key. |
| `title` | `string` | Required. |
| `body` | `string \| null` | Optional text. |
| `image_url_desktop` / `image_url_mobile` | `string \| null` | Separate crops per aspect ratio (R2 URLs). |
| `cta_label` / `cta_href` | `string \| null` | The button shows only when both are set. |
| `is_active` | `boolean` | Only active rows can show; the homepage takes the first by `display_order`. |
| `display_order` | `number` | Sort key. |
| `created_at` / `updated_at` | `string` | Timestamps. |

### `CreateAnnouncementInput` / `UpdateAnnouncementInput` (types)

`CreateAnnouncementInput` is `Announcement` minus `id` and the timestamps.
`UpdateAnnouncementInput` is `Partial<CreateAnnouncementInput>`, where `undefined`
means "leave alone" and an explicit `null` CLEARS a field -- the reason
`updateAnnouncement` reads then writes instead of using `COALESCE` (which can never
write a NULL back).

## src/types/post.ts

Blog post constants (S50), here rather than in `services/posts.ts` because
`PostForm` is a client component and needs them at runtime -- a value import from a
service would pull the Neon driver into the client bundle.

- `POST_CATEGORIES` -- `["motorsport", "automotives", "robotics"]` (narrowed to three
  in S54B; migration 023 rewrote old rows to `motorsport`). Must match the CHECK in
  migration 022 / 023.
- `PostCategory` -- the union of those.
- `DEFAULT_POST_CATEGORY` -- `"motorsport"`, the single fallback the API route and
  `PostForm` share, so neither can drift onto a value the CHECK rejects.
- `POST_CATEGORY_LABELS` -- display labels.
- `isPostCategory(value)` -- type guard.

## src/types/routes.ts

The public route list (S72C), here so a client component (`/admin/qr`) can share
it with `sitemap.ts` -- importing anything from sitemap.ts, which value-imports
services, would drag the Neon driver into the browser bundle.

- `SITE_URL` -- `"https://vegavath.live"`.
- `STATIC_ROUTES: { path, priority }[]` -- the crawlable public pages the sitemap
  lists: `/`, `/about`, `/events`, `/projects`, `/projects/kart`,
  `/projects/maze-solver` (S78), `/crew`, `/join`, `/gallery`, `/posts`, `/sponsors`, the
  four `/f1` pages, `/legal`. Deliberately excluded: `/projects/combat-bot` (a stub),
  DB-backed detail pages (sitemap.ts adds those at build), and internal routes.
- `QR_ROUTES: { path }[]` -- what the QR tool offers: `STATIC_ROUTES` plus
  `/bootstrap/feedback` (S76D), which is public and shareable but not crawlable.
  A separate array rather than a flag, so sitemap.ts needed no change. Because the
  QR tool renders a dropdown over this array, "public routes only, no fragments"
  is enforced by construction.

