# Team Vegavath

Official website for Team Vegavath, the PESU ECC (PES University Electric Racing / Motorsports) student club. The site combines public-facing pages, a protected admin panel, and a "Bootstrap" event-day volunteer operations system.

## What it does

- **Public site** -- home, about, crew, events, gallery, sponsors, and a join/apply flow for prospective members.
- **Admin panel** -- authenticated dashboard to manage events, crew, sponsors, gallery, applications, and site settings. Admin API routes re-check the session and admin status inside each route.
- **Bootstrap system** -- an event-day ops tool for volunteers: session logins, stall management, attendee registration, check-in QR overlays, and feedback collection.

## Tech stack

- **Framework:** Next.js 16.1.7 (App Router), React 19.2, TypeScript (strict).
- **Styling:** Tailwind CSS v4, Framer Motion.
- **3D:** React Three Fiber, Drei, Three.js.
- **Data:** Neon Postgres via `@neondatabase/serverless`; all SQL lives in `src/lib/services/*.ts`.
- **Storage:** Cloudflare R2 (S3-compatible) for images and media.
- **Auth:** NextAuth v5 (beta) with bcryptjs.
- **Deploy:** Vercel.

Project version: 0.1.0.

## Layout

- `src/app/` -- routes: `(public)`, `(admin)`, `admin`, `api`, `bootstrap`, `maintenance`.
- `src/lib/` -- `auth.ts`, `db.ts`, `r2.ts`, `utils.ts`, plus `services/` and `utils/`.
- `src/components/` -- grouped by feature (about, admin, bootstrap, crew, events, gallery, home, join, layout, sponsors, ui).

## Documentation

- [Architecture](/docs/architecture)
- [Deployment Guide](/docs/deployment)
- [All Routes](/docs/routes)
- [Database Schema](/docs/database)
- [Bootstrap System](/docs/bootstrap)
- [Admin System](/docs/admin)
