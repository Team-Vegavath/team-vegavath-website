# Team Vegavath — Frontend Revamp Context
**For Claude Code / Fable 5 — Read this before touching a single file.**

Prepared by: Claude Sonnet 4.6 (planning layer)  
Date: July 2026  
Repo: https://github.com/Team-Vegavath/team-vegavath-website  
Live site: https://teamvegavath.vercel.app

---

## 1. What This Is and What We're Doing

Team Vegavath is a student innovation and motorsport club at PES University, Electronic City Campus (PESU ECC). The club makes go-karts, runs IoT hackathons, and hosts campus events — biggest one so far was Ignition 1.0 (Nov 2025), 200+ footfall, one of the largest campus hackathons at PESU ECC.

**The website was built by an AI coding agent (Claude).** It works. Architecture is solid. Data layer is solid. Database is live. R2 has 793MB of media. Auth works. Admin panel exists.

**The problem is purely frontend: it looks like AI-generated slop.** Anyone who works in tech can clock it in 3 seconds. We are rebuilding the UI layer from scratch — same codebase, same data, same API routes, same services. You are NOT touching:

- `src/lib/` (any file)
- `src/types/` (any file)
- `src/app/api/` (any route)
- `migrations/`
- `scripts/`
- `next.config.ts`
- `.env.local`

**You ARE touching:**

- `src/app/globals.css`
- `src/app/layout.tsx` (font setup only)
- All files in `src/components/`
- All `page.tsx` files in `src/app/(public)/` and `src/app/(admin)/`

---

## 2. Current State — What Exists and Works

### Data / Backend (DO NOT TOUCH — all working)
- Neon Postgres DB: `events`, `team_members`, `gallery_items`, `sponsors`, `applications`, `site_settings` tables — all populated with real data
- Cloudflare R2 bucket `vegavath-media` — live, 793MB, folders: `gallery/`, `icons/`, `models/`, `payments/`, `sponsors/`, `team/`
- All API routes functional: `/api/events`, `/api/team`, `/api/gallery`, `/api/sponsors`, `/api/join`, plus all `/api/admin/*` routes
- Auth: NextAuth v5, JWT sessions, admin credentials in env vars
- Middleware: admin route protection working

### Frontend (everything here is being replaced)
- Navbar: generic horizontal links, works but looks templated
- Footer: terrible, rebuild completely
- Home: hero with emoji CTAs, placeholder for 3D model, emoji domain grid, basic event cards
- About: generic "Who We Are" layout with emoji icon sections
- Events: filter tabs + card grid, functional but styled poorly
- Gallery: masonry grid exists, lightbox exists
- Crew: three-tier grid, works
- Join: form works (honeypot + validation in API), but styled like a template
- Admin pages: placeholder tables, settings page functional
- PageTransition component: exists but NOT mounted in layout

### Known Incomplete Items (part of this revamp)
- Admin events CRUD with image upload: NOT DONE → event `cover_image_url` is null → blank event previews
- Admin team CRUD with photo upload: NOT DONE
- 3D kart model: `.glb` file status unknown, `models/` folder exists in R2
- Admin password crash on wrong input: missing try/catch in bcrypt compare in `src/lib/auth.ts`

---

## 3. The Problems — Exact AI-Slop Tells To Eliminate

Every single one of these must be gone from the final output:

### Copy / Content
- "WELCOME TO VEGAVATH" → too generic
- "Life At Full Throttle" → fine tagline, keep but style it better
- "Our X" naming pattern everywhere: "Our Build", "Our Domains", "Our Partners", "Our Mission", "Our Values", "Our Journey" → remove all instances
- "Apply Now 🏁" → the flag emoji on a CTA is the most AI thing on the entire site
- "Made with ♥ by Vegavath Team" → replace with something specific
- "No upcoming events. Check back soon." → bland, replace with an actual teaser or social CTA

### Visual
- Emoji icons for domain cards (💻🏎️🤝🤖⚙️📣) → REMOVE ALL
- Emoji icons for values (💡🏆🤝🚀) → REMOVE ALL
- Pill-shaped / `rounded-full` badge elements for ANY category → replace with sharp rectangular labels
- Generic shadow-box cards → replace with border-accent cards, sharp corners
- The `⊕` symbol on About for no reason → remove
- Gradient text on headings (if any) → replace with solid color accent
- "Start Engine" button next to "Explore Vegavath →" — incoherent dual CTA

### Structure
- Fake timeline (2020/2021/2022/2023) → leave placeholder "Timeline coming soon — contact seniors" or omit section until real data available
- Stats "10+ Projects, 3+ Awards" — unverifiable, keep "200+ footfall, 2 events, 85 members, 6 domains" which are real
- Footer: four column layout is broken on mobile, social icons are not right sized

---

## 4. Design Philosophy

The target is: **premium engineering aesthetic — think Lockheed Martin precision meets motorsport aggression meets minor cyberpunk edge, with a thin thread of Suits-level authority in typography**. The club logo is an orange panther head on a black and gold shield. The vibe should feel like a serious technical team, not a student project website.

**What we are NOT doing:**
- Making it look like a gaming site (no neon green, no RGB effects, no particle systems)
- Making it look like a startup landing page (no hero with floating cards, no testimonial carousels)
- Adding anything that makes it obvious it was AI-generated

**What we ARE doing:**
- Strong typographic hierarchy — text does the design work
- CSS-only patterns for section backgrounds (zero weight)
- Framer Motion scroll reveals (already installed, wire it)
- Auto Animate for list transitions (install)
- Sharp angular design language — no rounded corners on primary elements
- Color from the logo: orange (#EF5D08) and gold (#F29C04) on near-black

---

## 5. Design System — Locked, Do Not Deviate

### Color Tokens

```css
/* globals.css — CSS custom properties */

:root {
  /* Backgrounds */
  --bg-base:       #0a0a0a;
  --bg-surface:    #111111;
  --bg-card:       #161616;
  --bg-elevated:   #1d1d1d;

  /* Accent — from club logo */
  --accent:        #EF5D08;   /* Cayenne orange */
  --accent-hover:  #d44f06;
  --accent-dim:    rgba(239, 93, 8, 0.12);   /* for subtle glows / borders */
  --gold:          #F29C04;   /* Logo shield trim gold */
  --gold-dim:      rgba(242, 156, 4, 0.15);

  /* Text */
  --text-primary:   #F0F0F0;
  --text-secondary: #9a9a9a;
  --text-muted:     #555555;

  /* Borders */
  --border:         #1e1e1e;
  --border-strong:  #2a2a2a;

  /* Status */
  --success:        #22c55e;
  --error:          #ef4444;
  --warning:        #F29C04;  /* reuse gold */
}
```

**White (#FFFFFF) is banned on the public site. Off-white (#F0F0F0) is fine for text. No light mode.**

### Typography Stack

Install via `next/font/google` in `src/app/layout.tsx`. Pass as CSS variables. Self-hosted at build time, zero runtime font request.

```typescript
// layout.tsx font imports
import { Orbitron, Chakra_Petch, Space_Grotesk, Space_Mono } from 'next/font/google';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['900'],
  variable: '--font-orbitron',
  display: 'swap',
});

const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-chakra',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-space',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});
```

Add all four variables to the `<html>` tag className.

**Font usage rules:**
```
--font-orbitron:  ONLY for the "VEGAVATH" hero title. Nothing else. Period.
--font-chakra:    Section headings (h2/h3), card titles, navbar links, page hero titles
--font-space:     Subheadings, labels, body text, form elements, nav secondary items
--font-mono:      Stats numbers, technical micro-labels, dates, version strings
```

Add to globals.css:
```css
h1 { font-family: var(--font-orbitron), sans-serif; }
h2, h3, .heading { font-family: var(--font-chakra), sans-serif; }
body, p, label, input, textarea { font-family: var(--font-space), sans-serif; }
.mono, .stat-number, time { font-family: var(--font-mono), monospace; }
```

### Border Radius Policy

```
Primary cards:           border-radius: 0;        /* sharp */
Buttons (primary):       border-radius: 0;        /* sharp */
Buttons (secondary):     border-radius: 2px;      /* barely there */
Form inputs:             border-radius: 4px;      /* readable */
Avatars / profile pics:  border-radius: 0;        /* sharp */
Sponsor logos container: border-radius: 0;
BANNED: rounded-full, rounded-xl, rounded-2xl on ANY interactive element
```

### Spacing System (use Tailwind, these are for reference)
- Section vertical padding: `py-20` on desktop, `py-14` on mobile
- Card internal padding: `p-5` desktop, `p-4` mobile  
- Section heading gap below: `mb-12` desktop, `mb-8` mobile

### Tailwind v4 Known Bug
`mx-auto`, some responsive prefix classes, and certain utility classes do NOT generate CSS in this project's Tailwind v4 setup. This is documented in README and Handoff.md. **Use `style={{ margin: "0 auto" }}` for centering instead of `mx-auto`**. The rule in agents.md that says "NEVER inline styles" predates the discovery of this v4 bug. Inline styles are permitted ONLY for layout corrections where Tailwind v4 fails (centering, width, margin). Do not use inline styles for color, font, or visual properties.

---

## 6. Library Decisions

### Already Installed (wire properly)
- **Framer Motion** — use `motion.div` with `whileInView={{ opacity: 1, y: 0 }}` + `initial={{ opacity: 0, y: 24 }}` for section reveals. Stagger children 0.1s. Mount `PageTransition` in root layout (it exists but is not mounted).
- **React Three Fiber + Drei** — keep the kart model section. If `.glb` not in R2, show a static event photo from R2 with a coming-soon overlay.

### Install These (add to package.json)
```bash
npm install @formkit/auto-animate
```
Use `useAutoAnimate()` on the events grid container div. One line, animates list re-renders on filter switch.

### Pattern Monster
Pattern Monster (pattern.monster) generates pure SVG/CSS patterns. Export as inline SVG data URI for `background-image`. Use on:
- Hero section: diagonal speed lines, orange at 4% opacity on `--bg-base`
- Join CTA section: same pattern, slightly more opaque (6%)

Suggested pattern CSS (paste directly into globals.css, zero external request):
```css
/* Speed Lines pattern — for hero and join CTA backgrounds */
.pattern-speed-lines {
  background-color: var(--bg-base);
  background-image: repeating-linear-gradient(
    -55deg,
    transparent,
    transparent 4px,
    rgba(239, 93, 8, 0.04) 4px,
    rgba(239, 93, 8, 0.04) 5px
  );
}

/* Dot grid — for about / stats sections */
.pattern-dots {
  background-color: var(--bg-surface);
  background-image: radial-gradient(
    circle, rgba(239, 93, 8, 0.15) 1px, transparent 1px
  );
  background-size: 28px 28px;
}
```

### Do NOT Add
- GSAP, Lenis, or any scroll hijacking library
- Framer Motion `useSpring` parallax on images (kills mobile performance)
- Full Shadcn/Radix component library for public site (admin is different)
- Any icon library as a full package — import individual SVGs or use inline SVG
- Audio / music on page load

### Audio (if ever added)
User opt-in toggle only. Muted by default. Never autoplay. An ambient electrical hum or engine idle from R2 behind a speaker icon in the corner. Not recommended — visual motion is enough.

---

## 7. Per-Page Revamp Spec

### Global: Navbar

**Desktop:**
- Left: Club shield icon only (not the text "VEGAVATH"), links to `/`
- Center: `HOME · ABOUT · EVENTS · GALLERY · CREW · SPONSORS` in Chakra Petch 500, small, uppercase, tracking-widest
- Right: `JOIN US` as a sharp rectangular button, orange fill, Chakra Petch Bold

**Mobile:**
- Left: shield icon
- Right: hamburger → full-screen dark overlay with links in Orbitron large (this is the ONE place Orbitron is used besides the hero — for the mobile menu overlay)
- "JOIN US" visible at bottom of overlay, full-width button

**Styling:**
- Background: transparent on hero scroll, solid `--bg-base` after 80px scroll (use `useScrollY` from Framer Motion)
- No box-shadow or border-bottom
- Thin `1px solid var(--border)` appears after scroll with the background

---

### Global: Footer

Current footer is broken and generic. Replace entirely.

**Layout (desktop):** Two rows
- Row 1: Logo left | "TEAM VEGAVATH — PESU ECC" in Chakra Petch | Social icons right (just SVG icons, no next/image for these)
- Row 2: Nav links in Space Grotesk small | "© 2026 Team Vegavath" center | "Built by the Vegavath Coding Domain" right

**Mobile:** Stack vertically. Logo + name → social icons → nav links → legal line

Remove: "Made with ♥ by Vegavath Team" | emoji in any footer element | the four-column layout entirely

Social icons: Inline SVG, not next/image. White at 60% opacity, full white on hover.

---

### `/` (Home)

**Hero section** (`pattern-speed-lines` background):
- Full `100svh`
- Center aligned, large
- "VEGAVATH" in `--font-orbitron`, `clamp(72px, 16vw, 160px)`, letter-spacing tight
- Below: "PESU ECC — RACING TOWARD INNOVATION" in Chakra Petch, small caps, Space Grotesk tracking-widest would also work
- Below: "Karts. Code. Innovation." in Space Grotesk, `--text-secondary`
- Two CTAs in a row: `[JOIN THE TEAM]` (orange fill, sharp) · `[VIEW EVENTS]` (transparent, `--border-strong` border, white text). Both rectangular, no radius, Chakra Petch Bold uppercase
- No emojis. No arrows on buttons unless it's a real `→` character, not an arrow emoji.

**Stats Ticker** (immediately below hero, thin bar):
- `200+ FOOTFALL · 2 MAJOR EVENTS · 85 MEMBERS · 6 DOMAINS`
- Space Mono, small, all caps
- `border-top: 1px solid var(--border)` and `border-bottom: 1px solid var(--border)`
- Orange `·` separator
- On mobile: horizontal scroll or marquee

**3D Kart Section:**
- Keep React Three Fiber. Load with `dynamic(() => import(...), { ssr: false })` — this is already the pattern
- If `.glb` not in R2 `models/` folder, show a Vegavath event photo from R2 as a full-width editorial image instead, with text overlay: "BUILD REVEAL COMING SOON"

**Domains Section:**
- NO emojis. Completely remove.
- 6 sharp rectangular tiles in a grid: 2×3 on mobile, 3×2 on tablet, 6×1 row on desktop
- Each tile: large abbreviated letter in Orbitron behind (eg. "C" for Coding), 15% opacity `--accent`, domain name in Chakra Petch Bold in front, white
- Hover: `--accent` background, letter goes white, domain name goes `--bg-base`
- Thin `1px solid var(--border)` between tiles, no border-radius

**Events Section:**
- Remove "Upcoming Events / Past Events" h2 headers — replace with a single heading "EVENTS" and a `[VIEW ALL →]` link
- Upcoming: if none, show: "Next event — TBA. Follow [@teamvegavath_pesu](https://www.instagram.com/teamvegavath_pesu/) to stay updated." — not just "Check back soon."
- Past event cards: Editorial horizontal layout on desktop. `border-left: 2px solid var(--accent)` on each card. Date in Space Mono small at top. Title in Chakra Petch. Category as uppercase plain text label (no pill). No box-shadow.
- Framer Motion stagger on cards: `whileInView`, stagger 0.08s

**Sponsors Strip:**
- CSS marquee (existing) — style fix: all logos `filter: brightness(0) invert(1)` at 60% opacity, full white on hover. `object-fit: contain` inside `64px` height containers. No border, no card, just the logo images scrolling.

**Join CTA Section:**
- `clip-path: polygon(0 32px, 100% 0, 100% 100%, 0 100%)` on top edge
- Background: `--accent` (orange). Text: `--bg-base` (near-black).
- "JOIN THE TEAM" in Chakra Petch Bold, very large
- One-line subtext in Space Grotesk
- Button: `--bg-base` fill, white text, sharp rectangle: "APPLY NOW"
- NO emojis anywhere in this section

---

### `/about`

**Hero:**
- Team photo from R2 (`team/team-photo.jpeg`) full-bleed, dark gradient overlay (bottom-heavy)
- Text overlay: "BUILT BY STUDENTS." line break "FOR STUDENTS." in Chakra Petch Bold, white, large
- No "Who We Are" label, no "About Team Vegavath" subhead — the photo + text IS the header

**Mission / What We Do:**
- Mission: pull-quote styling. Large, italic, Space Grotesk. `--gold` color accent word or phrase. No "Our Mission" heading.
- Domains: **identical component to home page domain tiles**. Pull into a shared `<DomainGrid />` component. No emoji.

**Stats:**
- Make stats dramatic. Space Mono for numbers (`font-size: clamp(48px, 8vw, 96px)`), Space Grotesk for label below.
- "200+" then "FOOTFALL" below. "2" then "MAJOR EVENTS". "85" then "ACTIVE MEMBERS". "6" then "DOMAINS"
- `pattern-dots` background on this section

**Timeline:**
- DO NOT include the fake 2020–2023 timeline data.
- EITHER: Remove the timeline section entirely until real data from seniors is available
- OR: Show only confirmed events: Freshers Day (Sep 2025) → Ignition 1.0 (Nov 2025, 200+ footfall) → EmbedX 2.0 (Feb 2026). Simple vertical line, date in Space Mono, event name in Chakra Petch.

**Values:**
- Remove all four emojis (💡🏆🤝🚀).
- Replace with CSS geometric shapes: a thin orange circle outline, an orange triangle outline, an orange square outline, an orange hexagon outline. Pure CSS, zero weight.
- Value name in Chakra Petch SemiBold. Description in Space Grotesk.

**Sponsors Marquee:**
- Same fix as home page sponsor strip: logos grayscale/white, full color on hover, `object-fit: contain`, no cards.

---

### `/events`

**Filter tabs:**
- Currently pill buttons. Replace: sharp rectangular tabs, no background.
- Active state: `border-bottom: 2px solid var(--accent)`, text `--text-primary`
- Inactive: text `--text-muted`, hover `--text-secondary`
- No border-radius on tabs

**Event cards:**
- Date in Space Mono, small, top of card
- Category as thin uppercase Space Grotesk label (no pill)
- Title in Chakra Petch SemiBold
- `border-left: 2px solid var(--accent)` on card
- Hover: slight brightness lift, reveal "VIEW DETAILS →" as overlay or link

**Auto Animate:**
- Apply `useAutoAnimate` to the grid container — list reorders/filters animate smoothly

---

### `/events/[slug]`

- Event title in Chakra Petch Bold, large
- Date / category in Space Mono
- Cover image full-width (once admin upload is implemented)
- Gallery grid from DB
- Registration status is live (SSR, no cache) — if `registration_open: false`, show "Registration is closed for this event." Clean, no emoji.

---

### `/gallery`

- Masonry grid: keep
- Lightbox: keep
- Event filter: same sharp rectangular tab treatment as events page
- No changes to functionality, only styling

---

### `/crew`

**Core tier:**
- Desktop: horizontal cards (photo left ~120px, info right)
- Mobile: compact card, photo top, info below
- Name in Chakra Petch SemiBold
- Role in Space Grotesk small caps
- Domain: small uppercase text label at bottom, `--text-muted`. NO pill badge.
- Photo: `border: 1px solid var(--border)`, no border-radius

**Crew / Legacy tiers:**
- Denser grid (3-4 columns desktop, 2 columns mobile)
- Same no-emoji, no-pill treatment
- No badge for tier (the section heading already says "Core" / "Crew" / "Legacy")

---

### `/join`

**Recruitment Open state:**

Desktop — split layout:
- Left 40%: `--accent` orange background, "JOIN\nTHE\nTEAM" in Chakra Petch Black, stacked vertically, `--bg-base` text. Club logo mark. Domain list in small Chakra Petch.
- Right 60%: dark background, form

Mobile — stacked:
- Top: branding bar (orange strip, logo + "JOIN THE TEAM")
- Below: form

**Form styling:**
- Input fields: `border: none`, `border-bottom: 1px solid var(--border-strong)`, `background: transparent`, bottom-border goes `--accent` on focus
- No box-border inputs
- Domain selection: 6 tap-target tiles (not a dropdown) — same domain tile treatment as other sections, selected = orange fill
- Submit: full-width `--accent` background button, "SUBMIT APPLICATION", Chakra Petch Bold, uppercase, NO emoji

**Recruitment Closed state:**
- Do not hide or downplay it.
- Show: "Recruitment is currently closed." in Chakra Petch SemiBold, large
- Below: "Follow us on Instagram to be notified when we open." with Instagram handle link
- Logo mark visible

---

### `/admin` pages

- Fix the password crash: add `try/catch` around the bcrypt compare in `src/lib/auth.ts` credentials provider
- Admin styling: minimal, functional. Dark sidebar nav, sharp tabs for content areas. NOT pretty — it's internal tooling.
- Admin events page: implement the create/edit form with image upload to R2 via `/api/admin/upload`. This unlocks event thumbnails on the public site.
- Admin team page: same — implement the create/edit form with photo upload.

---

## 8. Animation Guidelines

**What to animate (Framer Motion):**
- Section reveals: `opacity: 0 → 1`, `y: 24 → 0`, triggered by `whileInView`, `once: true`
- Staggered children: `staggerChildren: 0.08` on the parent `variants`
- Navbar background: `useScrollY` threshold at 80px — animate `backgroundColor` from transparent to `--bg-base`
- Page transition: mount `PageTransition` (it exists in `src/components/layout/PageTransition.tsx`), simple fade 200ms

**What NOT to animate:**
- Parallax on any image (mobile kills it)
- 3D card tilts on hover (motion sickness on mobile)
- Text scramble effects (gimmicky)
- Cursor followers (RacingCursor is fine as opt-in toggle, but off by default on mobile)
- Anything that would cause layout shift

---

## 9. Sponsors Carousel — Consistency Fix

All sponsor logos in the marquee and standalone sponsor grid MUST:
- Render inside a fixed-height container: `height: 48px` (marquee) / `height: 64px` (sponsors grid)
- Use `object-fit: contain`, `object-position: center`
- Apply `filter: brightness(0) invert(1)` at base state (makes all logos white/grayscale)
- On hover: `filter: none` (shows original color)
- Max-width: `160px` per logo in marquee, `200px` in sponsors grid
- No card borders around individual logos
- Consistent gap between logos

---

## 10. Prompting Strategy for Claude Code

### Order of operations — do not skip steps

**Session 0 — Context load:** Feed this document, README.md, Handoff.md, agents.md. Tell Claude Code: "You are revamping the frontend of this Next.js 16 App Router site. Architecture, data layer, and API routes are complete and working. You only touch files listed under 'You ARE touching' in context_for_revamp.md."

**Session 1 — Design tokens + fonts:**  
Task: "Set up the font stack in `src/app/layout.tsx` using `next/font/google` for Orbitron (900), Chakra Petch (400/600/700), Space Grotesk (400/500/600), Space Mono (400/700). Pass them as CSS variables. Update `src/app/globals.css` with the full CSS custom property block from the design system section. Remove all existing `@apply` blocks that reference the old color names. Run `npm run build` and confirm 0 errors before continuing."

**Session 2 — Global components:**  
Task: "Rebuild `src/components/layout/Navbar.tsx` per the spec in context_for_revamp.md Section 7. Then rebuild `src/components/layout/Footer.tsx`. Then wire the existing `PageTransition` component into `src/app/layout.tsx`. Run `npm run build` and confirm 0 errors."

**Session 3 — Home page:**  
Task: "Rebuild `src/app/(public)/page.tsx` and all components under `src/components/home/` per spec. Do not change any data fetching logic. Hero, stats ticker, domain tiles (new DomainGrid component), events preview, sponsors strip, join CTA. Verify: no emojis, no pill badges, no 'Our X' headings, no gradient text."

**Session 4 — About page:**  
Task: "Rebuild `/about`..." (same pattern)

**Sessions 5–8:** Events → Crew → Join → Gallery/Sponsors → Admin fixes

### Gate after every session
Before moving to the next session, verify:
1. `npm run build` passes with 0 TypeScript errors
2. No emoji characters anywhere in JSX
3. No `rounded-full` or `rounded-xl` on any interactive element
4. Section headings use Chakra Petch (not Orbitron, not Inter)
5. "VEGAVATH" in hero uses Orbitron
6. Mobile layout is correct on 375px viewport
7. No `mx-auto` — use `style={{ margin: "0 auto" }}` where centering needed

---

## 11. Known Landmines for Claude Code

1. **Tailwind v4 centering:** `mx-auto` does not work. Use `style={{ margin: "0 auto" }}`. This is documented behavior, not a bug to fix.

2. **R2 bucket structure mismatch:** Live R2 has `gallery/`, `icons/`, `models/`, `payments/`, `sponsors/`, `team/`. Architecture doc shows `events/` prefix folder which may not exist yet. Event media may be directly under `gallery/` without event subdirectories. The `payments/` folder contains payment guide screenshots — NOT application data, NOT gallery content.

3. **Admin CRUD incomplete:** Tasks.md shows admin events CRUD with image upload as NOT done. Event `cover_image_url` is null for all events, hence blank previews. Implementing the admin upload flow (using `/api/admin/upload` which already exists) is part of this revamp's scope.

4. **Auth crash:** Missing try/catch in bcrypt compare in `src/lib/auth.ts`. Fix this in Session 2 (global components session). It's one try/catch block.

5. **Font loading:** `Chakra_Petch` is the import name (underscore, not hyphen). `Space_Grotesk` and `Space_Mono` similarly. Double-check `next/font/google` import names — they use underscores matching the function name, not the display name.

6. **PageTransition:** Component exists at `src/components/layout/PageTransition.tsx` but is not mounted in `src/app/layout.tsx`. Mount it in Session 2.

7. **Environment variables mismatch:** README shows `CLOUDFLARE_*` variable names in the env section, but actual implementation code uses `R2_*` and `NEXT_PUBLIC_R2_PUBLIC_URL`. The code is correct; the README is wrong. Do not change any env variable names or usage in code.

8. **RacingCursor component:** Keep it. Ensure it disables itself on touch devices (it should already, but verify). It should be off by default, togglable via the CursorToggle component.

---

## 12. Priority Order

If limited on time or credits:

| Day | What |
|-----|------|
| 1 | Design tokens + fonts + Navbar + Footer + PageTransition wire |
| 2 | Home page complete |
| 3 | Join page (recruitment-critical) |
| 4 | About + Events list |
| 5 | Crew + admin auth crash fix + admin events CRUD upload |
| 6 | Gallery + Sponsors + Event detail page |
| 7 | Polish pass, mobile QA, `npm run build` final check |

---

## 13. Copy Reference — Real Vegavath Data

Use this instead of letting Claude Code hallucinate content:

**Events (real, from DB):**
- Freshers Day 2025 — 17 Sep 2025
- Ignition 1.0 — 07 Nov 2025 (IoT/Hackathon, 200+ footfall, one of the largest campus hackathons at PESU ECC)
- EmbedX 2.0 — 20 Feb 2026

**Sponsors (real, from R2 and DB):**
Xylem, Ather Energy, Mahindra, BMW Motorrad, SOLIDWORKS

**Club stats (real and verifiable):**
- 200+ footfall (Ignition 1.0)
- 2 major events
- 85 active members
- 6 domains (Coding, Automotives, Sponsorship & Finance, Robotics, Operations, Social Media)

**Social:**
- Instagram: @teamvegavath_pesu
- LinkedIn: company/team-vegavath-pesu  
- GitHub: github.com/Team-Vegavath
- Email: teamvegavathracing@pes.edu

**Do not use:** "10+ Projects", "3+ Awards", the 2020–2023 timeline, "Life At Full Throttle" (tagline is okay but don't make it the hero subtext)

---

*End of revamp context. Feed this to Claude Code at the start of every session. Update the "Current State" section as tasks are completed.*
