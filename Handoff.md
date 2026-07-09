# Team Vegavath Website - Junior Dev Team Handoff

Last updated: 2026-07-07
Owner: Team Vegavath
Repository: team-vegavath-website
Primary branch: master

## 1) What this project is

This is the official website for Team Vegavath (PESU ECC), built on Next.js App Router with a public-facing site and a protected admin panel.

Main goals:
- Showcase team identity, events, sponsors, gallery, and crew
- Collect join applications
- Let authorized admins manage content (events, team, gallery, sponsors, settings)

## 2) Tech stack (actual implementation)

- Framework: Next.js 16 App Router + TypeScript (strict)
- UI: Tailwind CSS v4 + custom inline styles where needed
- Animation: Framer Motion (file exists, currently not wired globally)
- 3D: React Three Fiber + Drei (home page kart model)
- Auth: NextAuth v5 beta with Credentials provider
- Database: Neon Postgres via @neondatabase/serverless
- Object storage/CDN: Cloudflare R2 via AWS SDK S3 client
- Deploy target: Vercel (README + conventions)
- CI: GitHub Actions (lint, type-check, build)

## 3) High-level architecture

Request flow follows this contract:
1. UI (pages/components) calls service-layer functions for data
2. API routes also call service-layer functions (same source of truth)
3. Service layer is the only place with DB SQL queries
4. Admin routes are protected with middleware + session checks
5. Media files are uploaded to R2; DB stores URLs

### Important folder conventions

- src/app/(public): public routes
- src/app/(admin): admin routes/layout
- src/app/api: all route handlers
- src/components: UI grouped by domain
- src/lib/services: all DB query logic
- src/lib/db.ts: Neon connection only
- src/lib/r2.ts: R2 client only
- src/lib/auth.ts: NextAuth config only
- migrations: SQL schema migrations
- scripts: seed scripts

## 4) Public pages and rendering strategy

### Public pages
- / : home with hero + 3D model + events + sponsors preview
- /about
- /events and /events/[slug]
- /gallery
- /crew
- /sponsors
- /join
- /legal

### Rendering/caching in current code
- Many public pages use ISR with revalidate = 60 or 120
- /join is force-dynamic (SSR/no cache)
- /events/[slug] is force-dynamic
- API routes for events/team/gallery are force-dynamic

Note: Route-level caching is mixed between page-level ISR and dynamic APIs. Keep this behavior consistent unless intentionally changing data freshness strategy.

## 5) Admin panel behavior

Admin entry:
- /admin is login page
- /admin/dashboard and other /admin/* pages are protected

Protection model:
- Middleware blocks /admin/* (except /admin login) and /api/admin/* when unauthenticated
- Each admin API route also re-checks session and isAdmin flag

Admin capabilities:
- Events CRUD + archive/permanent delete
- Team CRUD + active toggle
- Gallery create/delete
- Sponsors CRUD + active toggle
- Settings updates + application status updates
- File upload endpoint for media to R2

## 6) Data model (Postgres)

Tables in migration:
- events
- team_members
- gallery_items
- sponsors
- applications
- site_settings

Key constraints:
- Enum-like CHECK constraints for categories/status/tiers/domains
- UUID primary keys via pgcrypto
- Useful indexes on date/status/ordering
- Trigger updates events.updated_at

## 7) Services layer contract (critical)

All SQL must live in src/lib/services/*.ts.

Current services:
- events.ts
- team.ts
- gallery.ts
- sponsors.ts
- applications.ts
- settings.ts

Rules juniors must follow:
- Never write raw SQL in page components
- Avoid writing raw SQL in API routes; use services
- Keep list queries bounded (LIMIT)
- Reuse existing service functions when possible

## 8) API map

Public API:
- GET /api/events
- GET /api/team
- GET /api/gallery
- GET /api/sponsors
- POST /api/join

Admin API:
- /api/admin/events (GET POST PATCH DELETE)
- /api/admin/team (GET POST PATCH DELETE)
- /api/admin/gallery (GET POST DELETE)
- /api/admin/sponsors (GET POST PATCH DELETE)
- /api/admin/settings (GET PATCH)
- /api/admin/upload (POST)

## 9) Auth and security details

- Credentials auth checks ADMIN_USERNAME and bcrypt-verified ADMIN_PASSWORD_HASH
- Session strategy is JWT
- session.user.isAdmin is attached from token
- Middleware guards admin UI and admin APIs

Security expectations for maintainers:
- Never commit secrets
- Keep admin checks in every admin route
- Validate request bodies in write routes
- Keep upload restrictions strict (file size/type validation can be improved)

## 10) Environment variables (source of truth)

Variables used by code:
- DATABASE_URL
- ADMIN_USERNAME
- ADMIN_PASSWORD_HASH
- R2_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME
- NEXT_PUBLIC_R2_PUBLIC_URL
- R2_PUBLIC_HOSTNAME (for next/image remote patterns)

CI also expects:
- NEXTAUTH_SECRET
- NEXTAUTH_URL

Important mismatch to fix/document:
- README currently shows CLOUDFLARE_* names in one section, but implementation uses R2_* and NEXT_PUBLIC_R2_PUBLIC_URL.
- New developers should follow code variables listed above.

## 11) Dev workflow for juniors

Recommended branch workflow:
1. Pull latest master
2. Create feature branch
3. Implement minimal focused changes
4. Run local checks
5. Open PR
6. Wait for CI green

Local commands:
- npm install
- npm run dev
- npm run lint
- npx tsc --noEmit
- npm run build

### Git rules for juniors

Branching and commits:
- Never commit directly to master. Always work on a feature branch:
  `git checkout master && git pull`, then `git checkout -b feat/<short-name>` (or `fix/<short-name>`).
- Commit messages follow the existing history style: `feat: <what shipped>`, `fix: <what was broken>`, `chore: <housekeeping>`. Write what the commit does, not "updates".
- Keep each branch to one focused change. If you touched two unrelated things, split them into two branches/PRs.

Hard rules (no exceptions):
- Never `git push --force` to master.
- Never commit binary assets (images, videos, models) — they go to R2.
- Never commit `.env.local` or any secret. If a secret lands in a commit, tell the lead immediately — it must be rotated, not just deleted.
- Never merge with red CI, and never "fix" CI by disabling lint or type checks.

AI assistants (Claude, Copilot, etc.):
- AI tools must NOT run git commands that change state (commit, push, branch, merge, rebase). A human runs all git operations after reviewing the AI's changes with `git diff`.
- Review every AI-generated diff line by line before staging it. You own what you commit.

## 12) Seed and content bootstrap

Seed scripts exist under scripts/:
- seed-events.ts
- seed-gallery.ts
- seed-team.ts
- seed-sponsors.ts

Runner JS files allow running TS scripts with ts-node registration.

Use seeds when:
- Spinning up initial data for a new DB
- Rehydrating staging environments

Do not run blindly on production without confirming idempotency and expected data overlap.

## 13) CI/CD and quality gates

GitHub Actions workflow runs on push/PR:
- npm ci
- lint
- tsc --noEmit
- build (with required env secrets)

Quality gate policy for juniors:
- No merge with failing CI
- No bypassing lint/types unless explicitly approved by lead

## 14) Known quirks and practical gotchas

1. Tailwind v4 utility generation quirks
- Some centering classes were reported as unreliable in this setup.
- Codebase already uses targeted inline centering styles in key places.

2. 3D model behavior
- Desktop shows interactive kart model
- Mobile shows lightweight placeholder for performance

3. Dynamic rendering usage
- Some APIs and pages are force-dynamic by design for freshness

4. Unused transition component
- PageTransition component exists but is not currently mounted in layout

5. Auth route check
- NextAuth handler exports exist in src/lib/auth.ts; verify that the App Router auth route is present and wired if auth behavior changes.

## 15) Paid services / billing / cost exposure

You asked specifically where paid stuff exists. Today this project appears to be mostly on free-tier usage, but billing hooks are present.

### A) Cloudflare R2 (object storage) - billing-linked
What is in code:
- R2 client setup and credentials in src/lib/r2.ts
- Upload API writing objects to R2 in src/app/api/admin/upload/route.ts
- Public media URLs used throughout pages/components

Why this can cost money:
- Storage growth (images/videos/models)
- Operations (PUT/LIST/GET requests)
- Egress depends on usage pattern and provider terms

Your note about debit card:
- If a debit card is attached to Cloudflare account billing, this is the clearest paid/billing-linked system currently represented in this repo.

### B) Neon Postgres - potentially billable
What is in code:
- Database connection in src/lib/db.ts
- Full app content reads/writes on Neon

Why this can cost money:
- Compute/storage upgrades beyond free limits
- More branches/projects or heavier usage

### C) Vercel hosting - potentially billable
What is in project docs:
- Deployment target is Vercel

Why this can cost money:
- Team seats, bandwidth, function usage, analytics, etc. beyond free plan thresholds

### D) Domain/email/tools outside repo
Not directly visible in code, but can become paid depending on your setup:
- Custom domain registrar/renewal
- Transactional email providers
- Monitoring tools

## 16) Operational ownership checklist

For junior maintainers, assign explicit owners:
- App owner: reviews architecture-affecting PRs
- Data owner: approves migration + service-layer changes
- Content owner: verifies event/gallery/team correctness
- Ops owner: manages env vars, CI secrets, hosting, and R2 policies

## 17) Safe change policy for this project

Do:
- Keep edits small and domain-focused
- Add types for all props and API payloads
- Keep service-layer single source of DB logic
- Add/maintain LIMIT on list queries

Do not:
- Add ignoreBuildErrors/ignoreDuringBuilds
- Commit binary assets into git
- Put secrets in source code
- Add unbounded SELECT queries
- Bypass admin auth checks in APIs

## 18) Suggested onboarding plan for new juniors

Week 1:
- Run app locally and inspect all routes
- Read services and API routes end to end
- Make one safe UI-only PR

Week 2:
- Handle one admin CRUD bugfix
- Add one small validation improvement in an API route

Week 3:
- Ship one feature touching service + API + UI with tests/checks

## 19) Immediate improvements backlog (recommended)

1. Add or verify src/app/api/auth/[...nextauth]/route.ts wiring for NextAuth handlers
2. Align README env variable names with actual code
3. Add stronger file upload validation (type/size/path constraints)
4. Add consistent error boundaries/loading states where missing
5. Add integration test coverage for admin APIs and join flow

## 20) Meeting handoff script (quick summary)

If someone misses the meeting, they should read this document in order:
1. Sections 1-5 (architecture and behavior)
2. Sections 7-11 (how to work safely)
3. Section 15 (paid/billing exposure)
4. Section 19 (first tasks to pick up)

---

If you are a junior developer joining now, start by tracing one feature vertically:
Page -> API route -> service -> DB table

That one exercise will teach you most of the project structure quickly.
