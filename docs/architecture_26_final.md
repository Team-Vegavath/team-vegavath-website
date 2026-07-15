# TEAM VEGAVATH - Architecture Reference (Final, Consolidated)

**Supersedes:** `vegavath-architecture-v3.pdf` (March 2026) where noted below.
**Companion doc:** `context_for_revamp.md` - the frontend redesign spec. This file and that one are meant to be read together.
**Prepared:** July 2026, for the frontend revamp build. **Updated 2026-07-15 after revamp Session 29.**
**You are:** an AI coding agent (Claude Code / Fable 5 or similar) that has **never seen this codebase before**. Read Section 0 before anything else.

> **STATUS UPDATE (2026-07-15): the revamp this document was prepared for is
> COMPLETE (Sessions 0-29).** Section 2's scope boundary is historical - the
> "do not touch" areas were legitimately extended during the revamp via
> per-session authorized exceptions (services, auth, middleware, migrations,
> types all grew). For current state, `docs/revamp-log.md` is the source of
> truth and `docs/planning-agent-briefing.md` is the orientation doc; this
> file remains useful for the backend fundamentals (services contract, R2
> layout, rendering strategy) and the truth-hierarchy protocol. Section 13
> below summarizes what was added since this doc was written.

---

## 0. READ THIS FIRST - Truth Hierarchy & Verification Protocol

This project has been touched by multiple AI tools across multiple sessions over several months. Documents disagree with each other and with the actual repo in places. **Do not trust any single document, including this one, without checking it against the live repo, live DB, and live R2 bucket first.**

### 0.1 Order of truth (highest to lowest)

1. **The actual code in the repo, right now, on `master`.** Not what a doc says the code does - what the code does.
2. **The live Neon DB schema and live R2 bucket contents** (`\d+ tablename` / R2 bucket listing) - not what a migration file says, since migrations may have drifted from what's actually applied.
3. **This document (`architecture_26_final.md`)** - reconciled as of July 2026, but still just a document.
4. **`docs/revamp-log.md`** (added during the revamp) - the session-by-session record of verified reality; where it conflicts with this doc or anything below, the log wins.
5. **`context_for_revamp.md`** - the frontend design spec. Authoritative for *design decisions* (colors, fonts, layout, copy), not for backend facts.
6. **`README.md`, `Handoff.md`, `AGENTS.md`, `tasks.md`** (repo root) - useful context, written by a previous AI session, may lag reality.
6. **`vegavath-architecture-v3.pdf`** - the *original* planning document from March 2026, before any code existed. Historically valuable, but it describes an *intended* build, not a verified-current one. Treat every claim in it as "proposed," not "true," until you've checked it against #1 and #2.

If any two sources conflict, trust the higher-numbered-priority one, and if you're touching a file affected by the conflict, leave a one-line comment or note in your session summary flagging the discrepancy so the human owner (Abhi) can resolve it.

### 0.2 Mandatory verification steps - run these before writing any code

Do not skip this because a document "already told you" the answer. Documents lag reality; a five-minute check now prevents a wasted session.

1. `git log --oneline -20` and `git status` - see what's actually been committed vs. what tasks.md claims is done.
2. `view` the actual `src/` tree - compare against Section 3 of this doc. Folder structure has been stable across sessions but component filenames inside `components/home/`, `components/about/`, etc. have not been verified recently.
3. Check `package.json` for actual installed dependencies and versions - Next.js version, Tailwind version, and library list have changed at least twice (Next 15→16, Tailwind v3→v4) since the original architecture doc. Don't assume either doc's version numbers are current; read `package.json`.
4. If DB access is available: check the actual `events`, `team_members`, `gallery_items`, `sponsors`, `applications`, `site_settings` tables - column names in the original architecture PDF (Section 4) differ slightly from what's described in the repo README (Section 6 below has the delta table).
5. If R2 access is available: list the actual bucket contents. Do not assume the folder structure in the original architecture doc is what's live - it isn't (see Section 5).
6. Confirm `models/` folder in R2 for the `.glb` kart model file. **As of July 2026, Abhi has confirmed a `.glb` file exists in R2.** Verify the exact filename and path before wiring the 3D section, since the original doc assumed `public/models/` (local, committed) but the actual implementation moved this to R2 (correct - matches the "zero media in git" principle in Section 1.1 of the original doc).
7. Read `AGENTS.md` in the repo root (already largely duplicated below in Section 3, but re-check for drift).

### 0.3 What this document is for

This is the **single reconciled reference** for backend architecture, data model, storage, and the boundary between "solid, working, do-not-touch" and "frontend, being revamped." It exists so you don't have to cross-reference the original PDF, the README, the Handoff doc, and three old chat exports to figure out what's real. Where this doc and `context_for_revamp.md` overlap on design decisions, `context_for_revamp.md` wins - it's the newer, more specific source for frontend work.

---

## 1. Project Overview (unchanged from original)

Team Vegavath is the student innovation and motorsport club at PES University, Electronic City Campus (PESU ECC). The site showcases team identity, events, sponsors, gallery, and crew; collects join applications; and gives admins full CRUD over dynamic content.

**Guiding principles (still true, still enforced):**

- Zero media files in the git repository - everything goes to Cloudflare R2
- No hardcoded content that requires a code deployment to change
- Admin controls all dynamic content
- Clean TypeScript - no `any`, no `@ts-ignore`, no `ignoreBuildErrors`
- Mobile-first
- Zero-cost deployment (free tiers, no card required)
- Junior-maintainable

---

## 2. THE REVAMP - Scope Boundary (HISTORICAL - revamp completed 2026-07-15)

**This section described the mandate while the revamp was in progress. It is
kept for context only.** The revamp is complete; the boundary below no longer
binds. Backend areas were extended session by session under explicit
authorized exceptions recorded in `docs/revamp-log.md`.

**The backend is solid. Do not touch it.** The frontend looks AI-generated and is being rebuilt from scratch, same data, same routes, same services.

### DO NOT TOUCH

- `src/lib/` (any file - `db.ts`, `r2.ts`, `auth.ts`, `utils.ts`, `services/*`)
- `src/types/` (any file)
- `src/app/api/` (any route)
- `migrations/`
- `scripts/`
- `next.config.ts`
- `.env.local`

### YOU ARE TOUCHING

- `src/app/globals.css`
- `src/app/layout.tsx` (font setup only)
- All files in `src/components/`
- All `page.tsx` files in `src/app/(public)/` and `src/app/(admin)/`

### Two narrow exceptions inside "do not touch" (explicitly authorized, small, scoped)

1. **`src/lib/auth.ts`** - add a `try/catch` around the bcrypt compare in the NextAuth credentials provider. Wrong password currently crashes the backend. This is a one-block fix, not a refactor. Do not touch anything else in this file.
2. **Admin upload flow** - `src/app/api/admin/upload` already exists and is in scope to *wire up* (not redesign) for admin events/team CRUD image upload, since `cover_image_url` is currently null for all events (blank previews). Use the existing endpoint; don't build a new one.

Full per-page design spec, copy reference, and session-by-session build order for the revamp live in **`context_for_revamp.md`** - read that document fully before starting frontend work. It is more detailed and more current than the design sections of this file.

---

## 3. Folder Structure (verified against `AGENTS.md` + repo listing - stable, do-not-deviate)

```
src/
  app/
    (public)/         # public routes: /, /about, /events, /events/[slug],
                       # /gallery, /crew, /sponsors, /join, /legal
    (admin)/           # admin routes: /admin (login), /admin/dashboard,
                       # /admin/events, /admin/team, /admin/gallery,
                       # /admin/sponsors, /admin/settings
    api/               # API routes only - public + /api/admin/*
  components/
    layout/            # Navbar, Footer, RacingCursor, CursorToggle, PageTransition
    home/               # Hero, KartModel, HeroDomains, events preview, etc.
    about/              # AboutHeroImage, mission, timeline, values
    events/             # EventsClient, EventMediaClient, filters
    gallery/            # GalleryClient, masonry, lightbox
    crew/               # Member cards, tier grids
    sponsors/           # Marquee, sponsor cards
    join/               # JoinClient, application form
    admin/              # All admin UI panels
    ui/                 # Shared primitives: Button, Modal, Skeleton, Toast
  lib/
    db.ts              # Neon connection ONLY
    r2.ts               # R2 client ONLY
    auth.ts             # NextAuth config ONLY (+ the one authorized try/catch fix)
    utils.ts            # Shared utilities
    services/           # ALL database query logic lives here - see Section 4.0
      events.ts
      team.ts
      gallery.ts
      sponsors.ts
      applications.ts
      settings.ts
  types/                # TypeScript interfaces only
    event.ts
    member.ts
    gallery.ts
    sponsor.ts
    settings.ts
  middleware.ts         # Admin route protection only

migrations/              # SQL schema migrations
scripts/                 # Seed scripts (seed-events.ts, seed-gallery.ts, seed-team.ts, seed-sponsors.ts)
```

**Delta from the original v3.0 doc:** the original PDF (Section 3) proposed `public/models/` for the `.glb` kart model, committed to git. The actual implementation correctly moved this to R2 `models/` instead - consistent with the "zero media in git" principle, and the right call. Don't "fix" this back to matching the PDF; the PDF was wrong here, reality is right.

---

## 4. Services Layer Contract (non-negotiable, unchanged)

All SQL lives in `src/lib/services/*.ts`. API routes and server components call service functions - never raw SQL in routes or pages. If two routes need the same data, they call the same service function.

| Service file                 | Exports                                                                                              | Called by                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `services/events.ts`       | `getEvents()`, `getEventBySlug()`, `createEvent()`, `updateEvent()`, `archiveEvent()`      | public + admin API routes, page server components  |
| `services/team.ts`         | `getMembers()`, `getMembersByTier()`, `createMember()`, `updateMember()`, `toggleActive()` | public + admin API routes,`/crew`                |
| `services/gallery.ts`      | `getGalleryItems()`, `getGalleryByEvent()`, `createGalleryItem()`, `deleteGalleryItem()`     | public + admin API routes,`/gallery`             |
| `services/sponsors.ts`     | `getSponsors()`, `getActiveSponsors()`, `createSponsor()`, `updateSponsor()`                 | public + admin API routes, all pages with sponsors |
| `services/applications.ts` | `createApplication()`, `getApplications()`, `updateApplicationStatus()`                        | `/api/join`, `/api/admin/settings`             |
| `services/settings.ts`     | `getSetting()`, `setSetting()`, `getAllSettings()`                                             | `/api/admin/settings`, root layout (footer)      |

**Added during the revamp (same contract):** `services/admin.ts` (login log,
admin accounts, invite tokens, password reset tokens), `services/about.ts`
(milestones), `services/bootstrap.ts` (the entire Bootstrap stall system;
its exported types deliberately never include password_hash or session
tokens). `services/applications.ts` also grew `setInterviewGroup`,
`bulkSetStatus`, `deleteApplication` and status/group filters.

---

## 5. Cloudflare R2 Storage - RECONCILED (this section supersedes the original doc's Section 6 entirely)

### 5.1 What the original architecture doc (v3.0, March 2026) proposed

```
vegavath-media/
├── events/
│   ├── ignition-1/{logo.png, cover.jpg, gallery/}
│   └── embedx-2/{logo.png, cover.jpg, gallery/}
├── team/{core/, crew/, legacy/}
├── sponsors/{*.svg, *.png}
└── site/{logo.png, og-image.jpg}
```

### 5.2 What is actually live, as of July 2026 - VERIFY THIS FIRST, DON'T ASSUME EITHER LIST IS CURRENT

```
vegavath-media/
├── gallery/     # Event photos - flat, NOT nested under per-event slug folders
├── icons/       # Logo, social icons (this replaces the proposed "site/" folder)
├── models/      # 3D models - CONFIRMED: .glb kart model exists here as of July 2026
├── payments/    # See 5.3 below - NOT part of the original architecture, do not treat as gallery/app content
├── sponsors/    # Sponsor logos
└── team/        # Member photos
```

**Key differences to design around:**

- There is **no `events/` prefix folder** and gallery media is **not** nested per-event-slug the way the original doc proposed. Event media may be directly under `gallery/`. Check `gallery_items.url` values in the DB to confirm actual path patterns in use - do not assume the naming convention from Section 5.1 above is what's actually stored.
- There is **no `site/` folder** - logo/OG-image assets live under `icons/` instead.
- **`/events` page has a known bug (confirmed by Abhi directly, not previously documented anywhere): event images are not loading from R2 for some reason**, separate from the already-known "no admin upload flow yet → `cover_image_url` is null" issue. When implementing the admin events image-upload flow (in scope for this revamp), also check whether existing `cover_image_url`/gallery URLs that *are* populated are actually resolving - this may be a `next.config.ts` `remotePatterns` issue, a broken R2 public URL, or a stale/incorrect path. Diagnose before assuming it's purely "no image uploaded yet."
- **`team_members` videos are YouTube embeds**, not R2-hosted video files - the club's YouTube account hosts video content, R2 only holds photos for team members. Don't build video-upload-to-R2 UI for team members; the pattern is: photo → R2, video → YouTube URL stored as a link/embed.

### 5.3 The `payments/` folder - explicit scope note

`payments/` contains screenshots from the PESU Academy student portal, used as step-by-step visual guides showing students how to pay event registration fees. **This is reference material for one specific purpose only: helping students complete event fee payment.** It is:

- NOT gallery content
- NOT application/join-form data
- NOT to be surfaced anywhere else on the site (not in the gallery grid, not in event media, not in any admin panel beyond wherever this payment-help flow already lives)

If you (the AI agent) encounter this folder while exploring the codebase or R2 bucket, its only legitimate use is within whatever existing event-registration/payment-help UI references it. Do not repurpose these images for any other feature, and do not delete or reorganize this folder as part of "cleaning up" R2 structure - it's intentional and orthogonal to the rest of the media architecture. If you're unsure whether a piece of UI is the legitimate payment-help flow, check the code path that renders it before assuming it's fair game to modify or replace.

---

## 6. Environment Variables - RECONCILED (supersedes original doc Section 7 and repo README's env block)

### 6.1 What's actually used in code (source of truth - confirmed correct)

| Variable                      | Used in             | Description                                        |
| ----------------------------- | ------------------- | -------------------------------------------------- |
| `DATABASE_URL`              | `src/lib/db.ts`   | Neon Postgres connection string                    |
| `NEXTAUTH_SECRET`           | `src/lib/auth.ts` | Session secret                                     |
| `NEXTAUTH_URL`              | `src/lib/auth.ts` | Dev/prod URL                                       |
| `ADMIN_USERNAME`            | `src/lib/auth.ts` | Admin login username                               |
| `ADMIN_PASSWORD_HASH`       | `src/lib/auth.ts` | bcrypt hash - never plaintext                     |
| `R2_ACCOUNT_ID`             | `src/lib/r2.ts`   | Cloudflare account ID                              |
| `R2_ACCESS_KEY_ID`          | `src/lib/r2.ts`   | R2 API access key                                  |
| `R2_SECRET_ACCESS_KEY`      | `src/lib/r2.ts`   | R2 API secret                                      |
| `R2_BUCKET_NAME`            | `src/lib/r2.ts`   | `vegavath-media`                                 |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Client components   | Public base URL for R2 objects, exposed to browser |
| `R2_PUBLIC_HOSTNAME`        | `next.config.ts`  | For`next/image` `remotePatterns`               |
| `ADMIN_DISPLAY_NAME`        | `src/lib/auth.ts` | Optional display name for the env godfather account (S27) |
| `NEXT_PUBLIC_MAINTENANCE_MODE` | `src/middleware.ts` | "true" rewrites all public routes to `/maintenance` (S29) |

### 6.2 Known-stale documentation - do not follow these, do not "fix" the code to match them

- The **repo `README.md`** used to show a stale `CLOUDFLARE_*` naming block - **fixed 2026-07-15; the README env block now matches the `R2_*` names above.** The code always used `R2_*`.
- The **original v3.0 architecture PDF** additionally listed `ADMIN_PASSWORD` (plaintext) as a variable to remove in favor of `ADMIN_PASSWORD_HASH` - this migration was correctly completed; the hash-only approach is what's live. Good, no action needed, just confirming this part of the original plan was followed.

---

## 7. Database Schema - RECONCILED

The original v3.0 PDF (Section 4) is the most detailed schema reference available and is largely still accurate in structure. Column-level specifics below are cross-checked against the repo README's condensed version; where they differ, **verify against the live DB directly (Section 0.2, step 4) before relying on either.**

### 7.1 `events`

`id` (UUID PK) · `slug` (unique) · `title` · `category` · `status` (`upcoming`/`past`) · `description` · `event_date` · `logo_url` · `cover_image_url` · `registration_open` (bool) · `registration_form_url` · `sponsors` (JSONB array of sponsor IDs) · `created_at` · `updated_at`

*Note: `cover_image_url` is currently null for all rows - this is the known gap the admin upload flow needs to close. Also see 5.2 for the separate "existing images not loading" bug.*

### 7.2 `team_members`

`id` (UUID PK) · `name` · `role` · `tier` (`core`/`crew`/`legacy`) · `domain` · `quote` · `photo_url` · `display_order` · `is_active` (bool, soft-delete pattern) · `created_at`

*Repo README also lists a `linkedin_url` column not in the original PDF - verify live schema for the authoritative current column list.*

### 7.3 `gallery_items`

`id` (UUID PK) · `event_id` (FK → events) · `event_label` · `type` (`image`/`video`) · `url` (R2 URL for images, YouTube embed URL for video) · `caption` · `taken_at` · `display_order` · `created_at`

*Repo README additionally lists `thumbnail_url` - verify live schema.*

### 7.4 `sponsors`

`id` (UUID PK) · `name` · `logo_url` · `website_url` · `description` · `tier` - **RESOLVED during the revamp: the live enum is `premium | community`** (the original PDF's 4-tier `title|gold|silver|community` scheme never shipped). The admin sponsor UI is built against premium/community.

### 7.5 `applications` (Join Us)

Rebuilt across migrations 003/004/005/011 (all applied): `id` (UUID PK) · `name` · `email` · `domain_interest` (+`_2`, `_3` - up to 3 picks) · `portfolio_url` · `mobile_number` · `srn_prn` · `semester` · `why_join` · `value_addition` · `domain_experience` · `design_portfolio_url` · `status` (`pending → shortlisted → interview → selected/rejected`, legacy `reviewed`/`accepted` still valid) · `interview_group` (A-D or NULL) · `submitted_at`

### 7.6 `site_settings`

Key-value store. `key` (PK) · `value` · `updated_at`. Known keys: `recruitment_open`, `maintenance_mode`, `maintenance_message`, `contact_email`, `contact_phone`, `contact_address`, `instagram_url`, `linkedin_url`, `github_url`. (Note: the S29 maintenance mode is driven by the `NEXT_PUBLIC_MAINTENANCE_MODE` env var at the Edge, not by these settings keys.)

### 7.7 Required indexes (from original doc, assume still applied - verify via `\di` if DB access available)

`events(status)`, `events(event_date DESC)`, `gallery_items(event_id)`, `team_members(tier, display_order)`, plus unique constraint on `events.slug`. These exist to prevent full table scans on filtered/sorted public pages under burst traffic (event registration openings, gallery browsing).

### 7.8 Tables added during the revamp (migrations 006-012, all applied)

- `admin_login_log` (006) - login audit: attempted_at, success, ip_address, user_agent, device_hint. Also feeds the S29 per-IP rate limit.
- `bootstrap_sessions` / `bootstrap_stalls` / `bootstrap_volunteers` (007, extended by 008/009) - the Bootstrap stall-status system: session activation, stall claim/queue state (claimed_by, queued_by, queued_at, map_x/map_y), volunteer credentials + session tokens + admin stall suggestions.
- `admin_accounts` (010, extended by 012) - DB admin accounts: username, password_hash (bcrypt), display_name, mobile_number, role (admin|godfather), token_version (bumped on password reset to invalidate live JWTs).
- `admin_invite_tokens` (010, extended by 012) - one-time invite links: 48h expiry, status generated → pending_approval → approved/rejected, pending_* registration fields, invitee_name/invitee_slug.
- `milestones` (010) - the About page "Road So Far" timeline: date_label, title, description, sort_order.
- `admin_password_reset_tokens` (012) - one-time password reset links: 2h expiry, used_at, cascade delete with the account.

---

## 8. Rendering Strategy (unchanged, confirmed still accurate)

| Route                                                     | Strategy        | Revalidate | Why                                                               |
| --------------------------------------------------------- | --------------- | ---------- | ----------------------------------------------------------------- |
| `/`, `/about`, `/gallery`, `/crew`, `/sponsors` | ISR             | 60–120s   | Read-heavy, CDN-cacheable, admin changes propagate within minutes |
| `/events`                                               | ISR             | 60s        | Same                                                              |
| `/events/[slug]`                                        | SSR             | none       | Registration status must be live                                  |
| `/join`                                                 | SSR             | none       | `recruitment_open` flag must be live                            |
| `/admin`, `/admin/*`                                  | SSR + protected | none       | Always fresh, not cache-eligible                                  |
| `*` (404)                                               | Static          | none       | -                                                                |

Admin routes protected by NextAuth middleware at the edge; every admin API route *also* re-validates session server-side, independent of middleware - this defense-in-depth is already implemented and must not be weakened.

---

## 9. Design System - LOCKED, FINAL (this reflects the *last* decision made, not the first draft)

**Important for any agent cross-referencing old chat logs:** an earlier draft of this design system used Bebas Neue / Rajdhani / DM Sans / Space Grotesk as the font stack. **That draft was explicitly rejected and superseded.** The final, locked stack is below and matches `context_for_revamp.md` exactly. If you encounter the earlier font names anywhere (old chat exports, early doc drafts), they are obsolete - ignore them.

### Color tokens

```css
:root {
  --bg-base:       #0a0a0a;
  --bg-surface:    #111111;
  --bg-card:       #161616;
  --bg-elevated:   #1d1d1d;

  --accent:        #EF5D08;   /* Cayenne orange, from club logo */
  --accent-hover:  #d44f06;
  --accent-dim:    rgba(239, 93, 8, 0.12);
  --gold:          #F29C04;   /* Logo shield trim gold */
  --gold-dim:      rgba(242, 156, 4, 0.15);

  --text-primary:   #F0F0F0;
  --text-secondary: #9a9a9a;
  --text-muted:     #555555;

  --border:         #1e1e1e;
  --border-strong:  #2a2a2a;

  --success:        #22c55e;
  --error:          #ef4444;
  --warning:        #F29C04;
}
```

White (`#FFFFFF`) banned on public site. No light mode.

### Typography (final)

- **Orbitron** (900) - hero "VEGAVATH" title only, and the mobile nav overlay. Nowhere else.
- **Chakra Petch** (400/600/700) - section headings, card titles, navbar, page hero titles.
- **Space Grotesk** (400/500/600) - subheadings, labels, body text, form elements.
- **Space Mono** (400/700) - stats numbers, technical micro-labels, dates.

### Border radius policy

Primary cards/buttons: `0` (sharp). Secondary buttons: `2px`. Form inputs: `4px`. Avatars/sponsor logos: `0`. **Banned:** `rounded-full`, `rounded-xl`, `rounded-2xl` on any interactive element.

### Known Tailwind v4 bug

`mx-auto` and some responsive-prefix classes don't generate CSS in this project's Tailwind v4 setup. Use `style={{ margin: "0 auto" }}` for centering instead. This is documented, reproducible behavior - not something to "fix" by downgrading Tailwind or hunting for a CSS bug elsewhere.

**Full per-page design spec (hero copy, component-by-component layout, animation rules, sponsor carousel fix, per-route breakdown for `/`, `/about`, `/events`, `/events/[slug]`, `/gallery`, `/crew`, `/join`, `/admin`) lives in `context_for_revamp.md` Sections 5–9. Read it in full - it is not duplicated here to avoid the two docs drifting out of sync.**

---

## 10. Known Landmines - Consolidated (statuses updated 2026-07-15)

1. **Tailwind v4 centering bug** - STILL TRUE. See Section 9. Not a bug to fix; a documented workaround to follow.
2. **R2 bucket structure mismatch** - STILL TRUE. See Section 5.2. Trust the live bucket listing, not the PDF.
3. **`/events` images not rendering from R2** - RESOLVED during the revamp (admin upload flow wired; event covers upload and render).
4. **Admin CRUD incomplete** - RESOLVED. Upload is wired throughout the admin panel (events, team incl. per-row quick photo upload, multi-file gallery).
5. **Auth crash** - FIXED in S9 (`instanceof AuthError` in prod was the real culprit; bcrypt compares are also wrapped).
6. **`PageTransition`** - MOUNTED in S2.
7. **Env var naming** - RESOLVED. The README env block now uses the `R2_*` names the code always used.
8. **`sponsors.tier` enum discrepancy** - RESOLVED: live enum is `premium | community` (see 7.4).
9. **`.glb` model** - confirmed and wired: the 3D kart renders on all viewports (KartModelWrapper; the mobile placeholder was removed deliberately - do not reintroduce it).
10. **`payments/` folder** - STILL TRUE. Reference-only, event-payment-help screenshots. See Section 5.3. Do not repurpose, do not surface elsewhere, do not reorganize.
11. **Font stack superseded** - STILL TRUE. Use Orbitron/Chakra Petch/Space Grotesk/Space Mono only; ignore any earlier Bebas Neue/Rajdhani/DM Sans references found in old chat logs.
12. **`RacingCursor`** - STILL TRUE. Confirmed live and working (custom orange-circle cursor, opt-in via `CursorToggle`, disables on touch). It is also the sole authorized exception to the no-circular-radii design gate.
13. **No prior-session memory** - STILL TRUE, with one improvement: `docs/revamp-log.md` now records every session's verified changes, so check it (and `docs/planning-agent-briefing.md`) before this doc. Section 0.2's verification steps remain mandatory.

---

## 11. Build Order For This Revamp (HISTORICAL - all sessions complete)

The original 8-session plan below grew to **29 sessions**, all logged in `docs/revamp-log.md`. Full detail in `context_for_revamp.md` Section 10; summarized here for continuity with the backend architecture:

1. **Session 0 - Context load + verification.** Read this doc, `context_for_revamp.md`, `README.md`, `Handoff.md`, `AGENTS.md`, `tasks.md`. Run all of Section 0.2's verification steps. Do not skip this because the docs "seem complete" - they disagree with each other in places documented above, and none of them have been checked against the live repo/DB/R2 in this session.
2. **Session 1** - Design tokens + fonts (`globals.css`, `layout.tsx`).
3. **Session 2** - Navbar, Footer, mount `PageTransition`, fix the auth try/catch.
4. **Session 3** - Home page.
5. **Session 4** - About page.
6. **Sessions 5–8** - Events → Crew → Join → Gallery/Sponsors → Admin fixes (auth crash, events/team image upload wiring, diagnose `/events` image-loading bug).

Gate after every session: `npm run build` passes with 0 TypeScript errors, no emoji in JSX, no `rounded-full`/`rounded-xl` on interactive elements, correct font usage per Section 9, mobile layout correct at 375px, no `mx-auto`.

---

## 12. Production Readiness Notes (from original doc, still applicable, unchanged)

- ISR handles read load; only `/join` and `/events/[slug]` hit Neon per-request.
- No N+1 queries; no heavy joins (sponsor data denormalized into `events.sponsors` JSONB).
- Thumbnail strategy: card/grid images capped ~800px WebP; lightbox/full-view keeps original resolution.
- R2 objects are immutable - `Cache-Control: public, max-age=31536000, immutable`. Replace via new filename, never overwrite.
- Every async server component fetching from Neon needs an error boundary with a degraded UI (e.g., "Events coming soon" rather than a crash) - verify this convention is still followed as you touch each page during the revamp.
- Admin API routes: session check first, before any DB operation; `Cache-Control: no-store`.
- R3F kart model: dynamic import with `ssr: false`, Suspense fallback, static image fallback for low-end devices.

---

## 13. Post-Revamp Additions (Sessions 9-29, summarized 2026-07-15)

What exists now that this document never anticipated. One line each; the
revamp-log entry for the named session has the full detail.

**Auth & admin platform**
- Multi-admin accounts (S27): DB `admin_accounts` checked first in
  `authorize()`, undeletable env godfather fallback, role → `isGodfather`
  in the JWT/session. Named one-time invite links
  (`/admin/invite/[name]/[token]`, 48h, godfather approves registrations
  in `/admin/accounts`).
- Password resets (S29): godfather-issued one-time links
  (`/admin/[username]/credentials/[token]`, 2h); a reset bumps
  `token_version`, which the jwt callback re-validates on refresh -
  invalidating every live session for that account.
- Login audit log (S21) + DB-backed per-IP rate limiting, 5 fails / 15 min
  (S29).
- Middleware (S29): matcher covers all non-static paths; token-gated public
  pages are explicitly exempted; `NEXT_PUBLIC_MAINTENANCE_MODE=true`
  rewrites the public site to a static `/maintenance` page while /admin and
  /api stay reachable.

**Join / applications pipeline**
- 4-step application form with up to 3 domain picks (FY26 domain set),
  apply-once cookie, honeypot (S17-S19).
- Admin pipeline: status flow, interview groups A-D, bulk status, RFC 4180
  CSV export (S19, S28).

**Bootstrap stall-status system (S23-S26)**
- A third surface beside public/admin: `/bootstrap` volunteer dashboard
  (own HttpOnly cookie auth, 4s polling, claim/queue/release with SQL-level
  guards, hardcoded SVG campus map, freed-stall notifications, queue wait
  timers) and `/admin/bootstrap` (sessions, credential generation with
  CSPRNG passwords, overrides, per-volunteer stall suggestions).
- Deliberately its own visual system (`BS` palette); the ONLY part of the
  site where rounded corners are allowed.

**Content & misc**
- Milestones ("Road So Far"): DB-backed About timeline with a
  drag-to-reorder admin editor (S27, S29).
- Favicon generated at build time by `src/app/icon.tsx` (S21); 404 page has
  a playable canvas F1 game (S16-S22); team CSV bulk import (S15); gallery
  multi-file upload (S16).
- **Migrations 001-012 are ALL applied to Neon as of 2026-07-15.** New
  schema changes still go through numbered files applied manually by the
  owner before dependent code deploys.

---

*End of consolidated architecture reference. If you find this document itself has drifted from reality by the time you read it, trust the live repo/DB/R2 over this doc (Section 0.1), and - if you're a human maintainer - please update this file rather than starting a seventh parallel source of truth.*
