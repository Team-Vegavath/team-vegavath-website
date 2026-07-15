# Team Vegavath Website - Agent Instructions

This file is read by AI coding assistants (Copilot, Cursor, Codex, etc).
Follow these rules exactly. Do not improvise structure.
CLAUDE.md at the repo root (untracked, local clones only) is the source of
truth - on any conflict with this file, CLAUDE.md wins.
(Last synced: 2026-07-15, revamp Session 29.)

If said AI Agent cannot find the CLAUDE.md from repo (as it is untracked), ask user who cloned repository to contact repo owner and send them their CLAUDE.md project file.

## Stack

- Next.js 16 App Router + TypeScript (strict mode, noUncheckedIndexedAccess)
- Tailwind CSS v4 + design tokens in src/app/globals.css
- Framer Motion (page transitions, reveals)
- React Three Fiber + Drei (3D kart model)
- Neon Postgres via @neondatabase/serverless
- Cloudflare R2 via @aws-sdk/client-s3
- NextAuth v5 beta (credentials; DB multi-admin + env godfather account)
- Deployed on Vercel

## Commands

- `npm run dev` - dev server on localhost:3000
- `npm run build` - must pass with 0 errors before any change is "done"
- `npm run lint`
- `npx tsc --noEmit`

## Live production - read before touching data

The Neon DB and R2 bucket are LIVE PRODUCTION. There is no staging.

- Show a human every query (even SELECT) and every R2 upload/delete,
  and wait for approval before running it.
- Seed scripts in scripts/ hit the live database - never run unprompted.
- Migrations are numbered files in migrations/ applied to Neon MANUALLY
  by the owner (001-012 applied as of 2026-07-15). Never auto-apply;
  write the file, flag it, stop.

## Folder Structure - Do Not Deviate

src/
  app/
    (public)/         # public routes: /, about, events, gallery, crew,
                      # sponsors, join, legal
    (admin)/          # admin panel routes (AdminShell chrome)
    admin/            # PUBLIC token-gated pages, no AdminShell:
                      #   invite/[name]/[token]/  (admin registration)
                      #   [username]/credentials/[token]/  (password reset)
    bootstrap/        # volunteer stall dashboard (own cookie auth)
    maintenance/      # static maintenance page
    api/              # API routes only (public, /api/admin/*, /api/bootstrap/*)
  components/
    layout/           # Navbar, Footer, PageTransition, RacingCursor
    home/             # Home page sections, KartGame (404 game)
    about/            # About page sections
    events/           # Event cards, filters, media lightbox
    gallery/          # Masonry, lightbox
    crew/             # Member cards
    sponsors/         # Marquee, sponsor cards
    join/             # 4-step application form
    admin/            # Admin UI panels, tables, forms
    bootstrap/        # StallCard/Grid, dashboards, login, campus map SVG
    ui/               # Shared primitives
  lib/
    db.ts             # Neon connection only
    r2.ts             # R2 client only
    auth.ts           # NextAuth config only
    utils.ts          # Shared utilities
    services/         # ALL database query logic lives here:
                      # events, team, gallery, sponsors, applications,
                      # settings, admin, about, bootstrap
  types/              # TypeScript interfaces only
  middleware.ts       # Maintenance rewrite + admin route protection

migrations/           # Numbered SQL, applied manually (gitignored)

## Non-Negotiable Rules

### ALWAYS

- TypeScript strict mode. Every prop typed. No implicit any.
- Server Components fetch data. Client Components handle interactivity only.
- All images use next/image with R2 URLs. Never `<img>` tags.
- All DB logic goes in src/lib/services/. Pages and API routes call
  service functions.
- All list queries use LIMIT. Gallery default 30, events default 20.
- Admin API routes re-check session/isAdmin INSIDE the route even though
  middleware also guards them. Both layers, always.
- Error boundaries / .catch fallbacks on every async server component.
- Mobile-first CSS - 375px first, scale up.
- Colors/fonts from the design tokens in src/app/globals.css only.
- Tailwind classes first; inline style={{}} where Tailwind v4 utilities
  don't generate in this setup (mx-auto, some responsive prefixes -
  centering is always inline `margin: "0 auto"`).
- Upload R2 objects under NEW timestamped filenames. R2 serves immutable
  cache headers - overwriting a key serves stale content forever.
- Reuse before inventing: Reveal, Container, DomainGrid, SponsorMarquee,
  EventCard, the lightbox + YouTube-embed patterns, existing service
  functions. A parallel reimplementation of something that exists is the
  #1 failure mode.

### NEVER

- ignoreBuildErrors or ignoreDuringBuilds in next.config.ts
- Git commands that change state (add, commit, push, branch, merge,
  rebase). A human runs all git after reviewing the diff.
- Install, remove, or bump a dependency without explicit approval.
- Binary files (images, videos, models) committed to git - they go to R2.
- Plaintext passwords or secrets in code or commits.
- Raw SQL in API routes or pages - use the services/ layer.
- Admin API routes without an in-route session check.
- Unbounded SELECT queries without LIMIT.
- `<img>` tags - always next/image.
- Emoji in UI text.
- Em dashes anywhere (code, UI copy, docs) - use " - ", a comma, or a
  colon. Sweep any you find in files you touch.
- Rounded corners (rounded-full/xl/2xl, 9999px radii) - the design is
  sharp-cornered. Exceptions: RacingCursor.tsx (circular cursor dot) and
  src/components/bootstrap/ + /bootstrap pages, which use their own BS
  palette and are allowed rounded corners.
- Hardcoded hex colors - use globals.css tokens.
- Gradient text or glow effects.
- A mobile placeholder for the 3D kart - KartModelWrapper renders on ALL
  viewports deliberately. Do not reintroduce one.

## Rendering Strategy

- ISR revalidate:60-120 - /, /about, /events, /gallery, /crew, /sponsors
- SSR (no cache) - /join, /events/[slug], /admin/*, /bootstrap
- Static - /maintenance, 404, error pages
- Middleware runs on all non-static paths: NEXT_PUBLIC_MAINTENANCE_MODE
  ="true" rewrites public routes to /maintenance; token-gated public
  pages (/admin/invite/*, /admin/*/credentials/*, /api/admin/register,
  /api/admin/credentials/reset) bypass the session guard.

## Services Layer Contract

API routes and pages NEVER write SQL directly.
They call functions from src/lib/services/*.ts only.
If two routes need the same data, they call the same service function.
Service exports never include password hashes or session tokens.

## Definition of done (every code change)

1. `npm run build` with 0 errors and `npx tsc --noEmit` exit 0.
2. Design gate on touched .tsx: no emoji, no banned radii, no mx-auto,
   no em dashes, tokens only.
3. UI work needs a human's visual OK in the dev server before it is
   "finished".

## More context

Full architecture and workflow docs (Handoff.md, docs/revamp-log.md,
docs/planning-agent-briefing.md) are untracked - ask the project lead
for them if you are working from a fresh clone.
