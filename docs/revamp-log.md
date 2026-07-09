# Revamp Log — Team Vegavath Frontend

Progress log for the UI revamp. One entry per session. Newer entries at the bottom.
Where this log and `context_for_revamp.md` disagree, this log wins (it records verified reality).

---

## Session 0 — Audit (2026-07-03)

Factual audit of repo/DB state, run before any changes. Key findings (verified, not inferred):

- **Git:** clean, `master` @ `49504c1`, synced with origin.
- **`local-revamp-backup` branch:** 10 files differ. `src/lib/db.ts` there is a **real fix** (dev = `postgres` TCP driver, prod = `neon` HTTP — works around blocked HTTP API in local dev). NOT merged — `src/lib/` is out of revamp scope. **User should hand-merge db.ts later.** `KartModelWrapper.tsx` there simply removes the mobile placeholder (3D everywhere) — carry that intent into the rebuild.
- **Admin CRUD:** contrary to `context_for_revamp.md` §2/landmine 3, admin events + team CRUD **already exist and are wired** — `EventForm.tsx`/`MemberForm.tsx` upload to R2 via `/api/admin/upload` (real `PutObjectCommand`). The "implement CRUD" session is actually a *styling + bugfix* session.
  - Known bug found: `EventForm.tsx` edit mode sends `logo_url: ""` / `cover_image_url: ""` when no new file is picked — empty string survives the service's `COALESCE`, wiping any stored URL on every edit.
  - `cover_image_url` and `logo_url` are **NULL for all 6 events** in the live DB (Ignition 1.0, IKC 20, Bootstrap 2025, Bootstrap 2024, Freshers Day 2025, EmbedX 2.0).
- **Kart model:** `.glb` exists in R2 — `models/vegavath-gokart.glb`, ~9MB, HTTP 200. Desktop renders it (R3F); mobile currently shows a "coming soon" placeholder box.
- **Sponsors tier:** live CHECK constraint + data = `premium`/`community` only (3 community, 2 premium). The 4-tier scheme in the architecture PDF is wrong.
- **PageTransition:** exists at `src/components/layout/PageTransition.tsx`, NOT mounted in layout.
- **Auth crash (user-confirmed):** wrong password on the live admin portal produces "Application error: a server-side exception" (Digest 1919400078). `src/lib/auth.ts` `authorize()` has no try/catch; a plain wrong password returns `null` cleanly in code, so the crash path likely involves NextAuth v5 CredentialsSignin handling in the login page / server action. Investigate BOTH auth.ts (sanctioned try/catch) and the login page when doing the admin session.
- **Event categories:** DB CHECK allows `workshops/competitions/talks/other`; the admin form also offers `hackathons` (would 500 on insert). **User decision: treat the website's current categories (incl. hackathons) as correct.** Constraint lives in migrations (out of scope) — flagged, not fixed.
- **Fonts live today:** Geist/Geist Mono. Colors live today: `--background #121212` etc. — old token names, being replaced.
- **Styling today:** heavy inline `style={{}}` mixed with Tailwind everywhere; tokens in globals.css mostly unused by components.

## Session plan (from context_for_revamp.md §10, adjusted by audit)

1. Design tokens + fonts (globals.css, layout.tsx)
2. Global components (Navbar, Footer, mount PageTransition)
3. Home page
4. About page
5. Events (list + detail)
6. Crew
7. Join
8. Gallery + Sponsors
9. Admin (styling + EventForm edit-wipe bugfix + auth crash fix) — **PAUSE after this one, show auth.ts diff to user**

---

## Session 1 — Design tokens + fonts (2026-07-03)

- `src/app/layout.tsx`: replaced Geist/Geist Mono with Orbitron(900)/Chakra Petch(400,600,700)/Space Grotesk(400,500,600)/Space Mono(400,700) via next/font/google; all four variables on `<html>`.
- `src/app/globals.css`: full new token block (bg-base/surface/card/elevated, accent+gold, text tiers, borders, status), typography role rules (h1=Orbitron, h2/h3/.heading=Chakra, body=Space Grotesk, .mono/time=Space Mono), pattern-speed-lines + pattern-dots, sharp .btn-primary/.btn-outline/.card/.card-accent/.label-tech. Kept a clearly-marked LEGACY alias block (old var names) so not-yet-rebuilt pages don't break — remove in final polish.
- Installed `@formkit/auto-animate` (needed for events grid in Session 5).
- Verified: `npm run build` → 0 TS errors, all routes compile.

# Session 2 — Global components (2026-07-03)

- `Navbar.tsx`: rebuilt — shield icon only (left), centered uppercase Chakra Petch links (HOME/ABOUT/EVENTS/GALLERY/CREW/SPONSORS), sharp orange JOIN US button (right). Transparent over content → solid `--bg-base` + 1px border after 80px scroll (framer-motion useScroll). Mobile: hamburger → full-screen overlay, Orbitron links, full-width JOIN US at bottom. Body scroll locked while open.
- `Footer.tsx`: rebuilt — two-row layout (logo + "TEAM VEGAVATH — PESU ECC" | inline-SVG socials at 60% white; nav links | © 2026 | "Built by the Vegavath Coding Domain"). Stacks on mobile. "Made with ♥" and 4-column grid removed. Socials fall back to real club URLs when site_settings blank.
- `PageTransition` mounted in root `layout.tsx` around children.
- `(public)/layout.tsx`: removed the h-20 navbar spacer (navbar now overlays hero); maintenance screen restyled dark/no-emoji. Data fetching untouched.
- NOTE: pages not yet rebuilt temporarily sit under the fixed navbar without top padding — each page gets its own padding as it's rebuilt (sessions 3–8).
- Auth try/catch deliberately deferred to Session 9 (admin) per master prompt pause condition, even though context doc says Session 2.
- Verified: `npm run build` → 0 errors; grep gate: no emoji, no rounded-full/xl in touched files.

## Session 3 — Home page (2026-07-03)

- `(public)/page.tsx`: full rebuild — speed-lines hero (100svh, Orbitron VEGAVATH, "PESU ECC — RACING TOWARD INNOVATION", Karts. Code. Innovation., JOIN THE TEAM / VIEW EVENTS sharp CTAs), StatsTicker bar (real stats, Space Mono), THE BUILD 3D kart section, DomainGrid, single EVENTS section w/ VIEW ALL link, sponsor logo marquee, orange clip-path JOIN CTA. All "Our X" headings, emojis, gradient text, Start Engine button, ambient glows removed.
- New components: `ui/Reveal.tsx` (whileInView fade-up), `home/DomainGrid.tsx` (6 tiles, Orbitron ghost letters, orange hover invert — shared with /about later), `home/StatsTicker.tsx`, `home/EventsPreview.tsx` (client, staggered editorial rows, border-left accent, empty state = Instagram teaser), `sponsors/SponsorMarquee.tsx` (shared; logos white via filter, original color on hover, 48px contain, no cards).
- `KartModelWrapper.tsx`: 3D model now renders on ALL viewports (carried intent from local-revamp-backup); mobile "coming soon" placeholder gone. `KartModelSection.tsx`: sharp corners, token colors, emoji hint line replaced with mono micro-label.
- Deleted `home/HeroDomains.tsx` (replaced by DomainGrid; no remaining imports).
- Verified: build 0 errors; emoji/rounded/mx-auto gate CLEAN on all touched files.

## Session 4 — About page (2026-07-03)

- `about/page.tsx`: rebuilt — full-bleed team-photo hero ("BUILT BY STUDENTS. / FOR STUDENTS.", bottom-heavy gradient), intro paragraph, mission as gold-accented pull-quote (no "Our Mission" heading), shared DomainGrid, dramatic mono stats on pattern-dots (200+/2/85/6 — fake "10+ Projects/3+ Awards" removed), real-events-only timeline (Freshers Day Sep 2025 → Ignition 1.0 Nov 2025 → EmbedX 2.0 Feb 2026; fake 2020–2023 timeline deleted), values with CSS/SVG geometric outlines (emojis removed), shared SponsorMarquee.
- `AboutHeroImage.tsx`: restyled as the full-bleed hero; **lightbox retained per user instruction** (lightbox + YouTube embeds are used sitewide for media viewing — preserve in /gallery and /crew too). The flagged `⊕` symbol replaced with a mono "tap to view" hint.
- Verified: build 0 errors; emoji/rounded/mx-auto gate CLEAN.

## Session 5 — Events list + detail (2026-07-03)

- `EventsClient.tsx`: pill filter buttons → sharp underline tabs (active = 2px accent border-bottom); grid uses `useAutoAnimate` for filter transitions; cards rebuilt editorial-style (mono date top, Chakra title, plain uppercase category label, border-left accent, whole card is the link, VIEW DETAILS →). 🏁 emoji fallback removed — no-cover cards are text-first. "Hackathons" filter kept per user's category ruling.
- `events/page.tsx`: left-aligned sharp header + micro-label, fixed-navbar top padding.
- `events/[slug]/page.tsx`: rounded-pill back button → plain uppercase link; header row (logo, mono date—category, Chakra title); full-width cover when present; sharp REGISTER NOW btn; closed state shows "Registration is closed for this event." in mono. force-dynamic (live registration) unchanged.
- `EventMediaClient.tsx`: sharp cards + token colors; ⊕ hover glyph → mono VIEW overlay; ▶ char → inline SVG play icon; ✕ → ×. **Lightbox + YouTube embed logic fully preserved** per user instruction. Removed dead `isCustomCursorEnabled` state (was set, never read).
- Verified: build 0 errors; emoji/rounded/mx-auto gate CLEAN.

## Session 6 — Crew page (2026-07-03)

- `crew/page.tsx`: rebuilt — left-aligned sharp header; Core tier = horizontal cards (photo left 120px desktop, stacked mobile); Crew/Legacy = dense grids (2 col mobile / 3 tablet / 4 desktop, compact info); name Chakra, role small-caps Space Grotesk, domain as bottom uppercase label (no pill), photos square/sharp with 1px border. 👤 emoji placeholder → member initial in Chakra. LinkedIn link kept (mono, muted). Bottom CTA sharp APPLY NOW (flag emoji removed). Filters to is_active members only.
- Verified: build 0 errors; gate CLEAN.

## Session 7 — Join page (2026-07-03)

- `JoinClient.tsx`: rebuilt — desktop split layout (40% orange brand panel: logo, stacked JOIN/THE/TEAM in Chakra, six-domain list; 60% form panel), stacks on mobile with orange strip on top. Inputs = bottom-border-only, transparent, accent on focus. Domain dropdown → tap-target tiles (selected = orange fill). Submit = full-width sharp SUBMIT APPLICATION (no emoji). Closed state = "Recruitment is currently closed." + Instagram notify line + logo (🚫 removed). Success state = mono "APPLICATION RECEIVED" + "You're on the grid." (🏁/🏎️ removed). Honeypot + POST /api/join logic unchanged.
- SPEC CONFLICT resolVED: spec asks for 6 domain tiles (marketing domains), but /api/join + DB CHECK only accept Automotive/Robotics/Design/Media/Marketing — form offers those 5 legal values (backend untouchable). Documented with a code comment.
- Verified: build 0 errors; gate CLEAN.

## Session 8 — Gallery + Sponsors (2026-07-03)

- `GalleryClient.tsx`: pill filters → sharp underline tabs; masonry cards sharp with token borders; ⊕ → mono VIEW overlay; ▶ → SVG play; ✕ → ×. **Masonry + Lightbox (Zoom/Thumbnails/Video plugins) + YouTube modal logic fully preserved.**
- `gallery/page.tsx`: left-aligned sharp header + micro-label; filter derivation logic unchanged.
- `sponsors/page.tsx`: rebuilt for the real 2-tier scheme (premium = 2-col cards w/ accent left border + description; community = denser 3-col). Logos use §9 treatment: white via filter at rest, original color on card hover, fixed-height contain, no logo sub-cards. Dashed-border CTA → sharp BECOME A SPONSOR mailto button. "Our Sponsors" heading removed.
- Verified: build 0 errors; gate CLEAN.

## Session 9 — Admin + auth crash fix (2026-07-03) — PAUSED FOR USER REVIEW

**Auth crash — root cause found and fixed (two layers):**

1. The real prod crash: `(admin)/admin/page.tsx` server action caught signIn errors but detected them via `error.constructor.name === "CredentialsSignin"` / message string checks — **class names are minified in production builds**, so the check passed in dev and failed deployed; the error re-threw → "Application error: a server-side exception" (user's Digest 1919400078). Fixed with `error instanceof AuthError` (imported from next-auth), which survives minification.
2. `src/lib/auth.ts` (sanctioned exception): try/catch around `bcrypt.compare` so a malformed `ADMIN_PASSWORD_HASH` returns null (invalid credentials) instead of throwing. Nothing else in the file touched.

**EventForm upload fixes:**

- Edit-wipe bug: image URL fields now only included in the payload when a new file was uploaded (previously `""` survived COALESCE and wiped stored URLs on every edit).
- Upload keys now timestamped (`cover-<ts>.jpg`) — R2 serves immutable cache headers, so overwriting the same key would serve stale forever (architecture doc: "replace via new filename").
- `uploadFile` now throws on non-OK response instead of storing `undefined`.

**Admin styling (minimal, per spec "not pretty — internal tooling"):**

- Login page: emojis (⚠️/🔒) and red-gradient pill button removed; sharp token-based card, btn-primary SIGN IN.
- Dashboard: emoji nav links → accent-bordered text links; status pill → plain uppercase text.
- Mechanical sweep across all admin pages/forms: `borderRadius:"9999px"` → 0, `rounded-full`/`rounded-xl` removed (incl. toggle switches, now square), `Saved ✓` → `Saved`.

**Also caught in final full-repo gate:**

- `legal/page.tsx`: 🔒/📜 emojis + pill link + radii fixed. **FLAG: legal page text claims MIT License, but the repo switched to "Team Vegavath Custom Educational License" (commit 6573448). Legal copy needs a human decision — not rewritten.**
- `CursorToggle.tsx` squared; `RacingCursor.tsx` keeps `rounded-full` (it IS a circular cursor dot — intrinsic, exempted).
- Last `mx-auto` uses (3 admin pages + not-found) → `style={{margin:"0 auto"}}`.

**Verified:** `npm run build` 0 errors; full-repo scan: no emoji in any .tsx, no rounded-full/xl/2xl or 9999px radius (RacingCursor exempted), no mx-auto.

**Deferred / for user:**

- `db.ts` dev-TCP fix on local-revamp-backup — hand-merge candidate, out of scope here.
- Legal page license copy (MIT vs custom license) — needs user decision.
- LEGACY alias block still in globals.css — safe to remove after confirming no stragglers; left in place.
- `hackathons` category: admin form offers it but DB CHECK rejects it (migrations out of scope) — creating a hackathons event 500s until the constraint is updated.

## Session 10 — Admin UI + Legal revamp (2026-07-07)

Full design pass on the admin family + /legal, driven by a fresh file-level audit
(admin was on a parallel zinc palette: 65 raw hex + 61 zinc/orange/red Tailwind
classes vs 11 token refs, no layout shell, `rounded-lg/md` everywhere).

**Layout shell (new):**
- `(admin)/layout.tsx` → renders new `AdminShell.tsx` (client): fixed 240px sidebar
  (`--bg-surface`, R2 shield logo + VEGAVATH/ADMIN wordmark, 6 nav links with inline
  16px SVG icons, accent left-border + `--bg-elevated` active state via `usePathname`),
  SignOutButton slot at bottom (server component passed as prop). Mobile ≤767px:
  sidebar collapses to a fixed top bar + hamburger overlay. Login (`/admin`) renders
  bare — shell skips it by pathname.
- All admin CSS lives in a token-pure `/* Admin panel (Session 10) */` block in
  globals.css (plain CSS — Tailwind v4 responsive prefixes unreliable).
- Per-page wrappers/back-links/padding stripped; pages now render header + content only.
- `SignOutButton`: red pill → plain mono muted text (error color on hover).

**Pages:**
- Login: input `borderRadius "4px"` → 0 (only change; already token-native).
- Dashboard: nav-link cards removed (sidebar replaces them); stats row now Events /
  Team Members / Gallery Items / Active Sponsors (mono clamp numbers; added existing
  `getGalleryItemsLimited`/`getSponsors` service calls — data layer untouched);
  recruitment status in header uses `--success`/`--error`; applications table rebuilt
  on shared `.admin-table` (mono uppercase headers, `--bg-card` row hover, plain
  uppercase status text, no pills).
- Events/Team/Gallery/Sponsors lists: same `.admin-table` pattern, 4px sharp status
  dots, 40px sharp thumbs (dashed placeholder when null), mono EDIT + DELETE/ARCHIVE
  row actions via new `InlineDelete.tsx`. Events row "ARCHIVE" uses the API's
  non-permanent DELETE (labelled honestly); permanent delete lives only in the edit
  page danger zone. Team + sponsors lists gained row deletes (audit: team had none).
- Edit pages ×3: back link + header + form + new danger-zone section (`--error`
  border card) containing the restyled Delete*Buttons; ToggleEventStatusButton
  (now `.btn-outline`) moved to the edit header.

**Forms (EventForm, MemberForm, SponsorForm, GalleryUploadForm, SettingsForm):**
- Inputs → bottom-border-only `.admin-input` (accent on focus), mono uppercase
  labels, mono section dividers (BASIC INFO / MEDIA / STATUS & VISIBILITY / …).
- Raw `<input type="file">` → new `FileUploadField.tsx`: dashed drag-drop zone,
  filename + size rows with × remove, and 64px current-image preview with
  "CURRENT — REPLACE" hover overlay in edit mode (edit pages now pass
  `logo_url`/`cover_image_url`/`photo_url` through initialData).
- All `<div onClick>` toggles → new `ToggleSwitch.tsx`, a sharp segmented ON/OFF
  `<button aria-pressed>` pair (keyboard-accessible).
- Behavior fixes while in the files: MemberForm had EventForm's old edit-wipe bug
  (always sent `photo_url: ""` — now only sent when a new file is uploaded) and
  member/sponsor/gallery upload keys are now timestamped (R2 immutable-cache rule:
  never reuse an object key).
- SettingsForm: added missing `maintenance_message` + `contact_phone` fields;
  `settings/actions.ts` whitelist gained those two keys (user-approved 2-line change;
  action logic untouched).
- `DeleteGalleryItemButton.tsx` deleted — fully superseded by `InlineDelete`.

**/legal:**
- Rebuilt as single-column 720px typography page on `--bg-base` (was `#121212`
  two-card grid). Mono "Last updated: 07 July 2026" at top, LEGAL header in Chakra.
- **MIT references fixed (was flagged since Session 9):** §5 IP, §6 license section,
  and footer callout now describe the actual "Team Vegavath Custom Educational
  License" using the LICENSE file's own terms (view/learn/fork for educational use,
  non-commercial & non-competitive clause, protected-assets list, attribution),
  linking to the LICENSE on GitHub. Footer reads "Source Available", not "Open Source".
- Leftover `flex items-center gap-3` icon spacing on the two h2s removed.

**Verified:** `npm run build` 0 errors; `npx tsc --noEmit` exit 0. Stricter gate
(bans rounded-lg/md/bare `rounded`, all zinc/orange/red/green palette classes, any
raw hex, mx-auto, orbitron-in-admin, emoji) CLEAN over all 27 touched files.
Token adoption in admin + legal: **81 `var(--` refs, 0 raw hex (100%)** — was ~8%.

**Known/remaining:**
- `hackathons` category 500 unchanged (DB CHECK constraint, migrations out of scope).
- Edit pages still contain pre-existing inline `sql\`SELECT…\`` (violates the
  services contract, but fixing requires `src/lib/services` — out of scope; flagged).
- Login error box keeps `rgba(239,68,68,…)` tints (alpha variant of `--error`; no
  alpha token exists).

## Session 11 — Content fixes, UI iteration, crew restore (2026-07-07)

**Sitewide sweeps (all `.tsx` under src/):**
- Em dashes: zero remain — UI strings use `·` for metadata separators (event
  date·category, "TEAM VEGAVATH · PESU ECC") or comma/period for prose; code
  comments converted to `;`/`:`. Verified by grep. NOTE: the spec's domain-tile
  descriptions contained one em dash ("full-stack web — we build…") which
  conflicted with the zero-em-dash gate; converted to a period.
- `200+ FOOTFALL` removed from StatsTicker (now 3 stats), the about stats grid
  (now 3-col: 2/85/6, `.stats-grid` desktop columns 4→3), and the Ignition 1.0
  timeline description. No replacement numbers invented.
- GitHub links: footer + /legal (2 links) now point at
  `github.com/Team-Vegavath/team-vegavath-website` (legal keeps the
  `/blob/master/LICENSE` suffix).

**Home:**
- Hero tagline → "LIFE AT FULL THROTTLE · PESU ECC"; VEGAVATH clamp
  `(72px,16vw,160px)` → `(48px,12vw,140px)`, `word-break: keep-all`, hero
  section `overflow: hidden` (narrow-viewport clipping fix).
- DomainGrid: abbreviations now COD/AUT/S&F/ROB/OPS/SOC (ghost size 4.5rem→3rem
  to fit 3 chars); each tile gained the spec'd description, revealed on hover
  below the name (max-height+opacity transition — the tile row grows on hover;
  no reveal on touch devices, hover-only per spec).
- Events preview: editorial rows replaced by a 1/2/3-col thumbnail card grid.
  New shared `events/EventCard.tsx` (16:9 cover or `--bg-elevated` placeholder
  showing the category, mono date, Chakra title, plain category label,
  VIEW DETAILS →, 3px accent left border, hover `--bg-elevated`). Home now
  passes `cover_image_url` through. `.event-row` CSS deleted.
- Empty state → "Events TBA. Check out @teamvegavath_pesu for updates."
  (handle links to Instagram, new tab).
- "Backed by" → `PARTNERS` (Chakra h2, also on /about).

**About:** hero overlay moved to bottom-left (absolute, bottom 2rem / left
2.5rem) with a bottom-40% gradient (`0.85→0.4@40%→transparent@70%`) so faces
stay clear; lightbox untouched.

**Events list:** `EventsClient` now renders the shared `EventCard` in the same
`events-card-grid`; auto-animate + filter tabs unchanged.

**Event detail:** 2-col desktop layout (content 3fr / cover 2fr, cover sticky
at `top: 6rem`, 4:3, always rendered — title-initials mono placeholder when
cover is null); mobile stacks cover above content. Registration block now
renders ONLY when `registration_open` or `registration_form_url` — the closed
message only appears for events that actually had a form; otherwise nothing.

**Crew:** Core restored to dominant full-row horizontal cards (was 2-col),
160×160 photo, name 1.35rem; bio (`quote` column — the spec says `bio` but the
DB/type field is `quote`) now renders on ALL tiers, 2-line clamp on compact
Crew/Legacy cards; text "LINKEDIN →" link replaced by the inline-SVG LinkedIn
icon on every card with a `linkedin_url` (hidden when null).

**Footer:** "Built by the Vegavath Coding Domain" → "Engineered by Vegavath".

**404:** rebuilt on the token system — speed-lines full viewport, Orbitron
watermark 404 (20% opacity, the one sanctioned Orbitron use outside the hero),
Chakra PAGE NOT FOUND, ← GO HOME / VIEW EVENTS CTAs, "VEGAVATH · PESU ECC".

**Admin:** no max-width cap existed on the content area (audited — sidebar is
fixed 240px + `margin-left`, content already fills the viewport; nothing to
remove). Mobile: overlay nav is now full-screen `--bg-base` with 48px Chakra
uppercase touch targets (active = accent), body scroll locked while open,
content padding 16px; tables become card lists ≤767px (thead hidden, each row
a `--bg-card` bordered card, new `.admin-td-primary` class on the title/name
cell renders as the Chakra card heading, secondary cells mono small).

**Verified:** `npm run build` 0 errors; `npx tsc --noEmit` exit 0. Grep gates
all clean: 0 em dashes, 0 `200+`/footfall, 0 rounded-*/9999px (RacingCursor
exempt), 0 mx-auto, 0 emoji, Orbitron only in layout font setup + 404.
`npm run lint` fails on PRE-EXISTING debt only (setState-in-effect in
Navbar/CursorToggle/RacingCursor/AdminShell's old pathname effect, `require()`
in scripts/) — none introduced this session.

**Needs user:** whether crew members in the live DB actually have `quote` /
`linkedin_url` data (SELECT prepared, not run — live-DB rule).

## Session 12 — Bug fixes, kart POV, cursor/touch, admin density (2026-07-08)

**Kart POV (item 1):** `local-revamp-backup` DID differ. Only camera-relevant
delta was `<Stage adjustCamera>` — backup `2`, master `4`. drei's `adjustCamera`
scales camera distance, so `4` pushed the camera back (the small/far-POV bug).
Carried `2` forward in `KartModelSection.tsx`; nothing else from backup touched
(its `borderRadius: 0.75rem` / raw hex are the OLD styling — deliberately not
carried, current token styling kept).

**Footer (item 2):** the two trailing lines ("© 2026 Team Vegavath" +
"Engineered by Vegavath") merged into one Space Mono / `--text-muted` line:
"© 2026 Team Vegavath · Engineered by Vegavath" (uppercased via CSS).

**"each semester" → "each year" (item 3):** one occurrence, `crew/page.tsx`
("Recruitment opens each year across all six domains"). Fixed. Grep now 0.

**Admin mobile nav (item 4):** traced both layers — NO defect found. Hamburger
`onClick` toggles `setMenuOpen`; `data-open={menuOpen}` stringifies to
`"true"/"false"`; CSS `.admin-sidebar{display:none}` is overridden by the
higher-specificity `.admin-sidebar[data-open="true"]{display:flex}` in the same
`≤767px` media query; nav items are real `<Link href>` that navigate and
auto-close via the pathname effect; the hamburger animates into the ✕ that
toggles it closed. This is Session 11's build-verified rewrite. No code change —
"don't fix what you can't reproduce." Flagged for on-device eyeball.

**Cursor + toggle on touch (item 5):** both now bail on coarse pointers.
`CursorControls` gained an `isCoarse` state (`matchMedia("(pointer: coarse)")`,
guarded by `typeof window`) and returns null on touch, so neither child mounts.
`CursorToggle`'s detection switched from `ontouchstart`/`maxTouchPoints` to the
same `matchMedia("(pointer: coarse)")` so the dot and toggle appear/hide as a
pair. `RacingCursor` already had coarse detection — unchanged, verified.
NOTE: `CursorToggle` still carries a pre-existing gradient+glow on its switch
(aesthetic debt, not in the automated gate, out of this session's scope).

**Admin desktop density (item 6, globals.css):** sidebar 240→280px (+ content
`margin-left` 280px); brand logo area `min-height: 64px`; nav links
`min-height: 48px`, font 0.83→0.875rem (14px), horizontal padding 1.25→1.5rem
(24px; foot padding matched); content padding 2.5rem/3rem (40/48px top/side);
page title → `clamp(1.5rem,2.5vw,2rem)`; stat card padding 1.75rem, value
`clamp(2.5rem,5vw,3.5rem)`, label 0.72→0.75rem (12px); table `td` padding
0.875rem 1rem (14/16px), `th` font 0.65→0.6875rem (11px); form input bottom
padding → 1rem, section-label margin-top 2.25→2.5rem (40px). Mobile overrides
(overlay 100% width, table-as-cards, content margin 0) untouched.

**LinkedIn (item 7):** DB query (37 active members) → `linkedin_url` is
NULL/empty for ALL 37; `quote` populated for 35/37 (null only for "Sharanya N",
"Keshav"). So the crew-page render code is correct — LinkedIn icons are absent
purely because the data isn't there. Added an `admin-hint` under the MemberForm
LinkedIn field: "Shows the LinkedIn icon on /crew when set." No render change.

**Lightbox (item 8):** `yet-another-react-lightbox@^3.29.1` is installed — the
recommended library. Kept as-is, no migration needed.

### Session 12 — Bulk Import Architecture Audit (item 9, report only)

1. **Team service** (`src/lib/services/team.ts`): `createMember` accepts a
   SINGLE `CreateMemberInput`; `updateMember(id, input)` also single. There is
   NO bulk insert function. Bulk import today = loop `createMember` N times, or
   add a new `createMembersBulk(inputs[])`.
2. **Upload route** (`/api/admin/upload`): file-type AGNOSTIC — it reads
   `formData.get("file")`, stores it in R2 at `path` with the file's own
   `ContentType`, returns the URL. It does NOT parse anything. It would store a
   CSV blob but can't turn it into rows. Bulk import needs a SEPARATE route
   (e.g. `POST /api/admin/import/team`) that parses CSV → validates → inserts.
3. **`team_members` columns** (live DB): `id` (uuid, auto), `name` (NOT NULL),
   `role` (NOT NULL), `tier`, `domain` (nullable), `quote` (nullable),
   `linkedin_url` (nullable), `photo_url` (nullable), `display_order` (int,
   default 0), `is_active` (bool, default true), `created_at` (auto). CSV columns
   to map: name, role, tier, domain, quote, linkedin_url, display_order,
   is_active. (photo_url is an R2 upload — not practical in a text CSV; import
   text fields, attach photos later via edit.)
   **DRIFT FLAG:** `migrations/001_initial_schema.sql` does NOT contain
   `linkedin_url` — it exists in the live DB via an un-migrated `ALTER TABLE`.
   A `002` migration should be added to record it (needs approval; migrations
   out of scope this session).
4. **Valid CHECK values:** tier ∈ {`core`, `crew`, `legacy`}; domain ∈
   {`Automotive`, `Robotics`, `Design`, `Media`, `Marketing`, `Programming`,
   `Operations`} (nullable). An import must validate against these or the INSERT
   500s (same class as the `hackathons` category trap).
5. **Recommendation:** at ≤100 members/year a loop over `createMember` is
   acceptable, but a single `createMembersBulk(inputs[])` doing ONE multi-row
   INSERT is cleaner (atomic, one Neon round-trip, avoids 37 cold-start-sensitive
   calls) and keeps SQL in the service per the architecture contract. Suggested
   Session 13 shape: new `/api/admin/import/team` route (re-checks isAdmin) →
   parse+validate CSV → `createMembersBulk`. Photos excluded from the CSV path.

**Verified:** `npm run build` 0 errors; `npx tsc --noEmit` exit 0. Gates: 0
"each semester", 0 em dashes, 0 rounded-* (RacingCursor exempt), no new emoji /
mx-auto in touched files.

## Session 13 — UI iteration fixes (2026-07-08)

**Crew LinkedIn (item 1):** every member card now shows the LinkedIn icon.
`crew/page.tsx` got a `CLUB_LINKEDIN_URL` constant (same URL Footer hardcodes:
`https://www.linkedin.com/company/team-vegavath-pesu`); the icon's href is
`member.linkedin_url || CLUB_LINKEDIN_URL`, so an individual `linkedin_url`
populated later via admin MemberForm overrides the club-wide default per
member. aria-label stays the member's name; target/rel unchanged.

**Stats ticker (item 2):** `StatsTicker.tsx` rewritten as a client-side
single-stat rotating carousel — 2 MAJOR EVENTS / 85 MEMBERS / 6 DOMAINS, one
visible at a time, 3 s interval, Framer Motion `AnimatePresence mode="wait"`
upward-scroll transition (y 16→0→-16, 0.35 s), 4px square progress dots
(accent = current). Kept the NAMED export (`export function StatsTicker`) so
the `page.tsx` import is untouched. The now-unused `.stats-ticker` CSS block
(+ scrollbar/sep rules) removed from globals.css — carousel styles are inline.

**Cursor on touch (item 3):** Session 12's JS `matchMedia` detection had a
one-frame hydration flash. Replaced with CSS: `@media (pointer: coarse)`
rule in globals.css hides `.cursor-toggle-wrapper` and `[data-racing-cursor]`
(`display: none !important`). `CursorToggle` outer div got the wrapper class
and lost its `isTouchDevice` useEffect; `CursorControls` lost its `isCoarse`
state/check (still mounts both RacingCursor + CursorToggle, `mounted` guard
for localStorage kept); `RacingCursor`'s two fixed divs each carry
`data-racing-cursor=""` (its root is a fragment, so the attribute sits on
both real DOM nodes). RacingCursor's own pre-Session-12 coarse detection left
in place as a JS belt-and-suspenders — it never flashed (initial state hides).

**Footer (item 4):** copyright line now just "© 2026 Team Vegavath" —
dot separator and "Engineered by Vegavath" removed.

**Join page (item 5):** shield logo removed from the orange brand panel
(navbar already has it); panel is now stacked JOIN/THE/TEAM + domain list.
"Coding" added as the 6th domain tile — existing `.join-domain-tiles` grid
already renders 2-col mobile / 3-col ≥640px, so 6 tiles = 2×3 / 3×2 with no
CSS change. Sync changes ("Coding" must pass all three layers):
`JoinClient.tsx` DOMAINS, `/api/join` VALID_DOMAINS, and
`src/types/settings.ts` `Application`/`CreateApplicationInput`
`domain_interest` unions.

**Migration 002 (item 5, authorized exception):**
`migrations/002_add_coding_domain.sql` created. NOTE vs the session spec: the
column is `domain_interest` (not `domain`) and the inline CHECK from 001
auto-named itself `applications_domain_interest_check` — the migration targets
those real names and includes a pg_constraint lookup comment in case the live
name drifted. ⚠ NOT YET APPLIED to the live Neon DB — a Coding submission
500s until someone runs `psql $DATABASE_URL < migrations/002_add_coding_domain.sql`
(or pastes it into the Neon console). File only records the change.
(Separate drift from Session 12 still open: 001 lacks `team_members.linkedin_url`.)

**Home page pattern (item 6):** `pattern-speed-lines` moved up to the
outermost wrapper div of `page.tsx` so the texture underlies the whole home
page; the inline `background: var(--bg-base)` was removed from that div
because the `background` shorthand would have overridden the class's
background-image (the class sets the same base color itself). Hero keeps its
own identical pattern class (same origin, visually seamless). Home page only.

**Verified:** `npm run build` 0 errors; `npx tsc --noEmit` exit 0 (after
fixing two errors the change surfaced: `domain_interest` union in
settings.ts, and `noUncheckedIndexedAccess` on `STATS[index]` — solved with
`as const` + `?? STATS[0]`). Gates: 0 em dashes in src *.tsx, 0 rounded-*
outside RacingCursor, 0 mx-auto in touched files, no emoji.

**Needs user eyeball (dev server):** `/` (full-page speed lines + new stats
carousel), `/join` (logo gone, 6 tiles), `/crew` (LinkedIn icon on every
card), footer copyright, and cursor toggle absence on a touch device.

## Session 14 — Kart scroll glitch + email validation check (2026-07-08)

**Kart viewer (KartModelSection.tsx):** `frameloop="demand"` added to the
`<Canvas>` (was absent — R3F default renders every frame, repainting during
page scroll). Also swapped the Canvas background from hardcoded `#161616` to
`var(--bg-card)` per the tokens-only rule (matches the wrapper div).
CAVEAT: `autoRotate` on drei's OrbitControls self-invalidates each frame
(update → change event → invalidate → next frame), so while the kart is
auto-rotating the canvas still renders continuously — demand mode only
stops repaints when rotation/interaction is idle. If scroll jitter persists
in the eyeball check, the session spec's fallback (wheel `stopPropagation`
in `onCreated`) is the next step — NOT applied yet. `enableZoom` kept.

**Email validation (JoinClient.tsx + /api/join):** Investigated — the
@pes.edu restriction DOES NOT EXIST and never did in this code. The input
is plain `type="email" required` (no `pattern`, no domain regex); the API
uses `isValidEmail()` in src/lib/utils.ts, a generic format regex
(`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) with no domain check. Only occurrences of
"@pes.edu" were the input placeholder and the sponsors-page mailto link.
Sole change: placeholder `you@pes.edu` → `you@example.com` so the form
stops *implying* a pes.edu requirement. No validation logic touched.

**Verified:** `npm run build` 0 errors; `npx tsc --noEmit` exit 0. Design
gate on touched files: no emoji, no rounded-*, no mx-auto.

**Needs user eyeball (dev server):** `/` — scroll past the kart section and
check for flicker/tearing at the viewer boundary; confirm drag-rotate and
scroll-zoom still work and auto-rotation continues. `/join` — placeholder
text.

## Session 15 — Bulk team member CSV import (2026-07-08)

**Service (team.ts):** New `createMembersBulk()` after `createMember` —
single multi-row INSERT built with numbered placeholders via `sql.query()`
(Neon driver v1 removed the `sql(text, params)` call form; only tagged
templates or `.query()` work). The spec's `ON CONFLICT (name) DO NOTHING`
was NOT usable: 001_initial_schema.sql has no unique constraint on
`team_members.name`, so ON CONFLICT would throw at runtime. The spec's
loop fallback also wouldn't skip duplicates (no constraint → duplicate
inserts succeed silently), so instead the function pre-fetches existing
names (`SELECT name FROM team_members`), filters those inputs out, then
does one INSERT for the remainder. Same "skip existing names" semantics,
still a single statement. Small race window if two imports run
concurrently — acceptable for a single-admin panel.

**API route (api/admin/import/team/route.ts):** POST, raw CSV body. Same
auth pattern as the other admin routes (`auth()` + `isAdmin` → 401).
Char-level CSV state machine (not line-splitting) so quoted fields survive
embedded commas AND newlines — Google Sheets quotes multi-line cells.
Additions beyond spec: header row validated against the exact expected
columns (400 on mismatch — silently mis-mapped columns were the bigger
risk), and a 500-row cap per import. Per-row validation: name/role
required, tier ∈ core/crew/legacy, domain ∈ the 7 team_members CHECK
values. All-rows-invalid → 422 with details; partial → import valid rows,
return `validationErrors` alongside inserted/skipped counts.

**SPEC BUG CAUGHT:** the session doc's template row used domain "Coding" —
that value is only valid for `applications.domain_interest` (migration
002). `team_members.domain` CHECK requires "Programming". Template ships
with "Programming".

**UI:** `BulkImportTeam.tsx` (client) rendered by the team page via
`?import=true` — the page is a server component, so the spec's `showImport`
useState was replaced with the same searchParam pattern as `?new=true`.
Header gets an outline "IMPORT CSV" Link next to "ADD MEMBER". Flow:
upload zone (`.admin-upload-zone`, drag + click) with column hint and
DOWNLOAD TEMPLATE (Blob + object URL) → preview (`.admin-table`, first 10
rows, 30-char truncation, row count) → IMPORT N MEMBERS / CANCEL →
mono result "X IMPORTED · Y SKIPPED" with validation errors in `--error`
→ DONE (router.push + refresh). Client re-uses the same parser so the
preview matches what the server imports. No new CSS classes.

**Verified:** `npm run build` 0 errors, `/api/admin/import/team` in route
manifest; `npx tsc --noEmit` exit 0 (three `noUncheckedIndexedAccess`
errors on indexed row access, fixed with `?? []` guards). Design gate on
touched files: no emoji, no rounded-*, no mx-auto.

**Needs user eyeball (dev server):** `/admin/team` — IMPORT CSV button
next to ADD MEMBER; `/admin/team?import=true` — template download, upload
a CSV, preview table, then a real import (hits the LIVE database — use a
throwaway row and delete it after).

## Session 16 — Coding mapping (declined) · gallery bulk upload · 404 F1 game (2026-07-09)

Session found most of this work already present uncommitted in the working
tree (an earlier interrupted run); this session verified it against the
Session 16 spec, confirmed the gates, and logged it.

**Item 1 — Coding→Programming mapping: NOT APPLIED (spec bug).** The spec
said to map the "Coding" tile to "Programming" in the /join POST body
because "`team_members.domain` CHECK requires Programming". But JoinClient
posts to `/api/join` → `createApplication` → `applications.domain_interest`
— a different table. Its CHECK (with migration 002) accepts `'Coding'` and
has never accepted `'Programming'`; `/api/join` `VALID_DOMAINS` also
accepts only `"Coding"`. The mapping would have 400-rejected every Coding
application. "Programming" is only valid for `team_members.domain` (the
CSV-import table — the same confusion Session 15 caught in its template
row). JoinClient left untouched. OPEN ITEM: confirm migration
002_add_coding_domain.sql has actually been applied to Neon — if not,
Coding applications fail the DB CHECK until it is (apply needs user
approval; live DB).

**Item 2 — Gallery bulk upload (GalleryUploadForm.tsx): verified present.**
Multi-file select via shared FileUploadField (`multiple`), queued-file list
with per-file mono status (QUEUED/UPLOADING/DONE/ERROR), optional
"Link to Event" label defaulting to "General", optional event_id paste
field, per-file captions (beyond spec), sequential upload loop —
/api/admin/upload with timestamped R2 keys (immutable-cache rule), then
POST /api/admin/gallery with `event_label` (accepted directly by
`createGalleryItem`; `event_id` stays null unless pasted). `display_order`
= max existing + index, fetched from GET /api/admin/gallery. Per-file
try/catch → "X UPLOADED · Y FAILED" summary + DONE reset. YouTube section
untouched.

**Item 3 — 404 F1 game: verified present.** `KartGame.tsx` (~700 lines,
canvas 2D, zero deps) + `KartGameWrapper.tsx`. Wrapper exists because
not-found.tsx is a server component (exports metadata) and `ssr: false`
is client-only — same pattern as KartModelWrapper. Game: 3-lane dodger,
5 SVG-data-URI F1 liveries (papaya/midnight/scuderia/petronas/williams)
picked randomly per run, lerped lane changes, 4-gear speed curve,
cone/double-cone/oil obstacles with per-gear spawn tables, AABB collision,
speedometer gauge + gear + km HUD, idle overlay with blinking prompt and
all-5-livery preview row, death flash + RACE OVER + localStorage hiscore
(`vg-404-hiscore`), keyboard + swipe + click input, ResizeObserver +
devicePixelRatio scaling. Fixed 60 Hz timestep with rAF rendering so game
speed is identical on 120/144 Hz displays. not-found.tsx: watermark pinned
to first viewport, content at paddingTop 28vh, overflowX hidden, game
below "WHILE YOU'RE HERE".

**Verified:** `npm run build` 0 errors (full route manifest);
`npx tsc --noEmit` exit 0. Design gate on KartGame, KartGameWrapper,
GalleryUploadForm, FileUploadField, not-found, JoinClient: no rounded-*,
no mx-auto (centering is inline `margin: "0 auto"` per the styling rule),
no emoji.

**Needs user eyeball (dev server):** any bad URL (e.g. /nope) — watermark,
centered 404 content, game idle state with 5-car preview, play a run with
keys, die, restart, check hiscore persists; resize the window mid-game.
`/admin/gallery` — multi-select several images, optional event label,
watch per-file statuses, confirm partial-failure summary (uploads hit the
LIVE R2 bucket + database — use throwaway images and delete after).
