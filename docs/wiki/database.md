# Database Schema

_Current as of Session 72D (2026-08-12). Migrations 001-025 are all applied._

This document describes the full Team Vegavath Postgres schema (Neon), reconstructed
by applying all 25 migration files in `migrations/` cumulatively, in numeric order.
Migrations are the source of truth. None are auto-applied -- each is run manually
against the live Neon database before the matching code deploys.

Known migration drift: migration 001 does not create `team_members.linkedin_url`,
which exists in the live database via an un-migrated `ALTER`. A rebuild from the
migration files alone would therefore NOT match production.

The `pgcrypto` extension is enabled in migration 001 so that `gen_random_uuid()`
is available for all UUID primary keys.

Tables are grouped into two areas:
- Core site tables: `events`, `event_registrations`, `posts`, `team_members`,
  `gallery_items`, `sponsors`, `applications`, `site_settings`, `milestones`,
  `admin_accounts`, `admin_invite_tokens`, `admin_password_reset_tokens`,
  `admin_login_log`.
- Bootstrap event-day tables: `bootstrap_sessions`, `bootstrap_stalls`,
  `bootstrap_volunteers`, `bootstrap_groups`, `bootstrap_visitors`,
  `bootstrap_feedback`.

Total: 19 tables.

Note: there is no dedicated `about` table. About-page and contact content is
stored as key/value rows in `site_settings`.

---

## Core site tables

### events

Purpose: public-facing events (workshops, competitions, talks) with registration and gallery links.

Created: 001. Modified: none (schema unchanged after 001).

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| slug | TEXT | UNIQUE, NOT NULL. URL slug |
| title | TEXT | NOT NULL |
| category | TEXT | NOT NULL, CHECK in ('workshops','competitions','talks','other') |
| status | TEXT | NOT NULL, default 'upcoming', CHECK in ('upcoming','past','archived') |
| description | TEXT | nullable |
| event_date | DATE | NOT NULL |
| logo_url | TEXT | nullable |
| cover_image_url | TEXT | nullable |
| registration_open | BOOLEAN | NOT NULL, default false |
| registration_form_url | TEXT | nullable |
| sponsors | JSONB | default '[]' |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |
| updated_at | TIMESTAMPTZ | NOT NULL, default now(). Auto-updated by trigger `events_updated_at` |

Indexes: `idx_events_status(status)`, `idx_events_date(event_date DESC)`, `idx_events_slug(slug)`.

Trigger: `events_updated_at` runs `update_updated_at()` BEFORE UPDATE to refresh `updated_at`.

Constraints:

```sql
CHECK (category IN ('workshops', 'competitions', 'talks', 'hackathons', 'other'))
CHECK (status IN ('upcoming', 'past', 'archived'))
```

RESOLVED (was a long-standing open item): the original CHECK did not include
`'hackathons'`, so the admin EventForm offered a category the constraint
rejected and creating a hackathon event returned a 500.
`migrations/018_events_hackathons.sql` widens the constraint and is applied.
The path has not yet been exercised through the UI, so creating one hackathon
event in `/admin/events` is still worth doing to close it out.

`registration_form_url` also still exists on this table. It is dead in the
render path -- S47 replaced it with the native `/events/[slug]/register` flow --
but it is deliberately kept for historical rows. **Do not drop the column.**

---

### event_registrations

Created: 019. Native event sign-ups, replacing the old external Google Form
link. The data used to land in a spreadsheet nobody owned, outside the admin
panel and outside the database, so committee handover lost it.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, `gen_random_uuid()` |
| event_id | UUID | NOT NULL, FK -> `events(id)` ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| email | TEXT | NOT NULL |
| phone | TEXT | NOT NULL |
| srn | TEXT | nullable |
| message | TEXT | nullable |
| status | TEXT | NOT NULL, default `'pending'` |
| registered_at | TIMESTAMPTZ | NOT NULL, default `now()` |

```sql
CHECK (status IN ('pending', 'confirmed', 'rejected', 'waitlisted'))
```

Indexes: `idx_event_registrations_event(event_id)` and
`idx_event_registrations_email(event_id, email)`.

Validation happens in the route against real state: an unknown event 404s, a
closed `registration_open` flag 409s, and a duplicate email 409s **matched
case-insensitively**, so `A@x.com` cannot re-register as `a@x.com`. The
registration block is gated on event category, not on the presence of a form
URL: only `hackathons` and `competitions` show it at all.

---

### posts

Created: 022. Modified: 023 (category CHECK narrowed), 024 (`thumbnail_url`).
Backs the blog at `/posts`.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, `gen_random_uuid()` |
| slug | TEXT | UNIQUE, NOT NULL. Generated on create only, so published URLs stay stable across edits |
| title | TEXT | NOT NULL |
| author_name | TEXT | NOT NULL |
| author_role | TEXT | nullable |
| category | TEXT | NOT NULL, default `'motorsport'` (was `'general'` in 022) |
| body | TEXT | NOT NULL, markdown |
| excerpt | TEXT | nullable |
| source_url | TEXT | nullable. For content cross-posted from LinkedIn |
| source_label | TEXT | nullable |
| thumbnail_url | TEXT | nullable. Added in 024; posts without one show a category-colour placeholder |
| published | BOOLEAN | NOT NULL, default false |
| published_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | NOT NULL, default `now()` |
| updated_at | TIMESTAMPTZ | NOT NULL, default `now()`, maintained by the `posts_updated_at` trigger |

```sql
CHECK (category IN ('automotives', 'motorsport', 'robotics'))  -- narrowed in 023
```

Migration 023 is worth reading as a pattern: it narrowed the CHECK from six
categories to three, and it had to (a) UPDATE existing rows off the removed
values first and (b) change the column DEFAULT, because 022's default of
`'general'` would have been rejected by the new constraint on any INSERT that
omitted the column.

Indexes: `idx_posts_slug(slug)`, `idx_posts_published(published, published_at DESC)`,
and a partial `idx_posts_category(category) WHERE published = true`.

`posts.ts` is the reference implementation for two service-layer patterns: the
read-then-write update shape (because `COALESCE(${value ?? null}, column)` can
never write a NULL back, and these columns must be clearable), and branching on
a filter rather than concatenating a dynamic WHERE.

---

### team_members

Purpose: team roster (core / crew / legacy / faculty) grouped by domain, shown on the crew page.

Created: 001. Modified: 013 (added `github_url`; expanded `tier` CHECK to include 'faculty').

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| name | TEXT | NOT NULL |
| role | TEXT | NOT NULL |
| tier | TEXT | NOT NULL, CHECK in ('core','crew','legacy','faculty') (see below) |
| domain | TEXT | nullable, CHECK in ('Automotive','Robotics','Design','Media','Marketing','Programming','Operations') |
| quote | TEXT | nullable |
| photo_url | TEXT | nullable |
| display_order | INTEGER | NOT NULL, default 0 |
| is_active | BOOLEAN | NOT NULL, default true |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |
| github_url | TEXT | nullable. Added in 013 |

Indexes: `idx_members_tier(tier, display_order)`, `idx_members_active(is_active)`.

Constraints (after 013):

```sql
-- Original 001 CHECK: tier IN ('core', 'crew', 'legacy')
-- 013 dropped and replaced it with:
CHECK (tier IN ('core', 'crew', 'legacy', 'faculty'))
CHECK (domain IN ('Automotive','Robotics','Design','Media','Marketing','Programming','Operations'))
```

---

### gallery_items

Purpose: images and video links for the gallery, optionally tied to an event.

Created: 001. Modified: none.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| event_id | UUID | FK -> events(id) ON DELETE SET NULL, nullable |
| event_label | TEXT | NOT NULL |
| type | TEXT | NOT NULL, CHECK in ('image','video') |
| url | TEXT | NOT NULL |
| thumbnail_url | TEXT | nullable |
| caption | TEXT | nullable |
| taken_at | DATE | nullable |
| display_order | INTEGER | NOT NULL, default 0 |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |

Relationships: `event_id` -> `events(id)`, ON DELETE SET NULL (gallery item survives event deletion).

Indexes: `idx_gallery_event(event_id)`, `idx_gallery_order(display_order)`.

Constraint: `CHECK (type IN ('image', 'video'))`.

---

### sponsors

Purpose: sponsor logos and links, split into premium / community tiers for the marquee.

Created: 001. Modified: none. (001 includes a commented-out manual re-assertion of the tier CHECK for pre-existing databases.)

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| name | TEXT | NOT NULL |
| logo_url | TEXT | NOT NULL |
| website_url | TEXT | nullable |
| description | TEXT | nullable |
| tier | TEXT | NOT NULL, default 'community', CHECK in ('premium','community') |
| is_active | BOOLEAN | NOT NULL, default true |
| display_order | INTEGER | NOT NULL, default 0 |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |

Index: `idx_sponsors_active(is_active, display_order)`.

Constraint: `CHECK (tier IN ('premium', 'community'))`.

---

### applications

Purpose: "Join Us" recruitment submissions with up to three domain choices and a status pipeline.

Created: 001. Modified: 002, 003, 004, 005, 011 (this is the most-evolved table).

Evolution summary:
- 001: base table with `domain_interest` (FY25 domains) and 4-value `status`.
- 002: expanded `domain_interest` CHECK to add 'Coding'.
- 003: added `domain_interest_2` and `domain_interest_3` (each with its own CHECK).
- 004: added FY26 form fields (`mobile_number`, `srn_prn`, `semester`, `why_join`, `value_addition`, `domain_experience`, `design_portfolio_url`); rewrote all three domain CHECKs to accept FY26 names plus FY25 legacy values.
- 005: expanded `status` CHECK for the recruitment pipeline.
- 011: added `interview_group`.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| name | TEXT | NOT NULL |
| email | TEXT | NOT NULL |
| domain_interest | TEXT | NOT NULL, CHECK (see below). Primary domain |
| domain_interest_2 | TEXT | nullable, CHECK. Added in 003. Second choice |
| domain_interest_3 | TEXT | nullable, CHECK. Added in 003. Third choice |
| portfolio_url | TEXT | nullable |
| status | TEXT | NOT NULL, default 'pending', CHECK (see below) |
| submitted_at | TIMESTAMPTZ | NOT NULL, default now() |
| mobile_number | TEXT | nullable. Added in 004 |
| srn_prn | TEXT | nullable. Added in 004 |
| semester | TEXT | nullable, CHECK in ('1','3','5'). Added in 004 |
| why_join | TEXT | nullable. Added in 004 |
| value_addition | TEXT | nullable. Added in 004 |
| domain_experience | TEXT | nullable. Added in 004 |
| design_portfolio_url | TEXT | nullable. Added in 004 |
| interview_group | TEXT | nullable, CHECK in ('A','B','C','D') or NULL. Added in 011 |

Indexes: `idx_applications_date(submitted_at DESC)`; `idx_applications_interview_group(interview_group) WHERE interview_group IS NOT NULL` (added in 011).

Domain CHECK (final, after 004 -- applies identically to `domain_interest`, `domain_interest_2`, `domain_interest_3`):

```sql
CHECK (domain_interest IN (
  'Coding', 'Automotives', 'Sponsorship',
  'Robotics', 'Operations', 'Social Media',
  -- FY25 legacy values (existing rows)
  'Automotive', 'Design', 'Media', 'Marketing', 'Programming',
  'Sponsorship & Finance'
))
```

Status CHECK (final, after 005):

```sql
CHECK (status IN (
  'pending', 'shortlisted', 'interview', 'selected',
  'rejected', 'reviewed', 'accepted'
))
```

Other CHECKs: `semester IN ('1','3','5')`; `interview_group IN ('A','B','C','D') OR interview_group IS NULL`.

---

### site_settings

Purpose: simple key/value store for site-wide flags and contact/social info.

Created: 001. Modified: none.

| Column | Type | Notes |
| --- | --- | --- |
| key | TEXT | PK |
| value | TEXT | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() |

Seeded keys (001, inserted ON CONFLICT DO NOTHING): `recruitment_open`,
`maintenance_mode`, `maintenance_message`, `contact_email`, `contact_phone`,
`contact_address`, `instagram_url`, `linkedin_url`, `github_url`.

---

### milestones

Purpose: "Road So Far" timeline entries shown on the about page.

Created: 010. Modified: none.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| date_label | TEXT | NOT NULL |
| title | TEXT | NOT NULL |
| description | TEXT | NOT NULL |
| sort_order | INTEGER | NOT NULL, default 0 |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |

No FKs, no CHECKs.

---

### admin_accounts

Purpose: named DB-based admin logins, separate from the env "godfather" account.

Created: 010. Modified: 012 (added `token_version`).

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| username | TEXT | NOT NULL, UNIQUE |
| password_hash | TEXT | NOT NULL. bcrypt |
| display_name | TEXT | NOT NULL |
| mobile_number | TEXT | nullable. For identity confirmation on approval |
| role | TEXT | NOT NULL, default 'admin', CHECK in ('admin','godfather') |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |
| token_version | INT | NOT NULL, default 0. Added in 012. Incremented on password reset to invalidate all live JWTs |

Constraint: `CHECK (role IN ('admin', 'godfather', 'viewer'))` -- `'viewer'` added
in 019.

The `viewer` tier is read-only and its enforcement is deliberately split:
`session.user.isAdmin` stays **TRUE** for viewers, because it means "may enter
the admin panel" and every admin page gates on it. The write gate is the
separate `isViewer` flag, checked immediately after the `isAdmin` check in
every mutating route. Do not "fix" `isAdmin` to exclude viewers -- that locks
the read-only tier out of the panel entirely.

---

### admin_invite_tokens

Purpose: one-time invite tokens holding pending registration data until a godfather approves.

Created: 010. Modified: 012 (added `invitee_name`, `invitee_slug`).

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| token | TEXT | NOT NULL, UNIQUE |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |
| expires_at | TIMESTAMPTZ | NOT NULL, default now() + INTERVAL '48 hours' |
| status | TEXT | NOT NULL, default 'generated', CHECK in ('generated','pending_approval','approved','rejected') |
| pending_username | TEXT | nullable. Set when registrant submits |
| pending_display_name | TEXT | nullable |
| pending_email | TEXT | nullable |
| pending_mobile | TEXT | nullable |
| pending_password_hash | TEXT | nullable. bcrypt, stored before approval |
| invitee_name | TEXT | nullable. Added in 012 |
| invitee_slug | TEXT | nullable. Added in 012. For the /admin/invite/[name]/[token] URL |

Constraint: `CHECK (status IN ('generated', 'pending_approval', 'approved', 'rejected'))`.

Note: not a formal FK, but on approval this row's pending data becomes an `admin_accounts` row.

---

### admin_password_reset_tokens

Purpose: single-use password-reset tokens (2-hour expiry) for admin accounts.

Created: 012. Modified: none.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| account_id | UUID | NOT NULL, FK -> admin_accounts(id) ON DELETE CASCADE |
| token | TEXT | NOT NULL, UNIQUE |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |
| expires_at | TIMESTAMPTZ | NOT NULL, default now() + INTERVAL '2 hours' |
| used_at | TIMESTAMPTZ | nullable. Set when consumed (single-use) |

Relationship: `account_id` -> `admin_accounts(id)`, ON DELETE CASCADE.

---

### admin_login_log

Purpose: audit log of admin login attempts (success and failure) with device hints.

Created: 006. Modified: none.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| attempted_at | TIMESTAMPTZ | NOT NULL, default now() |
| success | BOOLEAN | NOT NULL |
| ip_address | TEXT | nullable |
| user_agent | TEXT | nullable |
| device_hint | TEXT | nullable |

Index: `idx_login_log_time(attempted_at DESC)`.

---

## Bootstrap event-day tables

The Bootstrap system runs live event-day operations: stall status, volunteer
logins, visitor check-in via QR, and feedback. A single session is active at a time.

### bootstrap_sessions

Purpose: one Bootstrap event day (e.g. "Bootstrap Day 1"); only one is active at a time.

Created: 007. Modified: 008 (added `map_image_url`), 015 (added `max_group_size`).

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| name | TEXT | NOT NULL. e.g. "Bootstrap Day 1" |
| is_active | BOOLEAN | NOT NULL, default false. Only one active at a time |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |
| map_image_url | TEXT | nullable. Added in 008. Admin-uploaded top-down map photo |
| max_group_size | INTEGER | NOT NULL, default 20. Added in 015. Max visitors per group |

No CHECKs. Referenced by nearly every other bootstrap table.

---

### bootstrap_stalls

Purpose: stalls within a session, each with occupancy status, queue ownership, and map position.

Created: 007. Modified: 008 (`queued_by`, `map_x`, `map_y`), 009 (`queued_at`), 015 (`lead_names`).

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| session_id | UUID | NOT NULL, FK -> bootstrap_sessions(id) ON DELETE CASCADE |
| stall_number | INTEGER | NOT NULL. Display order only |
| stall_name | TEXT | NOT NULL. e.g. "Go-Kart", "BMW Display" |
| status | TEXT | NOT NULL, default 'free', CHECK in ('free','occupied','queued') |
| max_occupancy | INTEGER | NOT NULL, default 1, CHECK BETWEEN 1 AND 3 |
| claimed_by | TEXT[] | nullable. Array of volunteer usernames |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() |
| queued_by | TEXT | nullable. Added in 008. Who set the queue (only they can clear it) |
| map_x | FLOAT | nullable. Added in 008. Percent 0-100 from top-left of map image |
| map_y | FLOAT | nullable. Added in 008 |
| queued_at | TIMESTAMPTZ | nullable. Added in 009. When queue was set, for wait ranking/alerts |
| lead_names | TEXT | nullable. Added in 015. Comma-separated stall lead names (informational) |

Relationships: `session_id` -> `bootstrap_sessions(id)`, ON DELETE CASCADE.

Constraints:

```sql
CHECK (status IN ('free', 'occupied', 'queued'))
CHECK (max_occupancy BETWEEN 1 AND 3)
UNIQUE (session_id, stall_number)
```

Index: `idx_bootstrap_stalls_session(session_id)`.

---

### bootstrap_volunteers

Purpose: volunteer/lead login accounts for a session; self-registered from S35 onward.

Created: 007. Modified: 009 (`suggested_stall_id`), 014 (`role`), 015 (`checkin_token`), 016 (`phone`, `srn`, `login_code`, `group_number`, `in_classroom`, `created_at`), 021 (`session_id` made NULLABLE, `preferred_stall_name`), 025 (`switch_requested_stall_id`, `switch_requested_at`). The most-modified bootstrap table.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| session_id | UUID | **NULLABLE since 021**, FK -> bootstrap_sessions(id) ON DELETE CASCADE. NULL = pre-registration pool member |
| username | TEXT | NOT NULL. e.g. "vol-1"; from S35 the SRN |
| password_hash | TEXT | NOT NULL. bcryptjs (same lib as auth.ts); hash of login_code from S35 |
| display_name | TEXT | NOT NULL. e.g. "Volunteer 1" |
| current_session_token | TEXT | nullable. NULL = not logged in; set = in use |
| suggested_stall_id | UUID | nullable, FK -> bootstrap_stalls(id) ON DELETE SET NULL. Added in 009. Admin points volunteer at a stall |
| role | TEXT | NOT NULL, default 'stall', CHECK in ('stall','lead'). Added in 014. 'stall' = stationed toggle; 'lead' = walks with a group (full dashboard) |
| checkin_token | TEXT | nullable, UNIQUE. Added in 015. Stable per-lead QR token (persists across logout) |
| phone | TEXT | nullable. Added in 016 |
| srn | TEXT | nullable. Added in 016 |
| login_code | TEXT | nullable. Added in 016. Plaintext, admin-visible (low-stakes internal tool) |
| group_number | INTEGER | nullable. Added in 016. Assigned FCFS on activation |
| in_classroom | BOOLEAN | NOT NULL, default false. Added in 016. Classroom-mode flag for group volunteers |
| created_at | TIMESTAMPTZ | NOT NULL, default now(). Added in 016 (007 had no timestamp); needed for FCFS group-number ordering |
| preferred_stall_name | TEXT | nullable. Added in 021. Free text -- pool members register before stalls exist |
| switch_requested_stall_id | UUID | nullable, FK -> bootstrap_stalls(id) ON DELETE SET NULL. Added in 025. **The sole predicate for "has a pending switch request"** |
| switch_requested_at | TIMESTAMPTZ | nullable. Added in 025. Display-only ("requested 12 min ago"); must never gate anything |

Relationships: `session_id` -> `bootstrap_sessions(id)` ON DELETE CASCADE; `suggested_stall_id` and `switch_requested_stall_id` -> `bootstrap_stalls(id)` ON DELETE SET NULL.

Constraints:

```sql
UNIQUE (session_id, username)
CHECK (role IN ('stall', 'lead'))     -- added 014
UNIQUE (checkin_token)                -- added 015
```

**`UNIQUE (session_id, username)` does not constrain pool rows.** Postgres
treats NULLs as distinct, so once 021 made `session_id` nullable this
constraint stopped covering pre-registration members. The one-account-per-SRN
rule for the pool is enforced in application code (`getPoolVolunteerBySrn`),
not by the database. Any further pool-scoped uniqueness rule needs the same
treatment -- the constraint will not help you.

Assignment out of the pool is a one-way door: `assignVolunteerToSession` guards
on `WHERE ... AND session_id IS NULL`, so a double-assign is a 409 rather than
a silent move. Auto-assign by matching `preferred_stall_name` against stall
names (punctuation and case normalised on both sides) only fires at session
*creation*; someone who pre-registers while an inactive session already exists
needs manual assignment.

Index: `idx_bootstrap_volunteers_session(session_id)`.

Note: `password_hash` keeps its 007 NOT NULL; self-registered accounts still store a bcrypt hash of the `login_code`, so no constraint change was needed in 016.

---

### bootstrap_groups

Purpose: visitor groups (A, B, C...) within a session, each optionally led by a volunteer.

Created: 014. Modified: none.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| session_id | UUID | NOT NULL, FK -> bootstrap_sessions(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL. "Group A", "Group B", or custom |
| team_lead_id | UUID | nullable, FK -> bootstrap_volunteers(id) ON DELETE SET NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |

Relationships: `session_id` -> `bootstrap_sessions(id)` ON DELETE CASCADE; `team_lead_id` -> `bootstrap_volunteers(id)` ON DELETE SET NULL.

Constraint: `UNIQUE (session_id, name)`.

Index: `idx_bootstrap_groups_session(session_id)`.

---

### bootstrap_visitors

Purpose: visitors who check in via QR, optionally assigned to a group.

Created: 014. Modified: none.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| session_id | UUID | NOT NULL, FK -> bootstrap_sessions(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| prn | TEXT | NOT NULL |
| phone | TEXT | NOT NULL |
| group_id | UUID | nullable, FK -> bootstrap_groups(id) ON DELETE SET NULL |
| arrived_at | TIMESTAMPTZ | NOT NULL, default now() |

Relationships: `session_id` -> `bootstrap_sessions(id)` ON DELETE CASCADE; `group_id` -> `bootstrap_groups(id)` ON DELETE SET NULL.

Index: `idx_bootstrap_visitors_session(session_id)`.

---

### bootstrap_feedback

Purpose: visitor feedback, upgraded from a single rating to a multi-question form.

Created: 014. Modified: 017 (added `overall_rating`, `memorable_stall`, `join_likelihood`, `suggestions`).

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| session_id | UUID | NOT NULL, FK -> bootstrap_sessions(id) ON DELETE CASCADE |
| stall_id | UUID | nullable, FK -> bootstrap_stalls(id) ON DELETE SET NULL |
| rating | INTEGER | nullable, CHECK BETWEEN 1 AND 5. Legacy; reused for optional per-stall score |
| comment | TEXT | nullable. Legacy, kept for backward compat with older rows |
| submitted_at | TIMESTAMPTZ | NOT NULL, default now() |
| overall_rating | INTEGER | nullable, CHECK BETWEEN 1 AND 10. Added in 017. Primary metric |
| memorable_stall | TEXT | nullable. Added in 017 |
| join_likelihood | INTEGER | nullable, CHECK BETWEEN 1 AND 5. Added in 017 |
| suggestions | TEXT | nullable. Added in 017 |

Relationships: `session_id` -> `bootstrap_sessions(id)` ON DELETE CASCADE; `stall_id` -> `bootstrap_stalls(id)` ON DELETE SET NULL.

Constraints:

```sql
CHECK (rating BETWEEN 1 AND 5)
CHECK (overall_rating BETWEEN 1 AND 10)  -- added 017
CHECK (join_likelihood BETWEEN 1 AND 5)  -- added 017
```

---

## Shared database objects

- Extension: `pgcrypto` (001) -- provides `gen_random_uuid()`.
- Function: `update_updated_at()` (001) -- trigger function that sets `NEW.updated_at = now()`.
- Trigger: `events_updated_at` (001) -- BEFORE UPDATE on `events`, runs `update_updated_at()`.

## Migration-to-table map

| Migration | Tables affected |
| --- | --- |
| 001_initial_schema | events, team_members, gallery_items, sponsors, applications, site_settings (+ pgcrypto, update_updated_at, events_updated_at trigger) |
| 002_add_coding_domain | applications (domain_interest CHECK) |
| 003_multi_domain_applications | applications (domain_interest_2, domain_interest_3) |
| 004_application_new_fields | applications (7 new columns + all 3 domain CHECKs) |
| 005_application_status_pipeline | applications (status CHECK) |
| 006_admin_login_log | admin_login_log (new) |
| 007_bootstrap_tables | bootstrap_sessions, bootstrap_stalls, bootstrap_volunteers (new) |
| 008_bootstrap_map_queued | bootstrap_stalls (queued_by, map_x, map_y), bootstrap_sessions (map_image_url) |
| 009_volunteer_suggestion | bootstrap_volunteers (suggested_stall_id), bootstrap_stalls (queued_at) |
| 010_admin_accounts_milestones | admin_accounts, admin_invite_tokens, milestones (new) |
| 011_interview_group | applications (interview_group) |
| 012_invite_name_reset | admin_invite_tokens (invitee_name, invitee_slug), admin_password_reset_tokens (new), admin_accounts (token_version) |
| 013_github_url_legacy_tier | team_members (github_url, tier CHECK adds 'faculty') |
| 014_bootstrap_visitor_groups | bootstrap_volunteers (role), bootstrap_groups, bootstrap_visitors, bootstrap_feedback (new) |
| 015_bootstrap_stall_leads_groupsize | bootstrap_stalls (lead_names), bootstrap_sessions (max_group_size), bootstrap_volunteers (checkin_token) |
| 016_volunteer_selfregister | bootstrap_volunteers (phone, srn, login_code, group_number, in_classroom, created_at) |
| 017_feedback_extra | bootstrap_feedback (overall_rating, memorable_stall, join_likelihood, suggestions) |
| 018_events_hackathons | events (category CHECK adds 'hackathons') |
| 019_viewer_role_and_event_registrations | admin_accounts (role CHECK adds 'viewer'), event_registrations (new), admin_invite_tokens (pending_role) |
| 020_open_invite_tokens | admin_invite_tokens (is_open, reusable open viewer link) |
| 021_bootstrap_prereg | bootstrap_volunteers (session_id becomes NULLABLE, preferred_stall_name) |
| 022_posts | posts (new) |
| 023_posts_categories | posts (category CHECK narrowed to 3, DEFAULT changed to 'motorsport') |
| 024_post_thumbnails | posts (thumbnail_url) |
| 025_stall_switch_request | bootstrap_volunteers (switch_requested_stall_id, switch_requested_at) |

### Reading migration 025 before you touch the switch-request code

025 carries a consequence the application code must respect, and it is spelled
out in the migration header. The FK is `ON DELETE SET NULL`, which nulls
`switch_requested_stall_id` **only**. `switch_requested_at` is a plain
TIMESTAMPTZ and survives, so deleting the target stall leaves a half-state:
NULL id, non-NULL timestamp.

Therefore `switch_requested_stall_id IS NOT NULL` is the **sole** predicate for
"has a pending request" everywhere in the codebase. `switch_requested_at` is
display-only ("requested 12 min ago") and must never gate anything.

Note also that this `SET NULL` is NOT a repeat of migration 009's mistake. In
009, SET NULL erased a volunteer's durable *assignment* -- a load-bearing value
the application treated as authoritative -- when a stall was deleted. Here the
value is a *pending request* pointing at a stall that no longer exists, which is
already meaningless the moment the stall is gone. Clearing it is the correct
outcome, not data loss. RESTRICT was considered and rejected: a transient
request would have been able to block an admin from deleting a stall.
