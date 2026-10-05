# Team Vegavath Official Website

The official website for Team Vegavath - the student innovation club of PES University, Electronic City Campus (PESU ECC). A dark, editorial, motorsport-inspired public site plus a protected admin panel, built end-to-end. Deployed on the **teamvegavath** Vercel account and live at **[vegavath.live](https://vegavath.live)**.

## Tech Stack

| Layer      | Technology                                     |
| ---------- | ---------------------------------------------- |
| Framework  | Next.js 16.1.7 App Router + TypeScript strict  |
| Styling    | Tailwind CSS v4 + design tokens in globals.css |
| Animations | Framer Motion                                  |
| 3D         | React Three Fiber + Drei                       |
| Database   | Neon Postgres (serverless HTTP driver)         |
| Media/CDN  | Cloudflare R2                                  |
| Auth       | NextAuth.js v5 beta (credentials, bcrypt)      |
| Exports    | googleapis (Google Sheets, service account)    |
| Tests      | Vitest (pure utility modules)                  |
| CI/CD      | GitHub Actions (type check + lint)             |
| Deployment | Vercel                                         |

## Features

- **Homepage** - Speed-lines hero, an optional announcement banner managed from the admin panel (separate desktop and mobile images, optional CTA), interactive 3D go-kart viewer (all viewports, tap-to-interact on mobile), rotating stats ticker, six-domain grid of flip cards (click a card to turn it over for the description), projects teaser, events preview, sponsor marquee, join CTA
- **About** - Team story, domain grid, sponsors, journey timeline
- **Events** - Filter by category, event detail pages with media lightbox and YouTube embeds, plus a native registration form at `/events/[slug]/register` for hackathons and competitions (replaced the old external Google Form link)
- **Posts** - Blog at `/posts` and `/posts/[slug]`. Category filter is a URL param so each category is its own linkable, cacheable page; bodies are markdown, with optional source links for content cross-posted from LinkedIn
- **F1 Stats** - `/f1` (next race, driver and constructor standings, last race, calendar) plus `/f1/drivers`, `/f1/drivers/[driverId]`, `/f1/circuits`, `/f1/seasons`. The only part of the site that calls an external API (Jolpica, the maintained Ergast successor), behind an `f1_enabled` kill switch in admin settings that defaults to OFF
- **Gallery** - Masonry grid with lightbox, filter by event, YouTube video support
- **Crew** - Core, Crew, and Legacy tier display with member cards
- **Sponsors** - Premium and community partner tiers
- **Join** - 4-step application form: who you are (incl. SRN/PRN toggle and course) → up to 3 of five domains (Automotives, Robotics, Coding, Design & Social Media, Operations & Sponsorship, always shown and stored in that fixed order) → four general questions → the chosen domains' own question sets, with the recruitment process for the applicant's tracks. Questions, order and link rules come from one module (`src/lib/utils/joinQuestions.ts`) that the form and `/api/join` both validate against. Honeypot anti-spam, apply-once cookie, closed state when recruitment is off
- **Projects** - `/projects` index plus per-project pages (`/projects/kart`, `/projects/maze-solver`, `/projects/combat-bot`). The maze solver is an interactive BFS demo on a fixed 8x8 maze: pick start, goal and heading, watch the search and the path, and get the robot's command sequence
- **Docs** - `/docs` renders the project's own documentation in-app, behind a shared-password cookie gate (`DOCS_PASSWORD`)
- **Legal** - Privacy policy and terms of service
- **404** - Playable canvas F1 mini-game
- **Maintenance mode** - `NEXT_PUBLIC_MAINTENANCE_MODE=true` rewrites every public route to a static `/maintenance` page (admin and API stay reachable)
- **Bootstrap** - Standalone live event-day system for the Bootstrap showcase. Volunteers self-register at `/bootstrap/register/{stall,group}` while a session is live, or pre-register at the always-open `/bootstrap/register/pool` (username = SRN, plaintext login code - no CSVs). The `/bootstrap` dashboard (own cookie auth) gives stall volunteers their one assigned stall: they name each group that arrives and release it when it leaves, which writes a visit log; moving stalls is a switch request an admin approves. Group leads get the full dashboard: SVG campus map, a queue of waiting groups per stall, advisory placements from the admin, freed-stall notifications, classroom mode, their group's roster and headcount, a countdown for stalls with a time limit, a manual checklist backup, and a per-lead check-in QR. Visitors check in via that QR (`/bootstrap/checkin/[token]`), follow their group's checklist at `/bootstrap/checklist/[id]`, and leave a 5-question feedback form at `/bootstrap/feedback`. The `/admin/bootstrap` console manages sessions (2-step create with per-stall volunteer capacity, group capacity and time limit), live stall edits, overrides, group distribution, an end-of-event visit sweep, volunteer and group tables, the pool (CSV / Google Sheets export, bulk wipe), and a feedback summary with an AI (Gemini) leadership summary
- **Admin Panel** - Full CRUD for events (+ per-event registrations table), team (drag-to-reorder per tier, inline active toggle, CSV bulk import, per-row quick photo upload), posts, gallery (multi-file R2 upload, grouped by event with copyable URLs), sponsors, announcements, site settings, milestones (drag-to-reorder "Road So Far" timeline), a QR code tool, and application management (filter tabs, status pipeline, interview groups A-D, bulk status, the full new-form answers per applicant, CSV and Google Sheets export, delete). Editing an event, team member, sponsor or announcement opens a slide-in panel over the list
- **Multi-admin accounts** - DB-backed admin accounts alongside an undeletable env "godfather" account: named invite links (`/admin/invite/[name]/[token]`, 48h, godfather-approved), one reusable open viewer link (`/admin/register?token=...`, 30 days, still approved per person), godfather-issued password reset links (2h, single-use, invalidates all live sessions via token_version), login rate limiting (5 fails per IP per 15 min) and a login audit log on the dashboard
- **Viewer role** - A read-only admin tier. Viewers see every admin page and every GET route but cannot write: `session.user.isAdmin` means "may enter the panel" and stays true for viewers, while the separate `isViewer` flag gates writes in both the API routes and the UI

## Design System

All colors and fonts are tokens in `src/app/globals.css` - never hardcoded:

```
Backgrounds:  --bg-base #0a0a0a   --bg-surface #111111   --bg-card #161616   --bg-elevated #1d1d1d
Accent:       --accent #EF5D08 (Cayenne orange)   --accent-hover #d44f06   --gold #F29C04
Text:         --text-primary #F0F0F0   --text-secondary #9a9a9a   --text-muted #555555
Borders:      --border #1e1e1e   --border-strong #2a2a2a
Fonts:        Orbitron (display) · Chakra Petch (headings) · Space Grotesk (body) · Space Mono (data)
```

Aesthetic: sharp / dark / editorial. No emoji in UI, no rounded corners, no gradient text, no glows. Dark-first, no light mode.

## Getting Started

### Prerequisites

- Node.js 20+ (Next.js 16 needs 20.9 or newer; CI runs Node 24)
- npm

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=
ADMIN_USERNAME=        # the env "godfather" account
ADMIN_PASSWORD_HASH=   # bcrypt hash, not the plain password
ADMIN_DISPLAY_NAME=    # optional display name for the godfather account

# Ops
NEXT_PUBLIC_MAINTENANCE_MODE=   # "true" = public site rewrites to /maintenance
DOCS_PASSWORD=         # shared secret gating /docs. NOTE: /docs fails OPEN
                       # when this is unset -- the robots disallow is then
                       # the only layer left

# AI (Bootstrap feedback summary)
GEMINI_API_KEY=        # server-side; feedback-summary route returns 503 if unset

# Google Sheets export (applications + Bootstrap pool). Optional: unset means
# the Sheets buttons report "not configured"; the CSV exports never need it.
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=   # base64 of the service-account key JSON
GOOGLE_SHEETS_SPREADSHEET_ID=         # the sheet, shared with the service account

# Admin accounts
NEXT_PUBLIC_SHOW_VIEWER_INVITES=      # "true" ONLY in the prod Vercel project:
                                      # shows the open viewer link control

# Note: the F1 section needs no env var. It is gated by the f1_enabled row in
# site_settings, toggled from /admin/settings, and Jolpica needs no API key.

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=vegavath-media
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev
R2_PUBLIC_HOSTNAME=    # for next/image remotePatterns
```

### Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` or whichever the terminal shows, if your default port 3000 is busy.

### Build for Production

```bash
npm run build
npm run start
```

### Tests

```bash
npm test
```

Vitest over the pure modules in `src/lib/utils/` and `src/lib/maze/` (join questions, phone, SRN/PRN, link rules, export tables, group labels, the maze solver). No database, no network.

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Public pages
│   │   ├── page.tsx       # Homepage
│   │   ├── about/
│   │   ├── events/        # incl. [slug]/register (native sign-up form)
│   │   ├── posts/         # blog list + [slug]
│   │   ├── f1/            # F1 stats: drivers, circuits, seasons
│   │   ├── projects/      # index + kart, maze-solver, combat-bot
│   │   ├── gallery/
│   │   ├── crew/
│   │   ├── sponsors/
│   │   ├── join/
│   │   └── legal/
│   ├── (admin)/           # Admin panel (middleware-protected)
│   │   └── admin/
│   │       ├── dashboard/ # incl. recent-logins audit table
│   │       ├── events/
│   │       ├── posts/
│   │       ├── team/
│   │       ├── gallery/
│   │       ├── sponsors/
│   │       ├── announcements/ # homepage announcement slot
│   │       ├── applications/
│   │       ├── milestones/
│   │       ├── accounts/
│   │       ├── bootstrap/
│   │       ├── profile/
│   │       ├── qr/        # QR codes for public routes + Bootstrap feedback
│   │       └── settings/
│   ├── admin/             # PUBLIC token-gated pages (no AdminShell):
│   │   ├── invite/[name]/[token]/          # admin registration via invite
│   │   ├── register/                       # open viewer invite link
│   │   └── [username]/credentials/[token]/ # password reset
│   ├── bootstrap/         # Volunteer dashboard (own cookie auth), register,
│   │                      # checkin/[token], checklist/[id], feedback
│   ├── (docs)/docs/       # In-app documentation, password-gated
│   ├── docs/login/        # The docs password page
│   ├── maintenance/       # Static maintenance page
│   └── api/               # API routes (re-check admin session themselves)
├── components/
│   ├── layout/            # Navbar, Footer, PageTransition, RacingCursor
│   ├── ui/                # Reveal, Container, shared primitives
│   ├── home/              # KartModel, DomainGrid, StatsTicker, EventsPreview, KartGame,
│   │                      # AnnouncementBanner, ProjectsTeaser
│   ├── projects/          # MazeSolver, MazeGrid, useMazeSolver
│   ├── events/            # EventsClient, EventMediaClient, EventRegisterForm
│   ├── f1/                # F1Nav, F1Section, F1Table, F1Empty, F1Paused
│   ├── gallery/           # GalleryClient
│   ├── join/              # JoinClient
│   ├── sponsors/          # SponsorMarquee
│   ├── bootstrap/         # StallCard/Grid, dashboards, login, campus map SVG,
│   │                      # checklist, countdown
│   └── admin/             # AdminShell, AdminEditPanel, forms, tables
├── lib/
│   ├── db.ts              # Neon DB connection
│   ├── auth.ts            # NextAuth config (DB accounts + env godfather)
│   ├── utils.ts           # shared helpers incl. uploadToR2 (4 MB cap)
│   ├── utils/             # pure, tested: joinQuestions, phone, srn, links,
│   │                      # exportTables, group
│   ├── maze/              # maze solver logic (BFS, directions), tested
│   └── services/          # ALL SQL lives here - pages/routes call these
│                          # (f1.ts and googleExport.ts are the exceptions:
│                          #  they wrap external APIs, not the database)
└── types/                 # TypeScript types. Client components import
                           # constants from here, never from services/ -
                           # a value import drags the Neon driver into
                           # the browser bundle.
migrations/                # Numbered SQL files, applied to Neon manually
```

## Database Schema

```sql
events               - id, title, slug, category, status, description, event_date, cover_image_url, registration_open
team_members         - id, name, role, tier (core|crew|legacy), domain, photo_url, quote, linkedin_url, display_order
gallery_items        - id, event_id, event_label, type (image|video), url, thumbnail_url, caption
sponsors             - id, name, logo_url, website_url, description, tier (premium|community)
applications         - id, name, email, domain_interest (+_2, _3: Automotives, Robotics, Coding,
                       Social Media, Operations & Sponsorship; legacy values still valid),
                       mobile_number, srn_prn, semester, course, answers (JSONB, every
                       new-form answer; NULL = a pre-S81 row), status, interview_group
                       (A-D), submitted_at; portfolio_url, why_join, value_addition,
                       domain_experience, design_portfolio_url kept for old rows
event_registrations  - id, event_id, name, email, phone, srn, message, status, created_at
posts                - id, title, slug, body, excerpt, author, author_role, category
                       (motorsport|automotives|robotics), published, published_at,
                       source_url, source_label, thumbnail_url
site_settings        - key, value (recruitment_open, contact_email, social URLs,
                       maintenance_mode, f1_enabled, etc.)
milestones           - id, date_label, title, description, sort_order ("Road So Far" timeline)
announcements        - id, title, body, image_url_desktop, image_url_mobile, cta_label,
                       cta_href, is_active, display_order (homepage shows the first active)
admin_accounts       - id, username, password_hash, display_name, mobile_number,
                       role (admin|godfather|viewer), token_version
admin_invite_tokens  - invite links (named: 48h, one-time, invitee_name/invitee_slug;
                       open: 30d, reusable, is_open + pending_role='viewer'),
                       pending_* registration fields, status pipeline
                       generated → pending_approval → approved/rejected
admin_password_reset_tokens - one-time reset links (2h expiry, single-use)
admin_login_log      - attempted_at, success, ip_address, user_agent, device_hint
bootstrap_sessions   - Bootstrap event sessions (is_active, stall count, max_group_size)
bootstrap_stalls     - status (derived on read: free|occupied|queued), claimed_by,
                       max_occupancy (1-4), max_groups (1-10), time_limit_minutes,
                       map_x/map_y (percent coords on the SVG campus map), lead_names
bootstrap_volunteers - self-registered accounts: role (stall|lead), srn (= username),
                       login_code (plaintext), current_session_token, checkin_token,
                       group_number, in_classroom, suggested_stall_id,
                       preferred_stall_name, switch_requested_stall_id;
                       session_id NULL = pre-registration pool
bootstrap_groups     - visitor groups per session (A, B, C..., capped by max_group_size)
bootstrap_stall_queue  - groups waiting at a stall (queued_at; accepted_at for admin placements)
bootstrap_stall_visits - one row per group visit (arrived_at, left_at NULL = here now);
                       feeds the student checklist and the roster
bootstrap_visitors   - checked-in visitors (name, prn, phone, optional group_id)
bootstrap_feedback   - visitor feedback: overall_rating (1-10), rating (per-stall 1-5),
                       join_likelihood (1-5), memorable_stall, suggestions
```

Application status pipeline: `pending → shortlisted → interview → selected / rejected` (legacy `reviewed` / `accepted` still valid). Schema changes are recorded as numbered files in `migrations/` and applied to Neon manually ∙ never automatically.

Migration status: `001`-`031` are all applied (S82C). Full column detail is in `docs/wiki/database.md`. A new schema change means a new numbered file; applied migrations are history and are never edited in place.

## Media Storage (Cloudflare R2)

```
vegavath-media/
├── gallery/         # Event photos
├── team/            # Member photos (core/, crew/, legacy/)
├── sponsors/        # Sponsor logos
├── events/          # Event logos and covers
├── posts/           # Post thumbnails
├── announcements/   # Announcement images (desktop + mobile)
├── icons/           # Logo, social icons
└── models/          # 3D models (vegavath-gokart.glb)
```

R2 serves immutable cache headers - object keys are never overwritten; new uploads always get a fresh timestamped filename. Every admin upload goes through `uploadToR2` in `src/lib/utils.ts`, which refuses files over 4 MB before uploading (Vercel's request body limit is about 4.5 MB).

## Admin Panel

Access at `/admin`. Auth is NextAuth v5 credentials: DB-backed `admin_accounts` are checked first, then the undeletable env "godfather" account. Protected twice: middleware plus a session re-check inside every admin API route. Login is rate limited and every attempt is logged.

Three roles: **godfather** (undeletable, owns account management), **admin** (full write access), and **viewer** (read-only -- sees every page and every GET route, but every write route and every write control is gated behind the `isViewer` flag).

Features:

- Manage events (create, edit, archive, delete) + a per-event registrations table with a status dropdown
- Manage posts (markdown body, draft/publish, auto-slug on create only so published URLs stay stable)
- Manage team members (all tiers) + drag-to-reorder within a tier + inline active toggle + CSV bulk import + per-row quick photo upload
- Multi-file gallery upload to R2 (rows grouped by event, filename column, copy-URL button)
- Manage sponsors
- Announcements: one homepage slot (title, body, optional CTA, separate desktop and mobile images)
- Edit in place: EDIT on events, team, sponsors and announcements opens a slide-in panel over the list; "Add" keeps its own page
- QR codes for every public route and the Bootstrap feedback page, as SVG or PNG
- Site settings (recruitment toggle, maintenance mode, F1 stats kill switch, social links, contact info)
- Application management: filter by status or interview group, expand rows for full detail (course and every new-form answer, grouped by domain), advance the status pipeline, assign interview groups A-D (or auto-assign across panels), bulk status updates, CSV and Google Sheets export, delete
- Milestones: drag-to-reorder timeline editor feeding the About page
- Accounts (godfather only): generate named invite links (with an Admin/Viewer role choice), create/copy/revoke one reusable open viewer link, approve/reject registrations, issue password reset links, delete accounts
- Bootstrap: create/activate/rename stall sessions (2-step create shows the self-registration URLs, sets each stall's volunteer capacity, group capacity and time limit, and can import a stall list from a previous session), add or remove stalls and change group capacity on a live session, a pre-registered volunteer pool with manual and auto assignment plus CSV / Sheets export and a bulk wipe, live dashboard with overrides, group distribution, an end-of-event visit sweep, a per-group manual checklist, stall suggestions and switch-request approvals, and a feedback summary with an AI (Gemini) leadership summary

## Known Issues & Notes

- Tailwind v4 utilities DO generate here. The long-standing "`mx-auto` doesn't work in this setup" note was wrong: the class shipped but lost the cascade to globals.css's unlayered `* { margin: 0 }`, since unlayered CSS beats every `@layer`. That reset now sits in `@layer base` and the inline centering workarounds have been retired. Use `className="mx-auto"`. Around 447 globals.css rules are still unlayered, so a utility that silently does nothing is a cascade-layer loss, not a missing class
- Neon free tier suspends after 5 min inactivity ∙ first request after suspension takes 2-5 seconds to wake
- The Neon DB and R2 bucket are live production ∙ there is no staging environment
- Migrations go through numbered files in `migrations/`, applied to Neon manually before the code that depends on them is deployed
- Client components must only `import type` from `src/lib/services/*` ∙ a value import pulls `lib/db.ts` and the whole Neon driver into the browser bundle, where its module-level `DATABASE_URL` check throws. Shared constants live in `src/types/`. Spot check with `grep -rl "neondatabase" .next/static/chunks/` (must return nothing)
- There are exactly three outbound network dependencies, all deliberate. `src/lib/services/f1.ts` calls Jolpica for the F1 section: no API key, no cost, one choke-point helper that returns null on failure, and an `f1_enabled` setting that reads as OFF when the row is missing, so a failed seed can never silently start calling out. `src/lib/services/googleExport.ts` writes the applications and Bootstrap-pool exports to Google Sheets, only when an admin presses the button; it reports "not configured" when its env vars are missing, and the CSV exports never depend on it. The Bootstrap feedback summary route calls Google Gemini: it is gated on `GEMINI_API_KEY`, returns 503 when unset, and unlike f1.ts has no kill switch. A fourth egress point needs a deliberate decision
- `/docs` fails OPEN when `DOCS_PASSWORD` is unset (it logs a loud warning on every request; `robots.ts` disallowing `/docs` is then the only layer)
- The `/legal` retention policy is not yet enforced: nothing deletes applications after a cycle

---

Built by [@UltraBot05](https://github.com/UltraBot05) at Team Vegavath.

Based on a custom license. Please check the license file for permissions.
