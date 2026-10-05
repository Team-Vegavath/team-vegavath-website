# Team Vegavath

_Current as of Session 82C (2026-10-05). Migrations 001-031 are all applied._

Official website for Team Vegavath, the motorsport and innovation student club at PES University Electronic City Campus (PESU ECC), Bangalore. Live at [vegavath.live](https://vegavath.live). The site combines public-facing pages, a protected admin panel, a "Bootstrap" event-day volunteer operations system, and this in-app documentation site.

## What it does

- **Public site** -- home (with an admin-managed announcement slot), about, crew, events with native registration, gallery, sponsors, a blog at `/posts`, an F1 stats section, per-project build pages at `/projects` (including an interactive maze-solver demo), and a four-step `/join` application across five domains.
- **Admin panel** -- authenticated dashboard to manage events, team, sponsors, announcements, gallery, posts, applications (with CSV and Google Sheets export), milestones, QR codes, accounts and site settings. Three roles: godfather, admin, and a read-only viewer. Admin API routes re-check the session and admin status inside each route, even though middleware also guards `/admin`, and every mutating route refuses viewers.
- **Bootstrap system** -- an event-day ops tool: volunteer self-registration and a pre-registration pool, per-day volunteer logins, stall occupancy by group with a queue and per-stall capacity, a visit log that feeds each student's checklist, per-stall countdowns, QR check-in, and feedback with an AI summary.
- **Docs site** -- `/docs` renders these files in-app, behind a shared-password cookie gate.

## Tech stack

- **Framework:** Next.js 16.1.7 (App Router), React 19.2, TypeScript (strict).
- **Styling:** Tailwind CSS v4, Framer Motion.
- **3D:** React Three Fiber, Drei, Three.js.
- **Data:** Neon Postgres via `@neondatabase/serverless`; all SQL lives in `src/lib/services/*.ts`.
- **Storage:** Cloudflare R2 (S3-compatible) for images and media.
- **Auth:** NextAuth v5 (beta) with bcryptjs.
- **Exports:** `googleapis` (Google Sheets, service account).
- **Tests:** Vitest (`npm test`) for the pure utility modules.
- **Deploy:** Vercel.

Project version: 0.1.0.

## Layout

- `src/app/` -- routes: `(public)`, `(admin)`, `(docs)`, `admin` (token-gated account pages), `api`, `bootstrap`, `docs` (the docs login), `maintenance`, plus `robots.ts` and `sitemap.ts`.
- `src/lib/` -- `auth.ts`, `db.ts`, `r2.ts`, `utils.ts` (including `uploadToR2`), `docs-config.ts`, plus `services/` (all SQL, plus the two outbound services `f1.ts` and `googleExport.ts`), `utils/` (pure helpers with Vitest tests: join questions, phone, SRN/PRN, link rules, export tables, group labels) and `maze/` (the maze solver's pure logic).
- `src/components/` -- grouped by feature (about, admin, bootstrap, crew, docs, events, f1, gallery, home, join, layout, legal, posts, projects, sponsors, ui).
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
