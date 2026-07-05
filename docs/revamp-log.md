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
