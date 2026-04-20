# Team Vegavath Official Website

The official website for Team Vegavath - the student innovation club of PES University, Electronic City Campus (PESU ECC). Built with Next.js 16 App Router, featuring a mobile-first design, 3D kart model viewer, and a full admin panel.

## Tech Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Framework  | Next.js 16.1.7 App Router + TypeScript strict |
| Styling    | Tailwind CSS v4                               |
| Animations | Framer Motion                                 |
| 3D         | React Three Fiber + Drei                      |
| Database   | Neon Postgres                                |
| Media/CDN  | Cloudflare R2                                 |
| Auth       | NextAuth.js v5 beta                           |
| CI/CD      | GitHub Actions                                |
| Deployment | Vercel                                        |

## Features

- **Homepage** - Hero with 3D interactive go-kart model (desktop), domain pills, events preview, sponsors marquee, join banner
- **About** - Team info, mission, domains, sponsors carousel, journey timeline, values
- **Events** - Filter by category (Workshops, Hackathons, Competitions, Talks), event detail pages with media lightbox
- **Gallery** - Masonry grid with lightbox, filter by event, YouTube video support
- **Crew** - Core, Crew, and Legacy tier display with member cards
- **Sponsors** - Premium and community partner tiers
- **Join** - Recruitment form (when open) with DB storage, closed state when recruitment is off
- **Legal** - Privacy policy and terms of service
- **Admin Panel** - Full CRUD for events, team, gallery, sponsors, settings, applications

## Design System

```
Background:   #121212   Card: #1a1a1a   Elevated: #222222
Text Primary: #EBEBEB   Secondary: #9a9a9a   Muted: #666666
Accent:       #EF5D08 (Cayenne Red)
Accent Hover: #d44f06
Accent 2:     #F29C04 (Golden Orange)
Border:       #2a2a2a
```

Dark-first. No light mode.

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
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=
ADMIN_USERNAME=
ADMIN_PASSWORD=

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=vegavath-media
CLOUDFLARE_R2_PUBLIC_URL=https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev
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
│   ├── (admin)/           # Admin panel (protected)
│   │   └── admin/
│   │       ├── dashboard/
│   │       ├── events/
│   │       ├── team/
│   │       ├── gallery/
│   │       ├── sponsors/
│   │       └── settings/
│   └── api/               # API routes
├── components/
│   ├── layout/            # Navbar, Footer, Cursor
│   ├── home/              # Hero, KartModel, HeroDomains
│   ├── about/             # AboutHeroImage
│   ├── events/            # EventsClient, EventMediaClient
│   ├── gallery/           # GalleryClient
│   ├── join/              # JoinClient
│   └── admin/             # All admin components
├── lib/
│   ├── db.ts              # Neon DB connection
│   ├── auth.ts            # NextAuth config
│   └── services/          # DB service functions
└── types/                 # TypeScript types
```

## Database Schema

```sql
events         - id, title, slug, category, status, description, event_date, cover_image_url, registration_open
team_members   - id, name, role, tier (core|crew|legacy), domain, photo_url, quote, linkedin_url
gallery_items  - id, event_id, event_label, type (image|video), url, thumbnail_url, caption
sponsors       - id, name, logo_url, website_url, description, tier (premium|community)
applications   - id, name, email, domain_interest, portfolio_url, status
site_settings  - key, value (recruitment_open, contact_email, social URLs, etc.)
```

## Media Storage (Cloudflare R2)

```
vegavath-media/
├── gallery/         # Event photos
├── team/            # Member photos (core/, crew/, legacy/)
├── sponsors/        # Sponsor logos
├── icons/           # Logo, social icons
└── models/          # 3D models (vegavath-gokart.glb)
```

## Admin Panel

Access at `/admin` with credentials stored in environment variables.

Features:

- Manage events (create, edit, archive, delete)
- Manage team members (all tiers)
- Upload gallery images to R2
- Manage sponsors
- Site settings (recruitment toggle, social links, contact info)
- View applications

## Known Issues & Notes

- Tailwind v4 `mx-auto` and responsive prefix classes do not generate CSS in this setup - all centering uses inline styles or `@utility` blocks in globals.css
- 3D kart model is desktop-only (mobile shows placeholder)
- Neon free tier suspends after 5 min inactivity - first request after suspension takes 2-5 seconds to wake

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android)

---

Built with 💖 by Team Vegavath

Based on a custom License. Please check license file on permissions.
