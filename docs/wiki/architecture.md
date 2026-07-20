# Architecture

This is the system-level orientation for the Team Vegavath website. Read it
before touching the codebase. It explains what the app is, why each piece of
the stack was chosen, how the code is laid out, and the two things most likely
to trip up a new engineer: the two separate auth systems and the design-token
styling rules.

Team Vegavath is the PESU ECC (Electronic City Campus) motorsport club. This
repo is its official site.

## 1. System overview

The application is one Next.js 16 project that serves three distinct
audiences from the same deployment:

- **Public site** -- the marketing and information surface: home, about,
  events, gallery, crew, sponsors, a multi-step "join" application form, and
  legal pages. Anonymous visitors, read-mostly, heavily cached.
- **Admin panel** -- a protected back office at `/admin` where club staff
  manage events, gallery media, sponsors, team members, milestones, incoming
  applications, admin accounts, and site settings (including a maintenance
  toggle). Guarded by NextAuth.
- **Bootstrap event-day system** -- a self-contained subsystem for a live
  5-day campus showcase event called "Bootstrap." Volunteers log in at
  `/bootstrap` to a per-day stall dashboard, visitors check in via per-lead QR
  tokens and submit feedback, and volunteers self-register for stalls and
  groups. It has its own cookie-based auth, its own database tables
  (`bootstrap_*`), and its own visual palette. Admins configure Bootstrap
  sessions from `/admin/bootstrap`, including an AI feedback summary.

All three share the same database (Neon Postgres), the same media store
(Cloudflare R2), and the same middleware, but they are otherwise separate
concerns with separate access control.

## 2. Tech stack and why

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Server Components fetch data on the server (no client DB exposure), route groups cleanly separate public/admin/bootstrap, and per-route caching gives ISR and SSR from one codebase. |
| Language | TypeScript, strict mode (+ `noUncheckedIndexedAccess`) | Every prop and query result is typed; indexed access must be null-checked. Catches shape mismatches against DB rows at compile time. |
| Styling | Tailwind v4 + CSS design tokens | Tailwind for fast utility-first layout; all colors and fonts come from CSS custom properties in `globals.css` so the sharp/dark/editorial look is enforced in one place. See section 5. |
| Animation | Framer Motion | Page transitions and scroll reveals (the `Reveal` primitive). Declarative, plays well with React. |
| 3D | React Three Fiber + Drei | Renders the 3D kart model. Deliberately renders on all viewports (no mobile placeholder -- see the gotcha). |
| Database | Neon serverless Postgres via `@neondatabase/serverless` | HTTP-based Postgres driver that works from Edge and serverless functions with no connection pool to manage. Cold-start caveat below. |
| Object storage | Cloudflare R2 via `@aws-sdk/client-s3` | S3-compatible, cheap egress. Holds all images, videos, and the 3D model. Binaries never go in git. |
| Auth | NextAuth v5 beta (Credentials) | Admin login only. DB-backed multi-admin plus an env "godfather" fallback account. JWT sessions. See section 4. |
| AI | Google Gemini (`gemini-1.5-flash`) | On-demand summaries of Bootstrap feedback for club leadership. Called directly over REST, not an SDK. |
| Hosting | Vercel | Native Next.js host: ISR, image optimization CDN, Edge middleware, per-route serverless functions. |

## 3. Directory structure

```text
src/
  app/
    (public)/            # Public routes, share public chrome
      page.tsx           #   home
      about/  events/  events/[slug]/  gallery/  crew/  sponsors/
      join/              #   4-step application form
      legal/
    (admin)/
      admin/             # Protected admin panel (AdminShell chrome)
        page.tsx         #   login
        dashboard/  events/  events/[id]/edit/  gallery/  sponsors/
        team/  milestones/  applications/  accounts/  settings/
        bootstrap/       #   Bootstrap session admin + AI summary
    (docs)/
      docs/  docs/[slug]/  # In-app documentation viewer
    admin/               # PUBLIC token-gated pages, NO AdminShell, NOT the panel:
      invite/[name]/[token]/          #   admin self-registration (S27)
      [username]/credentials/[token]/ #   password reset (S29)
    bootstrap/           # Volunteer event-day system (own cookie auth)
      page.tsx           #   volunteer login + stall dashboard
      feedback/          #   public visitor feedback form
      checkin/[token]/   #   public per-lead QR check-in (S33)
      register/stall/    #   volunteer self-registration (S35)
      register/group/
    maintenance/         # Static maintenance page
    api/
      admin/             #   /api/admin/* -- session-guarded write endpoints
      bootstrap/         #   /api/bootstrap/* -- volunteer + public endpoints
      ...                #   other public API routes
  components/
    layout/              # Navbar, Footer, PageTransition, RacingCursor
    home/ about/ events/ gallery/ crew/ sponsors/ join/
    admin/               # Admin panels, tables, forms
    bootstrap/           # Stall cards/grid, dashboards, login, campus map SVG
    ui/                  # Shared primitives (Reveal, Container, etc.)
  lib/
    db.ts                # Neon connection ONLY (exports `sql`)
    r2.ts                # R2 S3 client ONLY
    auth.ts              # NextAuth config ONLY
    utils.ts             # Shared utilities
    utils/               # More focused helpers (e.g. phone.ts)
    services/            # ALL SQL lives here (see contract below)
      events.ts  team.ts  gallery.ts  sponsors.ts  applications.ts
      settings.ts  admin.ts  about.ts  bootstrap.ts
  types/                 # TypeScript interfaces only
  middleware.ts          # Maintenance rewrite + admin route protection

migrations/              # Numbered SQL (001-017), applied to Neon MANUALLY
```

**Architecture contract (enforced):**

- All SQL lives in `src/lib/services/*.ts`. Pages and API routes call service
  functions -- never inline SQL. If two routes need the same data they call
  the same function. Service exports never include password hashes or session
  tokens.
- Every list query has a `LIMIT` (defaults: events 20, gallery 30).
- Server Components fetch data; Client Components handle interactivity only.
- Migrations in `migrations/` are numbered SQL files applied to Neon by hand
  by the owner. Never auto-apply. Write the file, flag it, stop.

## 4. The two auth systems

The app has two entirely separate authentication mechanisms. Do not mix them.

### 4a. NextAuth v5 -- admin only

Configured in `src/lib/auth.ts`. Credentials provider, JWT session strategy,
24-hour max age. The sign-in page is `/admin`.

The `authorize` function resolves an admin in two tiers:

1. **DB multi-admin accounts** (`admin_accounts` table, added in migration
   S27). Looks up the username, verifies the password with `bcrypt.compare`,
   and reads a `token_version`. A role of `godfather` sets `isGodfather`.
2. **Env "godfather" fallback** -- if no DB account matches (or the table does
   not yet exist), it checks `ADMIN_USERNAME` against `ADMIN_PASSWORD_HASH`
   (a bcrypt hash in env). This account cannot be deleted or overridden and is
   the break-glass login.

`token_version` is a session-invalidation lever: the JWT callback re-reads it
on every refresh for DB accounts, and if it no longer matches (a password
reset bumps it) the token is rejected, forcing re-login across all devices.
Infrastructure failures fail open (allow through) so a DB blip never locks out
every admin.

The session exposes `isAdmin` and `isGodfather` on `session.user`.

**Where admin auth is enforced (two layers, both required):**

- **Middleware** (`src/middleware.ts`) wraps the handler in NextAuth `auth()`.
  Any request to `/admin/*` (except `/admin` itself) or `/api/admin/*` without
  `req.auth` is redirected to `/admin`.
- **In-route checks** -- every admin API route independently calls `auth()`
  and returns 401 if `!session?.user?.isAdmin`, even though middleware already
  guarded it. This is a hard rule: keep both layers.

Note the token-gated public pages that middleware deliberately lets through
without a session: `/admin/invite/*`, `/admin/*/credentials/*`,
`/api/admin/register`, and `/api/admin/credentials/reset`. On these the
one-time token in the URL is the gate, not a session.

### 4b. Bootstrap volunteer auth -- separate cookie system

Volunteers do not use NextAuth at all. Their auth lives in
`src/app/api/bootstrap/volunteer-auth.ts` and the login/logout routes:

- Login (`/api/bootstrap/login`) verifies a volunteer's username and password
  (bcrypt) against the currently active Bootstrap session, then mints a random
  `crypto.randomUUID()` token, claims it on the volunteer row (single active
  session per account -- a second login gets 409 "Account in use"), and sets
  an httpOnly cookie named `vg_vol_session` with a 24-hour max age
  (credentials are per-day).
- Requests resolve the volunteer with `getVolunteerFromCookie()`, which reads
  the cookie token and looks up the volunteer via `getVolunteerByToken`.

**Key differences from admin auth:**

| | Admin (NextAuth) | Bootstrap volunteer |
| --- | --- | --- |
| Mechanism | JWT session | Opaque UUID token in httpOnly cookie |
| Store | `admin_accounts` + env | `bootstrap_volunteers` |
| Cookie/token | NextAuth session cookie | `vg_vol_session` |
| Enforced by | Middleware + in-route `auth()` | In-route `getVolunteerFromCookie()` only |
| Lifetime | 24h | 24h (per event day) |

Middleware does **not** gate `/bootstrap/*` or `/api/bootstrap/*`. Those pass
through with no session, because several are genuinely public (visitor
check-in `/bootstrap/checkin/[token]`, feedback, and volunteer
self-registration). Protection for volunteer-only endpoints is enforced inside
the route by checking the cookie. Bootstrap volunteer passwords are stored
plaintext-adjacent (kept retrievable so admin tables can display them) because
`/bootstrap` is explicitly low-stakes, single-event access.

## 5. Design token system

All colors and fonts come from CSS custom properties defined in
`src/app/globals.css`. Never hardcode a hex value or introduce a new font.

Core tokens:

```text
Backgrounds  --bg-base #0a0a0a  --bg-surface #111  --bg-card #161616  --bg-elevated #1d1d1d
Accent       --accent #EF5D08 (Cayenne orange)  --accent-hover #d44f06  --accent-dim
             --gold #F29C04 (shield trim)        --gold-dim
Text         --text-primary #F0F0F0  --text-secondary #9a9a9a  --text-muted #555
Borders      --border #1e1e1e  --border-strong #2a2a2a
Status       --success #22c55e  --error #ef4444  --warning #F29C04
Fonts        --font-orbitron (display)  --font-chakra (UI/labels)
             --font-space (body)        --font-mono (code/data)
```

Fonts are loaded via `next/font/google` in `layout.tsx` (Orbitron,
Chakra Petch, Space Grotesk, Space Mono) and exposed as the CSS variables
above. There is a `LEGACY ALIASES` block at the top of `globals.css`
(`--background`, `--accent-secondary`, etc.) kept for pages not yet rebuilt --
it is removable once nothing references the old names.

**The Tailwind v4 inline-style workaround.** In this project's Tailwind v4
setup, some utilities do not generate CSS -- notably `mx-auto` and certain
responsive prefixes. So:

- Use Tailwind utility classes first.
- Where a utility silently produces no CSS, fall back to an inline
  `style={{}}`. Centering in particular is always inline: `margin: "0 auto"`,
  never `mx-auto`.

**Aesthetic rules** (a design gate greps for violations on touched `.tsx`):
sharp corners only (no `rounded-full` / `rounded-xl` / `rounded-2xl` /
`9999px`), no emoji in UI text, no gradient text, no glows. Two exceptions to
the corner rule: `RacingCursor.tsx` (a circular cursor dot) and the
`src/components/bootstrap/` + `/bootstrap` pages, which use their own Bootstrap
palette and are allowed rounded corners.

## 6. External services

### Neon (serverless Postgres)

Connected in `src/lib/db.ts` via `neon(process.env.DATABASE_URL)`, which
exports a single tagged-template `sql` client. It is the HTTP driver, chosen
so queries work from Edge middleware and serverless functions without a
connection pool.

- **Cold start:** the Neon free tier suspends the compute after ~5 minutes
  idle. The first request after idle takes roughly 2-5 seconds to wake it.
  Expect this in local dev and low-traffic windows.
- **Middleware pins its own `neon()` instance** rather than importing
  `db.ts`, because middleware runs on the Edge and must stay on the HTTP
  driver regardless of a pending local dev-TCP change to `db.ts`.
- **Production is live; there is no staging.** Every query (even a SELECT)
  and every seed script must be shown to the owner and approved before it
  runs.

### Cloudflare R2 (object storage)

Connected in `src/lib/r2.ts` as an S3-compatible client (region `auto`,
endpoint `https://<account>.r2.cloudflarestorage.com`). Bucket defaults to
`vegavath-media`. Env vars use the `R2_*` names (`R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`,
`R2_PUBLIC_HOSTNAME`, `NEXT_PUBLIC_R2_PUBLIC_URL`). The `CLOUDFLARE_*` names in
the README are stale -- follow the code.

- **Immutable cache headers.** R2 serves objects with long-lived immutable
  cache headers. **Never overwrite an existing key** -- it will serve stale
  content forever. Always upload under a new, timestamped filename.
- Images are served through `next/image`. `next.config.ts` allow-lists the R2
  public hostname (plus a hardcoded `pub-*.r2.dev` fallback and
  `img.youtube.com`), restricts device sizes to `[384, 768, 1200]`, and caches
  transforms for 1 year to conserve Vercel transformation credits.

### Vercel (hosting)

Deployment target. Provides the ISR cache, the image-optimization CDN, Edge
middleware execution, and per-route serverless functions. `next.config.ts`
enforces `no ignoreBuildErrors / no ignoreDuringBuilds` -- builds must be
clean.

### Google Gemini (AI feedback summaries)

Used in exactly one place: `POST /api/admin/bootstrap/sessions/[id]/summarize`
(admin-only, session-checked in-route). It pulls raw Bootstrap feedback via
the service layer, builds a prompt with computed averages, and calls
`gemini-1.5-flash` over REST at `generativelanguage.googleapis.com` using
`GEMINI_API_KEY`. It returns a 250-350 word leadership summary plus the
response count and averages. Missing key returns 503; upstream errors return
502 -- the feature degrades gracefully and never blocks the panel.

## 7. Rendering strategy

Per-route caching, chosen for the audience of each surface:

| Strategy | Routes | Rationale |
| --- | --- | --- |
| **ISR** (`revalidate: 60-120`) | `/`, `/about`, `/events`, `/gallery`, `/crew`, `/sponsors` | Public, read-mostly, high traffic. Serve cached HTML, refresh in the background. |
| **SSR** (no cache) | `/join`, `/events/[slug]`, `/admin/*`, `/bootstrap` | Per-request or personalized/authenticated data that must always be fresh. |
| **Static** | `/maintenance`, 404, error pages | No data; prerendered once. |

**Middleware** (`src/middleware.ts`) runs on all non-static paths (matcher
excludes `_next` internals and any path with a dot). Two jobs:

1. **Maintenance rewrite.** If maintenance mode is on, public routes rewrite to
   `/maintenance`. The flag is read from the `site_settings` table (key
   `maintenance_mode`) and cached in-memory per Edge isolate for 60s, so it is
   not a DB hit on every request and a toggle takes effect within a minute.
   `NEXT_PUBLIC_MAINTENANCE_MODE="true"` is an emergency override for when the
   DB is down. `/admin`, `/api`, and `/maintenance` stay reachable so
   maintenance can be turned off from the panel, and a DB failure fails open
   (site stays up).
2. **Admin route protection.** As described in section 4a.
