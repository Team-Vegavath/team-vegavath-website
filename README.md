# Team Vegavath Official Website

_Last updated: Session 38 (July 2026)_

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
| CI/CD      | GitHub Actions                                 |
| Deployment | Vercel                                         |

## Features

- **Homepage** - Speed-lines hero, interactive 3D go-kart viewer (all viewports, tap-to-interact on mobile), rotating stats ticker, six-domain grid (click a tile for a detail modal), events preview, sponsor marquee, join CTA
- **About** - Team story, domain grid, sponsors, journey timeline
- **Events** - Filter by category, event detail pages with media lightbox and YouTube embeds
- **Gallery** - Masonry grid with lightbox, filter by event, YouTube video support
- **Crew** - Core, Crew, and Legacy tier display with member cards
- **Sponsors** - Premium and community partner tiers
- **Join** - 4-step application form (personal info → up to 3 domain picks → motivation → experience), honeypot anti-spam, apply-once cookie, closed state when recruitment is off
- **Legal** - Privacy policy and terms of service
- **404** - Playable canvas F1 mini-game
- **Maintenance mode** - `NEXT_PUBLIC_MAINTENANCE_MODE=true` rewrites every public route to a static `/maintenance` page (admin and API stay reachable)
- **Bootstrap** - Standalone live event-day system for the Bootstrap showcase. Volunteers self-register at `/bootstrap/register/{stall,group}` (username = SRN, plaintext login code - no CSVs); the `/bootstrap` dashboard (own cookie auth) has a simple OCCUPIED/FREE toggle for stall volunteers and a full dashboard for group leads (SVG campus map, claim/queue/release, freed-stall notifications, queue wait timers, classroom mode, and a per-lead visitor check-in QR). Visitors check in via that QR (`/bootstrap/checkin/[token]`) and submit a 5-question feedback form at `/bootstrap/feedback`. The `/admin/bootstrap` console manages sessions (2-step create that shows the self-registration URLs), overrides, stall suggestions, visitor/group tables, and a feedback summary with an AI (Gemini) leadership summary
- **Admin Panel** - Full CRUD for events, team (CSV bulk import + per-row quick photo upload), gallery (multi-file R2 upload), sponsors, site settings, milestones (drag-to-reorder "Road So Far" timeline), and application management (filter tabs, status pipeline, interview groups A-D, bulk status, CSV export, delete)
- **Multi-admin accounts** - DB-backed admin accounts alongside an undeletable env "godfather" account: named invite links (`/admin/invite/[name]/[token]`, 48h, godfather-approved), godfather-issued password reset links (2h, single-use, invalidates all live sessions via token_version), login rate limiting (5 fails per IP per 15 min) and a login audit log on the dashboard

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

- Node.js 18+
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

# AI (Bootstrap feedback summary)
GEMINI_API_KEY=        # server-side; feedback-summary route returns 503 if unset

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

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Public pages
│   │   ├── page.tsx       # Homepage
│   │   ├── about/
│   │   ├── events/
│   │   ├── gallery/
│   │   ├── crew/
│   │   ├── sponsors/
│   │   ├── join/
│   │   └── legal/
│   ├── (admin)/           # Admin panel (middleware-protected)
│   │   └── admin/
│   │       ├── dashboard/ # incl. recent-logins audit table
│   │       ├── events/
│   │       ├── team/
│   │       ├── gallery/
│   │       ├── sponsors/
│   │       ├── applications/
│   │       ├── milestones/
│   │       ├── accounts/
│   │       ├── bootstrap/
│   │       └── settings/
│   ├── admin/             # PUBLIC token-gated pages (no AdminShell):
│   │   ├── invite/[name]/[token]/          # admin registration via invite
│   │   └── [username]/credentials/[token]/ # password reset
│   ├── bootstrap/         # Volunteer stall dashboard (own cookie auth)
│   ├── maintenance/       # Static maintenance page
│   └── api/               # API routes (re-check admin session themselves)
├── components/
│   ├── layout/            # Navbar, Footer, PageTransition, RacingCursor
│   ├── ui/                # Reveal, Container, shared primitives
│   ├── home/              # KartModel, DomainGrid, StatsTicker, EventsPreview, KartGame
│   ├── events/            # EventsClient, EventMediaClient
│   ├── gallery/           # GalleryClient
│   ├── join/              # JoinClient
│   ├── sponsors/          # SponsorMarquee
│   ├── bootstrap/         # StallCard/Grid, dashboards, login, campus map SVG
│   └── admin/             # AdminShell, forms, tables, ApplicationsTable
├── lib/
│   ├── db.ts              # Neon DB connection
│   ├── auth.ts            # NextAuth config (DB accounts + env godfather)
│   └── services/          # ALL SQL lives here - pages/routes call these
└── types/                 # TypeScript types
migrations/                # Numbered SQL files, applied to Neon manually
```

## Database Schema

```sql
events               - id, title, slug, category, status, description, event_date, cover_image_url, registration_open
team_members         - id, name, role, tier (core|crew|legacy), domain, photo_url, quote, linkedin_url, display_order
gallery_items        - id, event_id, event_label, type (image|video), url, thumbnail_url, caption
sponsors             - id, name, logo_url, website_url, description, tier (premium|community)
applications         - id, name, email, domain_interest (+_2, _3), portfolio_url, mobile_number,
                       srn_prn, semester, why_join, value_addition, domain_experience,
                       design_portfolio_url, status, interview_group (A-D), submitted_at
site_settings        - key, value (recruitment_open, contact_email, social URLs, etc.)
milestones           - id, date_label, title, description, sort_order ("Road So Far" timeline)
admin_accounts       - id, username, password_hash, display_name, mobile_number,
                       role (admin|godfather), token_version
admin_invite_tokens  - one-time invite links (48h expiry, pending_* registration fields,
                       status pipeline generated → pending_approval → approved/rejected,
                       invitee_name/invitee_slug for the URL)
admin_password_reset_tokens - one-time reset links (2h expiry, single-use)
admin_login_log      - attempted_at, success, ip_address, user_agent, device_hint
bootstrap_sessions   - Bootstrap event sessions (is_active, stall count, max_group_size)
bootstrap_stalls     - status (free|occupied|queued), claimed_by, queued_by, queued_at,
                       map_x/map_y (percent coords on the SVG campus map), lead_names
bootstrap_volunteers - self-registered accounts: role (stall|lead), srn (= username),
                       login_code (plaintext), current_session_token, checkin_token,
                       group_number, in_classroom, suggested_stall_id
bootstrap_groups     - visitor groups per session (A, B, C..., capped by max_group_size)
bootstrap_visitors   - checked-in visitors (name, prn, phone, optional group_id)
bootstrap_feedback   - visitor feedback: overall_rating (1-10), rating (per-stall 1-5),
                       join_likelihood (1-5), memorable_stall, suggestions
```

Application status pipeline: `pending → shortlisted → interview → selected / rejected` (legacy `reviewed` / `accepted` still valid). Schema changes are recorded as numbered files in `migrations/` and applied to Neon manually - never automatically. Migrations 001-017 are all applied as of Session 38.

## Media Storage (Cloudflare R2)

```
vegavath-media/
├── gallery/         # Event photos
├── team/            # Member photos (core/, crew/, legacy/)
├── sponsors/        # Sponsor logos
├── icons/           # Logo, social icons
└── models/          # 3D models (vegavath-gokart.glb)
```

R2 serves immutable cache headers - object keys are never overwritten; new uploads always get a fresh timestamped filename.

## Admin Panel

Access at `/admin`. Auth is NextAuth v5 credentials: DB-backed `admin_accounts` are checked first, then the undeletable env "godfather" account. Protected twice: middleware plus a session re-check inside every admin API route. Login is rate limited and every attempt is logged.

Features:

- Manage events (create, edit, archive, delete)
- Manage team members (all tiers) + CSV bulk import + per-row quick photo upload
- Multi-file gallery upload to R2
- Manage sponsors
- Site settings (recruitment toggle, social links, contact info)
- Application management: filter by status or interview group, expand rows for full detail, advance the status pipeline, assign interview groups A-D, bulk status updates, CSV export, delete
- Milestones: drag-to-reorder timeline editor feeding the About page
- Accounts (godfather only): generate named invite links, approve/reject registrations, issue password reset links, delete accounts
- Bootstrap: create/activate stall sessions (2-step create shows the self-registration URLs), live dashboard with overrides, stall suggestions, visitor/group tables, and a feedback summary with an AI (Gemini) leadership summary

## Known Issues & Notes

- Tailwind v4 `mx-auto` and some responsive prefix classes do not generate CSS in this setup - centering always uses inline `style={{ margin: "0 auto" }}`
- Neon free tier suspends after 5 min inactivity - first request after suspension takes 2-5 seconds to wake
- The Neon DB and R2 bucket are live production - there is no staging environment
- All migrations (001-017) are applied to Neon as of Session 38; future schema changes still go through numbered files in `migrations/`, applied manually before the code that depends on them is deployed

---

Built by Team Vegavath

Based on a custom license. Please check the license file for permissions.
