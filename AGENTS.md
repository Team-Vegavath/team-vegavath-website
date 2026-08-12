# Team Vegavath Website - Agent Instructions

This file is read by AI coding assistants (Copilot, Cursor, Codex, etc).
Follow these rules exactly. Do not improvise structure.
CLAUDE.md at the repo root (untracked, local clones only) is the source of
truth - on any conflict with this file, CLAUDE.md wins.
(Last synced: 2026-08-12, revamp Session 72D.)

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
  by the owner. Never auto-apply; write the file, flag it, stop.
  Status as of S72D: 001-025 are ALL confirmed applied, as is the
  `INSERT INTO site_settings (key, value) VALUES ('f1_enabled', 'true')`
  seed. Nothing is outstanding.

## Folder Structure - Do Not Deviate

src/
  app/
    (public)/         # public routes: /, about, events (incl.
                      # [slug]/register), posts, f1, gallery, crew,
                      # sponsors, join, legal
    (admin)/          # admin panel routes (AdminShell chrome)
    admin/            # PUBLIC token-gated pages, no AdminShell:
                      #   invite/[name]/[token]/  (named admin invite)
                      #   register/               (open viewer invite)
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
                      # settings, admin, about, bootstrap, posts, f1
                      # (f1.ts is the one service that holds no SQL - it
                      #  wraps the external Jolpica API instead)
  types/              # TypeScript interfaces only, PLUS any constant a
                      # client component needs to share with a service
                      # (see the client-bundle rule below)
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
- Every MUTATING admin route also carries the viewer guard (S47), right
  after the isAdmin check:

      if (session.user.isViewer) {
        return NextResponse.json({ error: "Read-only account" }, { status: 403 });
      }

  There are three roles: godfather | admin | viewer. `isAdmin` means "may
  ENTER the admin panel" and is TRUE for viewers - every admin page and
  GET route gates on it, so making it false would lock viewers out of the
  panel entirely. `isViewer` is the write gate. Do not "fix" isAdmin.
  The two exemptions: godfather-only handlers (a role is exactly one of
  the three, so godfather+viewer is impossible and the check would be
  dead code) and the public token-gated routes, which have no session.
- Client components that need a constant from a service must get it from
  src/types/ instead. `import type` is fine (the compiler erases it); a
  VALUE import pulls src/lib/db.ts and the whole Neon driver into
  .next/static/chunks, where db.ts's module-level DATABASE_URL check
  throws in the browser. This is a real bug that shipped in S50 and was
  caught by a bundle check. Verify with:
  `grep -rl "neondatabase" .next/static/chunks/` (must return nothing).
- Error boundaries / .catch fallbacks on every async server component.
- Mobile-first CSS - 375px first, scale up.
- Colors/fonts from the design tokens in src/app/globals.css only.
- Tailwind classes first; inline style={{}} elsewhere. The "Tailwind v4
  doesn't generate utilities here" belief was WRONG. `.mx-auto` always
  generated - it lost to globals.css's own unlayered `*{margin:0}`,
  because unlayered CSS beats `@layer utilities`. S52B moved that reset
  into `@layer base`; S53 converted all 24 inline centering workarounds
  to `className="mx-auto"`. Use the utility. Exception: a lone
  `marginRight: "auto"` on a flex child is a spacer, not centering -
  `mx-auto` breaks it. If a Tailwind class silently does nothing,
  suspect one of the ~447 still-unlayered globals.css rules, not a
  missing class.
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
- A mutating admin route without a viewer guard.
- A value import from src/lib/services/* inside a "use client" file.
- New outbound network calls. TWO deliberate egress points already exist
  and a THIRD needs approval:
  (1) src/lib/services/f1.ts -> Jolpica (api.jolpi.ca): one jolpica()
      helper, null on failure, long revalidate windows, DB kill switch.
      Copy this shape if a new one is ever approved.
  (2) src/app/api/admin/bootstrap/sessions/[id]/summarize/route.ts ->
      Google Gemini (generativelanguage.googleapis.com). Predates f1.ts,
      lives in a route rather than a service, so it has no kill switch
      and returns 502 rather than null. Exception, not a pattern.
- Unbounded SELECT queries without LIMIT.
- `<img>` tags - always next/image.
- Emoji in UI text.
- Em dashes (U+2014) anywhere: code, UI copy, docs. Replace with `∙`
  (U+2219), or with `--`, a comma, or a colon. Sweep any you find in
  files you touch. See Writing style below for which separator to pick.
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
- ISR - /posts (300, reports dynamic because it reads searchParams),
  /posts/[slug] (600)
- All /f1 pages are revalidate 60. That is NOT a data-freshness number:
  the page must re-render often enough for the f1_enabled kill switch to
  take effect within a minute. External-call frequency is controlled
  separately by the per-fetch windows inside services/f1.ts (6h/1h/24h),
  so a re-render inside those windows costs nothing upstream. Do not
  raise the 60.
- SSR (no cache) - /join, /events/[slug], /admin/*, /bootstrap
- Static - /maintenance, 404, error pages
- Middleware runs on all non-static paths: NEXT_PUBLIC_MAINTENANCE_MODE
  ="true" rewrites public routes to /maintenance; token-gated public
  pages (/admin/invite/*, /admin/register, /admin/*/credentials/*,
  /api/admin/register, /api/admin/credentials/reset) bypass the session
  guard. Adding a page that unauthenticated people must reach means
  adding it to that exemption list AND placing it outside the (admin)
  route group, or it inherits AdminShell and the auth gate.
- S52B: /docs is behind a shared-password cookie gate (DOCS_PASSWORD) in
  the same middleware, checked before the admin gate. It FAILS OPEN when
  the env var is unset. Its login page is at src/app/docs/login/ -
  outside the (docs) route group on purpose, because a nested layout.tsx
  nests inside DocsLayout rather than replacing it, so a page under
  (docs)/docs/ cannot escape the sidebar. Do not move it.

## Services Layer Contract

API routes and pages NEVER write SQL directly.
They call functions from src/lib/services/*.ts only.
If two routes need the same data, they call the same service function.
Service exports never include password hashes or session tokens.
Client components may only `import type` from a service - see the
client-bundle rule under ALWAYS.

Two service-layer patterns worth knowing before you write a new one:

- Most services use `COALESCE(${value ?? null}, column)` for partial
  updates. That can never write a NULL back, so a column the admin must
  be able to CLEAR needs the read-then-write shape posts.ts uses instead.
- The neon tagged template interpolates VALUES, not SQL fragments. Branch
  on the filter (as getPublishedPosts does) rather than concatenating a
  dynamic WHERE clause.

## Definition of done (every code change)

1. `npm run build` with 0 errors and `npx tsc --noEmit` exit 0.
2. Design gate on touched .tsx: no emoji, no banned radii, no em dashes,
   tokens only.
3. UI work needs a human's visual OK in the dev server before it is
   "finished".

## Writing style

- NEVER use em dashes (U+2014). Two separators are legal: `--` (double
  hyphen) and `∙` (U+2219 BULLET OPERATOR). Prefer `∙` in prose and in
  user-facing copy; `--` stays valid and is what most existing docs use,
  so there is no need to convert it. `·` (U+00B7 MIDDLE DOT) is the
  sanctioned alternate where a lighter break reads better. Do not mix all
  three inside one paragraph.
- `--` is load-bearing in SQL comment markers (migrations/), CSS custom
  properties (`--bg-*`, `--accent`) and CLI flags (`tsc --noEmit`). Never
  sweep it blindly: skip fenced code, migrations/ and .claude/.
- No emoji in JSX or source code files unless explicitly asked.
- Straight quotes only in code and prose.

## Agent behaviour

- Do not parallelize work across multiple subagents or parallel tool-call
  batches. Work through files sequentially, one at a time, and re-check each
  file before moving to the next.
- Task/todo-tracking tools and installed skills/MCP tools are fine to use
  normally.
- If a session is too large to complete reliably in a single sequential
  pass, stop and ask the user to split it into smaller sessions rather than
  parallelising or rushing through it.

## MCP servers and skills

- Context7: use before implementing anything touching Next.js App Router,
  NextAuth, Tailwind v4, or any fast-moving library API
- LegalZoom: use when touching /legal, privacy policy, ToS, or license text
- claude-md-management: use when editing CLAUDE.md or AGENTS.md
- superpowers: /brainstorm /write-plan /execute-plan -- invoke explicitly
  for complex planning tasks
- caveman, ponytail, morph-compact, security-guidance: passive, auto-fire
- frontend-design, feature-dev, code-to-prd, markdown-html-skills: auto-trigger

### MCP calls are not subagents

A single MCP tool call is a sequential tool invocation, not a subagent.
The no-parallel-subagents rule above is about parallel dispatch only.

## More context

Full architecture and workflow docs (Handoff.md, docs/revamp-log.md,
docs/planning-agent-briefing.md) are untracked - ask the project lead
for them if you are working from a fresh clone.
