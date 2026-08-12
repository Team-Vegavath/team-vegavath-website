# Team Vegavath

_Current as of Session 72D (2026-08-12)._

Official website for Team Vegavath, the motorsport and innovation student club at PES University Electronic City Campus (PESU ECC), Bangalore. Live at [vegavath.live](https://vegavath.live). The site combines public-facing pages, a protected admin panel, a "Bootstrap" event-day volunteer operations system, and this in-app documentation site.

## What it does

- **Public site** -- home, about, crew, events, gallery, sponsors, a blog at `/posts`, an F1 stats section, per-project build pages at `/projects`, and a join/apply flow for prospective members.
- **Admin panel** -- authenticated dashboard to manage events, crew, sponsors, gallery, posts, applications, milestones, accounts and site settings. Admin API routes re-check the session and admin status inside each route, even though middleware also guards `/admin`.
- **Bootstrap system** -- an event-day ops tool for volunteers: session logins, stall management, attendee registration, check-in QR overlays, and feedback collection.
- **Docs site** -- `/docs` renders these files in-app, behind a shared-password cookie gate.

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

- `src/app/` -- routes: `(public)`, `(admin)`, `admin`, `api`, `bootstrap`, `docs`, `maintenance`.
- `src/lib/` -- `auth.ts`, `db.ts`, `r2.ts`, `utils.ts`, plus `services/` and `utils/`.
- `src/components/` -- grouped by feature (about, admin, bootstrap, crew, docs, events, f1, gallery, home, join, layout, legal, posts, sponsors, ui).
- `src/types/` -- shared types and constants. Client components import constants from here, never from `services/`: a value import drags the Neon driver into the browser bundle.

## Documentation

Guides:

- [Architecture](/docs/architecture)
- [Deployment Guide](/docs/deployment)
- [All Routes](/docs/routes)
- [Database Schema](/docs/database)
- [Bootstrap System](/docs/bootstrap)
- [Admin System](/docs/admin)

File-by-file reference:

- [Bootstrap Components](/docs/files-bootstrap-components)
- [Admin Components](/docs/files-admin-components)
- [Public Components](/docs/files-public-components)
- [Pages](/docs/files-pages)
- [API Routes](/docs/files-api)
- [Middleware & Config](/docs/files-middleware)

The nav order for these pages is defined in `src/lib/docs-config.ts`. Adding a
file to `docs/wiki/` does not surface it ∙ it has to be registered there too.
