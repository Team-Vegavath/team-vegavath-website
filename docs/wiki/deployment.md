# Deployment Guide

This guide takes the Team Vegavath website from an empty machine and a
fresh set of cloud accounts to a running production deployment. It assumes
zero prior context. Follow the sections in order.

Stack: Next.js 16 (App Router, TypeScript strict) on Vercel, Neon Postgres,
Cloudflare R2 for media, NextAuth v5 for admin auth, and Google Gemini for
AI summaries.

_Current as of Session 72D (2026-08-12)._

Note on env var naming: the code uses `R2_*` variable names. Any
`CLOUDFLARE_*` names you may see in older docs are stale -- follow the
names in this guide and in the code.

## 1. Prerequisites

1. Node.js 20 LTS or newer, and npm 10+ (bundled with Node). Verify with
   `node -v` and `npm -v`.
2. Git, and a clone of this repository.
3. A Neon account (https://neon.tech) for the Postgres database.
4. A Cloudflare account with R2 enabled (https://dash.cloudflare.com) for
   media storage.
5. A Vercel account (https://vercel.com) for hosting, ideally linked to the
   Git provider that holds this repo.
6. A Google AI Studio account (https://aistudio.google.com) to obtain a
   Gemini API key.
7. Optional local tooling: `psql` or the Neon SQL Editor to run migrations.

After cloning, install dependencies once with `npm install`.

## 2. Environment variables

Create a `.env.local` file in the repo root for local development, and add
the same variables to the Vercel project for production (Section 6). Never
commit real values. Every value below is represented as a placeholder such
as `<value>` -- substitute your own.

All variable names below were reconciled against the actual `process.env`
usages in `src/` and the `.env.local` present in the repo.

### Database

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | Neon Postgres connection string, read in `src/lib/db.ts`. Required -- the app throws on startup if missing. | Neon dashboard -> your project -> Connection string (pooled). |

### Auth / NextAuth

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `NEXTAUTH_SECRET` | Secret used by NextAuth v5 to sign and encrypt the JWT session. Required in production. | Generate with `openssl rand -base64 32` (or `npx auth secret`). |
| `NEXTAUTH_URL` | Canonical base URL of the deployment, used for callbacks. | Your site URL, e.g. `https://<your-domain>` locally `http://localhost:3000`. |

### Godfather admin account

The "godfather" is the env-based fallback admin defined in `src/lib/auth.ts`.
It cannot be deleted or overridden from the database, so it is the guaranteed
way in even before any DB admin accounts exist.

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `ADMIN_USERNAME` | Login username for the godfather admin. Compared case-insensitively. | You choose it. |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the godfather password. The app compares the submitted password against this hash; a plaintext value will never match. | Generate a bcrypt hash of your chosen password (e.g. `npx bcryptjs <password>` or any bcrypt tool). |
| `ADMIN_DISPLAY_NAME` | Display name shown for the godfather in the UI. Optional -- defaults to `Vegavath Admin` if unset. | You choose it. |

### Cloudflare R2

R2 client is built in `src/lib/r2.ts`; the public hostname is also used by
`next.config.ts` for Next Image optimization.

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account ID; forms the S3 endpoint `https://<id>.r2.cloudflarestorage.com`. Required. | Cloudflare dashboard -> R2 -> account ID shown in the API/S3 endpoint. |
| `R2_ACCESS_KEY_ID` | R2 S3 API access key ID. Required. | Cloudflare -> R2 -> Manage R2 API Tokens -> create token. |
| `R2_SECRET_ACCESS_KEY` | R2 S3 API secret access key. Required. | Shown once when you create the R2 API token -- store it immediately. |
| `R2_BUCKET_NAME` | Bucket name for uploads. Optional -- defaults to `vegavath-media` if unset. | The bucket you create in R2. |
| `R2_PUBLIC_HOSTNAME` | Public hostname of the bucket, allowlisted in `next.config.ts` `images.remotePatterns` so optimized images work. | R2 bucket public URL host (the `pub-*.r2.dev` host, or your custom domain). |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Public base URL used on the client to build media links. Client-exposed (NEXT_PUBLIC). | Full `https://` public URL of the bucket. |

### Gemini / AI

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `GEMINI_API_KEY` | Google Gemini API key, used by the bootstrap session summarize route (`src/app/api/admin/bootstrap/sessions/[id]/summarize/route.ts`). | Google AI Studio -> Get API key. |

### Public / maintenance flags

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `NEXT_PUBLIC_MAINTENANCE_MODE` | Emergency override in `src/middleware.ts`. When set to the string `true`, all public pages rewrite to `/maintenance` regardless of DB state. Optional -- omit or set anything other than `true` for normal operation. | You set it. Normal DB-driven maintenance is toggled from the admin panel (`site_settings` key `maintenance_mode`); this env flag is the last resort when the DB is down. |
| `DOCS_PASSWORD` | Shared secret gating `/docs`, enforced in `src/middleware.ts` and `/api/docs/auth`. **WARNING: `/docs` FAILS OPEN when this is unset.** If it goes missing in Vercel the documentation is public again with no error and no signal -- the robots disallow is the only remaining layer. Never hardcode or log the value. | You choose it. Set it in Vercel for every environment you deploy. |

Note: `NODE_ENV` is also referenced in code but is set automatically by
Next.js and Vercel (`development` locally, `production` on deploy). Do not
set it manually.

## 3. Database setup (Neon)

1. In the Neon dashboard, create a new project (pick a region close to your
   Vercel deployment region).
2. Create or use the default database.
3. Copy the pooled connection string and set it as `DATABASE_URL`.
4. Cold-start note: the Neon free tier suspends the compute after about 5
   minutes of inactivity. The first request after idle takes roughly 2 to 5
   seconds to wake the database. This is expected; subsequent requests are
   fast.

## 4. Migrations

SQL migrations live in `migrations/` and are applied MANUALLY to Neon, in
numeric order. They are never auto-applied by the app or by the build, and
per AGENTS.md the migration files are gitignored (see the
`migrations/00[1-9]_*.sql` and `migrations/0[1-9][0-9]_*.sql` entries in
`.gitignore`), so a fresh clone from Git may not contain them -- obtain them
from a teammate or an existing checkout if absent.

Apply every file in ascending order, 001 through 017:

1. `001_initial_schema.sql`
2. `002_add_coding_domain.sql`
3. `003_multi_domain_applications.sql`
4. `004_application_new_fields.sql`
5. `005_application_status_pipeline.sql`
6. `006_admin_login_log.sql`
7. `007_bootstrap_tables.sql`
8. `008_bootstrap_map_queued.sql`
9. `009_volunteer_suggestion.sql`
10. `010_admin_accounts_milestones.sql`
11. `011_interview_group.sql`
12. `012_invite_name_reset.sql`
13. `013_github_url_legacy_tier.sql`
14. `014_bootstrap_visitor_groups.sql`
15. `015_bootstrap_stall_leads_groupsize.sql`
16. `016_volunteer_selfregister.sql`
17. `017_feedback_extra.sql`

How to apply: paste each file's contents into the Neon SQL Editor and run,
or use `psql "<DATABASE_URL>" -f migrations/001_initial_schema.sql` and
repeat for each file in order. Do not skip files -- later migrations depend
on tables and columns created by earlier ones (for example, migration 012
adds the `token_version` column the auth layer expects).

Live-database caution: the Neon DB is live production. Review any SQL,
including SELECTs, before running it, per the project rules.

## 5. R2 bucket setup (Cloudflare)

1. In the Cloudflare dashboard, open R2 and create a bucket. If you name it
   something other than `vegavath-media`, set `R2_BUCKET_NAME` to match
   (otherwise the code defaults to `vegavath-media`).
2. Enable public access for the bucket (either the `r2.dev` public
   development URL or a custom domain).
3. Set `NEXT_PUBLIC_R2_PUBLIC_URL` to the full public base URL, and
   `R2_PUBLIC_HOSTNAME` to just its hostname. The hostname must be
   allowlisted in `next.config.ts`; there is a hardcoded fallback host in
   that file, but you should set `R2_PUBLIC_HOSTNAME` to your own bucket so
   image optimization does not silently degrade.
4. Create an R2 API token (S3-compatible) and set `R2_ACCOUNT_ID`,
   `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`. The account ID is the one
   embedded in the S3 endpoint `https://<account-id>.r2.cloudflarestorage.com`.
5. Immutable-cache rule: R2 objects are served with immutable cache headers.
   Never overwrite an existing object key -- always upload under a new,
   timestamped filename. Overwriting a key leaves stale content cached
   indefinitely.

## 6. Vercel deployment

1. In Vercel, create a new project and connect this Git repository.
2. Framework preset: Next.js (Vercel auto-detects it). Leave the defaults.
3. Build command: `npm run build`. Install command: `npm install`. Output
   is handled by the Next.js preset -- do not override it.
4. There is no `vercel.json` in this repo; all configuration comes from the
   Vercel project settings and `next.config.ts`.
5. Add every environment variable from Section 2 to the Vercel project
   (Project Settings -> Environment Variables), for the Production
   environment (and Preview/Development if you want those to work). Use the
   same names exactly. Set `NEXTAUTH_URL` to the production domain.
6. Deploy. The build must complete with zero errors; `next.config.ts` does
   not ignore build or lint errors, so any TypeScript or ESLint failure will
   fail the deploy.

## 7. Post-deploy checklist

1. Maintenance flag: confirm `NEXT_PUBLIC_MAINTENANCE_MODE` is not set to
   `true` in production (unless you intend the site to show the maintenance
   page). Normal maintenance toggling is done from the admin panel, which
   writes the `site_settings` `maintenance_mode` row.
2. Cold start: the very first request after idle may take 2 to 5 seconds
   while Neon wakes. Load the homepage once and confirm it settles.
3. Admin / godfather login: go to `/admin` and sign in with `ADMIN_USERNAME`
   and the plaintext password whose bcrypt hash you stored in
   `ADMIN_PASSWORD_HASH`. This must work even before any DB admin accounts
   exist, because the godfather is an env-based fallback.
4. Verify migrations: if login or admin pages error, confirm all 17
   migrations ran in order (missing columns such as `token_version` point to
   a skipped migration).
5. Media check: upload or view an image and confirm it loads from the R2
   public URL and that Next Image optimization works (implies
   `R2_PUBLIC_HOSTNAME` is correct).
6. Seed data: any seed scripts in `scripts/` hit the LIVE database. Do not
   run them without explicit approval; the site works with an empty (but
   migrated) database and content is added through the admin panel.
