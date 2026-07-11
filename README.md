# Team Vegavath Official Website

The official website for Team Vegavath - the student innovation club of PES University, Electronic City Campus (PESU ECC). A dark, editorial, motorsport-inspired public site plus a full password-protected admin panel, rebuilt end-to-end in the 2026-07 frontend revamp (see `docs/revamp-log.md` for the session-by-session record).

## Tech Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Framework  | Next.js 16.1.7 App Router + TypeScript strict |
| Styling    | Tailwind CSS v4 + design tokens in globals.css |
| Animations | Framer Motion                                 |
| 3D         | React Three Fiber + Drei                      |
| Database   | Neon Postgres (serverless HTTP driver)        |
| Media/CDN  | Cloudflare R2                                 |
| Auth       | NextAuth.js v5 beta (credentials, bcrypt)     |
| CI/CD      | GitHub Actions                                |
| Deployment | Vercel                                        |

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
- **Admin Panel** - Full CRUD for events, team (incl. CSV bulk import), gallery (multi-file R2 upload), sponsors, site settings, and application management (filter tabs, status pipeline, delete)

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

Create a `.env.local` file in the root (canonical list: Handoff.md §10):

```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=   # bcrypt hash, not the plain password

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

Visit `http://localhost:3000`

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
│   │       ├── dashboard/
│   │       ├── events/
│   │       ├── team/
│   │       ├── gallery/
│   │       ├── sponsors/
│   │       ├── applications/
│   │       └── settings/
│   └── api/               # API routes (re-check admin session themselves)
├── components/
│   ├── layout/            # Navbar, Footer, PageTransition, RacingCursor
│   ├── ui/                # Reveal, Container, shared primitives
│   ├── home/              # KartModel, DomainGrid, StatsTicker, EventsPreview, KartGame
│   ├── events/            # EventsClient, EventMediaClient
│   ├── gallery/           # GalleryClient
│   ├── join/              # JoinClient
│   ├── sponsors/          # SponsorMarquee
│   └── admin/             # AdminShell, forms, tables, ApplicationsTable
├── lib/
│   ├── db.ts              # Neon DB connection
│   ├── auth.ts            # NextAuth config
│   └── services/          # ALL SQL lives here - pages/routes call these
└── types/                 # TypeScript types
migrations/                # Numbered SQL files, applied to Neon manually
```

## Database Schema

```sql
events         - id, title, slug, category, status, description, event_date, cover_image_url, registration_open
team_members   - id, name, role, tier (core|crew|legacy), domain, photo_url, quote, linkedin_url, display_order
gallery_items  - id, event_id, event_label, type (image|video), url, thumbnail_url, caption
sponsors       - id, name, logo_url, website_url, description, tier (premium|community)
applications   - id, name, email, domain_interest (+_2, _3), portfolio_url, mobile_number,
                 srn_prn, semester, why_join, value_addition, domain_experience,
                 design_portfolio_url, status, submitted_at
site_settings  - key, value (recruitment_open, contact_email, social URLs, etc.)
```

Application status pipeline: `pending → shortlisted → interview → selected / rejected` (legacy `reviewed` / `accepted` still valid). Schema changes are recorded as numbered files in `migrations/` and applied to Neon manually - never automatically.

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

Access at `/admin` with credentials stored in environment variables. Protected twice: middleware on the route group plus a session re-check inside every admin API route.

Features:

- Manage events (create, edit, archive, delete)
- Manage team members (all tiers) + CSV bulk import
- Multi-file gallery upload to R2
- Manage sponsors
- Site settings (recruitment toggle, social links, contact info)
- Application management: filter by status, expand rows for full detail, advance the status pipeline, delete

## Known Issues & Notes

- Tailwind v4 `mx-auto` and some responsive prefix classes do not generate CSS in this setup - centering always uses inline `style={{ margin: "0 auto" }}`
- Neon free tier suspends after 5 min inactivity - first request after suspension takes 2-5 seconds to wake
- The Neon DB and R2 bucket are live production - there is no staging environment
- Migrations 003-005 (multi-domain applications, FY26 join fields, status pipeline) must be applied to Neon **in order, before** deploying code that depends on them

---

Built by Team Vegavath

Based on a custom license. Please check the license file for permissions.
