# Vegavath Website — Agent Instructions

This file is read by AI coding assistants (GitHub Copilot, etc).
Follow these rules exactly. Do not improvise structure.

## Stack

- Next.js 16 App Router + TypeScript (strict mode)
- Tailwind CSS v4
- Framer Motion (UI transitions only)
- React Three Fiber + Drei (3D kart model)
- Neon (Postgres) via @neondatabase/serverless
- Cloudflare R2 via @aws-sdk/client-s3
- NextAuth.js v5 (admin auth)

## Folder Structure — Do Not Deviate

src/
  app/
    (public)/         # public routes
    (admin)/          # admin routes
    api/              # API routes only
  components/
    layout/           # Navbar, Footer, Cursor
    home/             # Home page sections
    about/            # About page sections
    events/           # Event cards, filters
    gallery/          # Masonry, lightbox
    crew/             # Member cards
    sponsors/         # Marquee, sponsor cards
    join/             # Application form
    admin/            # Admin UI panels
    ui/               # Shared primitives: Button, Modal, Skeleton
  lib/
    db.ts             # Neon connection only
    r2.ts             # R2 client only
    auth.ts           # NextAuth config only
    utils.ts          # Shared utilities
    services/         # ALL database query logic lives here
      events.ts
      team.ts
      gallery.ts
      sponsors.ts
      applications.ts
      settings.ts
  types/              # TypeScript interfaces only
    event.ts
    member.ts
    gallery.ts
    sponsor.ts
    settings.ts
  middleware.ts       # Admin route protection only

## Non-Negotiable Rules

### ALWAYS

- TypeScript strict mode. Every prop typed. No implicit any.
- Server Components fetch data. Client Components handle interactivity only.
- All images use next/image with R2 URLs. Never `<img>` tags.
- All DB logic goes in src/lib/services/. API routes call service functions.
- All list queries use LIMIT. Gallery default 30, events default 20.
- Error boundaries on every async server component.
- Skeleton loading states for all DB-fetched sections.
- Mobile-first CSS — 375px first, scale up.
- ISR (revalidate: 60) for public pages except /join and /events/[slug].
- SSR only for /join, /events/[slug], and all /admin/* routes.

### NEVER

- ignoreBuildErrors or ignoreDuringBuilds in next.config.ts
- Binary files (images, videos) committed to git
- Plaintext passwords or secrets in code or commits
- Raw SQL in API routes — use services/ layer
- Admin API routes without session verification
- force-dynamic on root layout
- Unbounded SELECT queries without LIMIT
- Duplicate business logic between public and admin routes
- `<img>` tags — always next/image
- Inline styles — always Tailwind classes

## Build Order (do not skip steps)

1. DB schema + indexes (src/lib/db.ts + migrations/)
2. Services layer (src/lib/services/)
3. API routes (src/app/api/)
4. Auth + middleware (src/lib/auth.ts + src/middleware.ts)
5. UI components and pages (last)

## Rendering Strategy

- ISR revalidate:60 → /, /about, /events, /gallery, /crew, /sponsors
- ISR revalidate:120 → static-heavy pages
- SSR (no cache) → /join, /events/[slug], /admin/*
- Static → 404, error pages

## Services Layer Contract

API routes and pages NEVER write SQL directly.
They call functions from src/lib/services/*.ts only.
If two routes need the same data, they call the same service function.
