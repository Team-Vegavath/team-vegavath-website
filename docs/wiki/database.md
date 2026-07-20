# Database Schema

This document describes the full Team Vegavath Postgres schema (Neon), reconstructed
by applying all 17 migration files in `migrations/` cumulatively, in numeric order.
Migrations are the source of truth. None are auto-applied -- each is run manually
against the live Neon database before the matching code deploys.

The `pgcrypto` extension is enabled in migration 001 so that `gen_random_uuid()`
is available for all UUID primary keys.

Tables are grouped into two areas:
- Core site tables: `events`, `team_members`, `gallery_items`, `sponsors`,
  `applications`, `site_settings`, `milestones`, `admin_accounts`,
  `admin_invite_tokens`, `admin_password_reset_tokens`, `admin_login_log`.
- Bootstrap event-day tables: `bootstrap_sessions`, `bootstrap_stalls`,
  `bootstrap_volunteers`, `bootstrap_groups`, `bootstrap_visitors`,
  `bootstrap_feedback`.

Total: 17 tables documented.

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
CHECK (category IN ('workshops', 'competitions', 'talks', 'other'))
CHECK (status IN ('upcoming', 'past', 'archived'))
```

KNOWN OPEN ITEM: the category CHECK does NOT include `'hackathons'`. The admin
EventForm offers "hackathons" as a category, but this constraint rejects it, so
creating a hackathon event returns a 500. No migration ever adds it. Fixing this
requires a constraint change (approval needed).

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

Constraint: `CHECK (role IN ('admin', 'godfather'))`.

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

Created: 007. Modified: 009 (`suggested_stall_id`), 014 (`role`), 015 (`checkin_token`), 016 (`phone`, `srn`, `login_code`, `group_number`, `in_classroom`, `created_at`). The most-modified bootstrap table.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK, default `gen_random_uuid()` |
| session_id | UUID | NOT NULL, FK -> bootstrap_sessions(id) ON DELETE CASCADE |
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

Relationships: `session_id` -> `bootstrap_sessions(id)` ON DELETE CASCADE; `suggested_stall_id` -> `bootstrap_stalls(id)` ON DELETE SET NULL.

Constraints:

```sql
UNIQUE (session_id, username)
CHECK (role IN ('stall', 'lead'))     -- added 014
UNIQUE (checkin_token)                -- added 015
```

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
