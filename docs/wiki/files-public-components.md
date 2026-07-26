# Public Components

Per-file reference for the public and shared React components of the Team
Vegavath website (Next.js 16 App Router, TypeScript strict). These are the
components that render the public-facing pages (home, about, events, gallery,
join, docs) plus the shared layout chrome (navbar, footer, cursor, page
transition) and low-level UI primitives. Admin, bootstrap, and page-level
files are documented elsewhere.

Every entry below was written against the actual source. Each covers: path
and purpose, props, state, key functions and any API calls, render logic, and
why the component exists.

## Table of contents

- [about/AboutHeroImage.tsx](#aboutaboutheroimagetsx)
- [docs/DocsContent.tsx](#docsdocscontenttsx)
- [docs/DocsSidebar.tsx](#docsdocssidebartsx)
- [events/EventCard.tsx](#eventseventcardtsx)
- [events/EventMediaClient.tsx](#eventseventmediaclienttsx)
- [events/EventsClient.tsx](#eventseventsclienttsx)
- [gallery/GalleryClient.tsx](#gallerygalleryclienttsx)
- [home/DomainGrid.tsx](#homedomaingridtsx)
- [home/EventsPreview.tsx](#homeeventspreviewtsx)
- [home/KartGame.tsx](#homekartgametsx)
- [home/KartGameWrapper.tsx](#homekartgamewrappertsx)
- [home/KartModelSection.tsx](#homekartmodelsectiontsx)
- [home/KartModelWrapper.tsx](#homekartmodelwrappertsx)
- [home/StatsTicker.tsx](#homestatstickertsx)
- [join/JoinClient.tsx](#joinjoinclienttsx)
- [layout/CursorControls.tsx](#layoutcursorcontrolstsx)
- [layout/CursorToggle.tsx](#layoutcursortoggletsx)
- [layout/Footer.tsx](#layoutfootertsx)
- [layout/Navbar.tsx](#layoutnavbartsx)
- [layout/PageTransition.tsx](#layoutpagetransitiontsx)
- [layout/RacingCursor.tsx](#layoutracingcursortsx)
- [sponsors/SponsorMarquee.tsx](#sponsorssponsormarqueetsx)
- [ui/Container.tsx](#uicontainertsx)
- [ui/Reveal.tsx](#uirevealtsx)
- [Note on the crew/ directory](#note-on-the-crew-directory)

---

## about/AboutHeroImage.tsx

**Purpose.** Client component: the full-bleed team-photo hero on the /about
page, clickable to open a zoomable lightbox.

**Props.** None.

**State.**
- `open: boolean` -- whether the lightbox is open.

**Key functions.** No standalone functions; the `<section>` `onClick` sets
`open` to `true` and the lightbox `close` callback sets it back to `false`. No
API calls. The team photo is a hard-coded R2 URL constant (`TEAM_PHOTO`).

**Render logic.** Always renders a `<section>` with a Next `Image` (`fill`,
`priority`, `objectFit: cover`) plus a bottom-only linear-gradient scrim (so
faces higher in the frame stay clear) and an overlaid uppercase headline
("Built by students. For students.") with a "Tap to view full photo" caption.
A `Lightbox` (yet-another-react-lightbox) with the Zoom plugin renders the same
image at `zIndex: 99999` when `open`. No loading/error/empty branches.

**Why it exists.** Turns the static about-page hero into an interactive,
zoomable focal point while keeping the headline legible over the photo. Uses
the shared lightbox library rather than a bespoke overlay so it matches the
gallery/events zoom behaviour.

---

## docs/DocsContent.tsx

**Purpose.** Server component (no "use client"): renders a markdown string into
the site's editorial styling via `react-markdown` with a full set of custom
element renderers.

**Props.**
- `markdown: string` -- the raw markdown body to render.

**State.** None (pure render).

**Key functions.** No exported helpers; module constants `HEADING_FONT`,
`BODY_FONT`, `MONO_FONT` map to the CSS font-variable tokens
(`--font-chakra`, `--font-space`, `--font-mono`). The `components` map passed
to `ReactMarkdown` overrides h1/h2/h3, p, code, pre, table/th/td, li/ul/ol,
strong, blockquote, and a. `remarkGfm` is enabled for GitHub-flavoured markdown
(tables, etc.). No API calls.

The `code` renderer is the notable one: react-markdown v10 dropped the
`inline` prop, so block versus inline code is detected manually -- it is
treated as a block if the className matches `/language-/` or the contents
contain a newline; otherwise it renders as an inline accent-coloured span.

**Render logic.** Single pass, no conditional states -- it wraps the parsed
markdown in a `<div>`. Every element is styled inline with the design tokens
(headings in Chakra, body in Space, code in mono; tables wrapped in an
`overflow-x: auto` container).

**Why it exists.** The /docs pages store content as markdown; this component is
the single styling authority that makes rendered docs match the sharp/dark
editorial aesthetic without any external markdown CSS. Centralising the element
map keeps every docs page visually consistent.

---

## docs/DocsSidebar.tsx

**Purpose.** Client component: the left-hand navigation for the /docs section,
built from a static config and highlighting the active page.

**Props.** None.

**State.** None; reads the current route via the `usePathname()` hook.

**Key functions.** No standalone functions. Iterates `DOC_SECTIONS` (imported
from `@/lib/docs-config`); for each page it computes `href` (`"/docs"` when the
slug is empty, otherwise `/docs/${slug}`) and `active = pathname === href`. No
API calls.

**Render logic.** Renders a "Documentation" heading, then each section title
with its list of `Link`s. Active links get accent colour, an `--accent-dim`
background, and a 2px accent left border; inactive links are muted with a
transparent border. No loading/empty branches (config is always present).

**Why it exists.** Gives the docs a persistent, config-driven nav where the
active page is obvious. Because it consumes `DOC_SECTIONS`, adding a doc page is
a config edit, not a component change.

---

## events/EventCard.tsx

**Purpose.** Shared (server-safe) presentational card for a single event, used
by both the home events preview and the /events list so the two grids cannot
drift apart.

**Props.**
- `event: EventCardData` -- the card data. `EventCardData` is exported from
  this file: `{ slug, title, category, event_date, cover_image_url }` where
  `cover_image_url` is `string | null`.
- `upcoming?: boolean` -- when true, the category label is prefixed with
  `UPCOMING ·`.

**State.** None.

**Key functions.**
- `formatDate(date)` -- module-level helper formatting the ISO date to
  `en-IN` `dd Mon yyyy`.

No API calls.

**Render logic.** The whole card is a `Link` to `/events/${slug}`. If
`cover_image_url` is present it renders a Next `Image` (`fill`, `objectFit:
cover`); otherwise it renders an empty media block showing the category in mono
as a placeholder. Body shows the formatted date, the title, the category label
(with the optional UPCOMING prefix), and a "VIEW DETAILS ->" affordance.

**Why it exists.** One source of truth for event-card markup. The exported
`EventCardData` type is deliberately narrower than the full `Event` type so
both consumers can pass minimal data.

---

## events/EventMediaClient.tsx

**Purpose.** Client component: the media grid on a single event detail page,
mixing image tiles (open in a lightbox) and video tiles (open in a portrait
YouTube modal).

**Props.**
- `items: GalleryItem[]` -- the media items for this event (images and videos).
- `eventTitle: string` -- used for alt text fallbacks.

**State.**
- `lightboxIndex: number` -- index into the image-only slide array; `-1` means
  closed.
- `activeVideo: string | null` -- the embed URL of the currently open video, or
  null.

**Key functions.**
- `getYouTubeId(url)` -- module helper extracting the id from an `embed/...`
  URL.
- `PlayIcon()` -- inline SVG play button (square, matches the no-rounded rule).
- `openLightbox(imageIndex)` -- memoised (`useCallback`) setter for
  `lightboxIndex`.

`imageItems` filters items to images; `slides` maps those to lightbox slides.
For each rendered item the image index is resolved via `findIndex` on the
image-only array so the lightbox opens on the correct slide. No API calls
(YouTube thumbnails are derived image URLs).

**Render logic.** An auto-fit CSS grid of `<article>` tiles. Image tiles show
the Next `Image` with a hover "VIEW" overlay; video tiles show the YouTube
`hqdefault` thumbnail (or `thumbnail_url`) with a play-icon scrim. Clicking an
image opens the lightbox; clicking a video sets `activeVideo`. The lightbox
(Zoom + Thumbnails plugins) is open when `lightboxIndex >= 0`. The video modal
is a fixed full-screen overlay with a 9/16 iframe and a close button; clicking
the backdrop closes it, clicks inside the frame are stopped from propagating.
No explicit empty state (an empty `items` renders an empty grid).

**Why it exists.** Event pages need the same lightbox + YouTube-embed behaviour
as the gallery but scoped to one event's media. The image-index remapping
exists because videos are interleaved with images but the lightbox only holds
images.

---

## events/EventsClient.tsx

**Purpose.** Client component: the filterable event grid on the /events page.

**Props.**
- `events: Event[]` -- all events to display (already fetched server-side).

**State.**
- `activeFilter: FilterLabel` -- selected category tab; one of "All",
  "Workshops", "Hackathons", "Competitions", "Talks". Defaults to "All".
- `gridRef` -- ref from `useAutoAnimate` (@formkit/auto-animate) for animated
  add/remove of cards when the filter changes.

**Key functions.** No standalone functions. `filtered` derives the visible list
by case-insensitive comparison of `e.category` against the active label ("All"
passes everything through). No API calls.

**Render logic.** A `role="tablist"` row of filter buttons (active tab gets an
accent underline). If `filtered.length === 0`, renders a message linking to the
club Instagram; otherwise renders the auto-animated grid of `EventCard`s.

**Why it exists.** Client-side filtering keeps the page responsive without
re-fetching, and reusing `EventCard` guarantees consistency with the home
preview. Note the "Hackathons" filter label exists here even though (per the
project's known-open-items) the DB CHECK constraint still rejects that category
on create -- filtering is unaffected since it only reads existing rows.

---

## gallery/GalleryClient.tsx

**Purpose.** Client component: the full /gallery masonry grid with per-event
filter tabs, an image lightbox, and a YouTube video modal.

**Props.**
- `items: GalleryItem[]` -- all gallery media.
- `filters: FilterOption[]` -- filter tabs, each `{ id, label }` where id is an
  event id or the literal `"all"`.

**State.**
- `activeFilter: string | "all"` -- selected filter; defaults to "all".
- `activeVideo: string | null` -- URL of the open video modal, or null.
- `lightboxIndex: number` -- index into the image-only slides; `-1` closed.

**Key functions.**
- `getYouTubeId(url)` -- module helper (embed-URL id extraction).
- `PlayIcon()` -- inline square SVG play button.
- `openLightbox(index)` -- memoised setter for `lightboxIndex`.

`filtered` selects items by `event_id === activeFilter` (or all). `slides` is
the image-only subset mapped to lightbox slides. Per item, `imageIndex` is
computed by counting images in the filtered list up to and including the
current index, so the lightbox opens on the right slide despite interleaved
videos. No API calls.

**Render logic.** A `role="tablist"` filter row (accent underline on the active
tab). If `filtered.length === 0`, shows "No photos yet."; otherwise a
`.gallery-columns` masonry grid of `<article>` tiles. Image tiles render a Next
`Image` (intrinsic 800x600, auto height) with a hover "VIEW" overlay; video
tiles render the YouTube thumbnail with a play-icon scrim. The `Lightbox` uses
Zoom, Thumbnails, and Video plugins. The video modal is the same fixed 9/16
iframe overlay pattern as EventMediaClient, with backdrop-to-close and inner
click-stop.

**Why it exists.** The public gallery needs event-scoped filtering plus the
mandated lightbox + YouTube-embed behaviour in one place. The image-index
counting logic is the key subtlety: the lightbox array excludes videos, so a
naive array index would open the wrong slide.

---

## home/DomainGrid.tsx

**Purpose.** Client component: the six clickable domain tiles on the home page,
each opening an animated modal popup with that domain's description.

**Props.** None (exported as a named `DomainGrid`).

**State.**
- `activeDomain: DOMAIN | null` -- the domain whose modal is open, or null.

`DOMAINS` is a module constant of six entries -- Coding (COD), Automotives
(AUT), Sponsorship & Finance (S&F), Robotics (ROB), Operations (OPS), Social
Media (SOC) -- each with `abbr`, `name`, and `description`.

**Key functions.** Two effects:
- An Escape-key listener that closes the modal (added only while a domain is
  active).
- A body-scroll lock (`document.body.style.overflow = "hidden"`) while a modal
  is open, restored on close/unmount.

Tiles are keyboard-accessible: `role="button"`, `tabIndex=0`, and Enter/Space
open the modal. No API calls.

**Render logic.** Always renders the `.domain-grid` of tiles (each showing the
abbreviation and full name). Inside `AnimatePresence`, when `activeDomain` is
set, it renders a fading backdrop plus a scaling `role="dialog"` card. The card
is positioned with framer-motion `x`/`y: "-50%"` (not a raw CSS transform)
because framer owns the transform while animating scale and would otherwise
drop the centring translate. The card shows a large faint watermark of the
abbreviation, a close button, the domain name, and its description.

**Why it exists.** Communicates the club's six domains interactively on the
landing page. The `x`/`y` centring detail is a deliberate workaround for a
framer-motion transform conflict; the scroll lock and Escape handling make the
popup behave like a proper modal.

---

## home/EventsPreview.tsx

**Purpose.** Client component: the home-page "EVENTS" section showing a few
upcoming and past events with a staggered scroll-in animation.

**Props.**
- `upcoming: EventCardData[]` -- upcoming events.
- `past: EventCardData[]` -- past events.

**State.** None.

**Key functions.**
- `InstagramTeaser()` -- local component rendering a "follow us for updates"
  fallback line.

Module constants `listVariants` / `itemVariants` define the framer stagger
(0.08s between children, each fading up 16px). No API calls.

**Render logic.** Header row with an "EVENTS" heading and a "VIEW ALL ->" link
to /events. If both lists are empty, renders only the `InstagramTeaser`. If
`upcoming` is empty but `past` is not, it shows the teaser above the grid.
Otherwise renders a `motion.div` grid that animates in on scroll (`whileInView`,
`once`), rendering upcoming cards first (with `upcoming` flag) then past cards.

**Why it exists.** Surfaces recent activity on the landing page while
gracefully degrading to an Instagram call-to-action when there is nothing to
show. Reuses `EventCard` for grid parity with the /events page.

---

## home/KartGame.tsx

**Purpose.** Client component: the interactive F1 kart lane-dodger game
embedded in the 404 (not-found) page. A dependency-free 2D `<canvas>` game;
all game state lives in refs/closures so the animation loop never triggers a
React re-render.

**Props.** None (default export).

**State (React).** None. Refs only:
- `wrapRef` -- the sizing wrapper div.
- `canvasRef` -- the `<canvas>`.
- `rafRef` -- the current `requestAnimationFrame` id.

All mutable game state lives in a plain object `g` inside the mount effect:
`state` ("idle" | "playing" | "dead"), `livery` index, `lane` (0-2), `carY`,
`speed`, `frames`, `tick`, `spawnIn`, `distance`, `obstacles`, `kmh`, `flash`,
`hiscore`, `newRecord`.

**Liveries.** Five F1 liveries (`PAPAYA`, `MIDNIGHT`, `SCUDERIA`, `PETRONAS`,
`WILLIAMS`), each a colour set. `carSvg(l)` builds a side-profile F1 car SVG
string from a livery; `carDataUri(l)` encodes it as a `data:image/svg+xml` URI.
On mount each livery is rasterised into an `Image` for fast canvas drawing.

**Lane / tuning system.** Three lanes at vertical fractions `[0.22, 0.5, 0.78]`
of a height that is fixed once on mount (`min(500, max(300, innerHeight*0.45))`).
Four "gears" with increasing speed (`GEARS` px/frame) that engage at
`GEAR_TIMES` (0/15/35/60 s) and progressively shorten the obstacle spawn
interval (`SPAWN_INTERVAL`).

**Obstacle types (`ObKind`).**
- `cone` -- a single traffic cone in one random lane.
- `double` -- a cone pair blocking two adjacent lanes (forces a specific lane).
- `oil` -- an iridescent oil slick stripe on the centre line, dodged by holding
  the top or bottom lane.
`pickKind(gear)` weights the mix so higher gears introduce doubles then oil.

**Key functions (inside the effect).**
- `fit()` -- sizes the canvas to the wrapper with devicePixelRatio scaling;
  re-run by a `ResizeObserver`.
- `reset()` / `start()` / `restart()` / `die()` -- state transitions.
  `restart()` also re-randomises the livery. `die()` computes distance in km
  and writes a new hi-score.
- `gearIndex()` -- current gear from elapsed frames.
- `spawn(gear)` -- pushes a new obstacle off the right edge.
- `update()` -- the fixed-timestep simulation: advances streaks, speed,
  distance, car lerp toward the target lane, km/h readout, spawns, obstacle
  movement, and AABB collision (car hitbox 90x28; oil is a centre-line kill
  window).
- `drawCone`, `drawOil`, `drawCar`, `drawHUD` (gear + distance), `drawSpeedo`
  (analogue km/h gauge), `drawLiveryRow`, `drawIdle`, `drawDead`, `render` --
  all canvas drawing.
- Input handlers: `onKey` (arrows/WASD to steer, any key to start, Space/Enter
  to restart), `onTouchStart` / `onTouchEnd` (swipe up/down to steer, tap to
  start/restart), `onClick` (mouse fallback, suppressed for 30 ticks after a
  touch so a tap does not double-fire).
- `loop(now)` -- the rAF loop with a fixed 60 Hz accumulator (`STEP = 1000/60`,
  tab-switch gap clamped to 100ms) so game speed is identical on 60/120/144 Hz
  displays; rendering runs every frame.

**localStorage hi-score.** Key `vg-404-hiscore` stores the best distance in km
(one decimal). Read on mount and written in `die()`; all access is wrapped in
try/catch so private mode degrades to a session-only score.

**Colours.** Canvas 2D cannot read CSS variables, so a `C` constant mirrors the
globals.css tokens (bg, accent, gold, error, text, etc.) as hex, and font
family strings are resolved once from `getComputedStyle` on the root element so
`ctx.font` can use the next/font families.

**Render logic (React side).** Renders a max-width wrapper div and a single
`<canvas>` (`touchAction: none`, `cursor: pointer`). Idle/playing/dead are
drawn entirely on the canvas -- idle shows the title, controls, best score, and
a livery row; dead shows "RACE OVER", distance, and a NEW RECORD / best line.
The cleanup return cancels the rAF, disconnects the ResizeObserver, and removes
all listeners.

**Why it exists.** Turns the 404 page into a branded, playful F1 mini-game that
matches the motorsport theme. Keeping all state in refs/closures (not React
state) avoids re-rendering 60 times a second; the fixed timestep guarantees
consistent difficulty across refresh rates.

---

## home/KartGameWrapper.tsx

**Purpose.** Client component: a thin wrapper that dynamically imports
`KartGame` with SSR disabled.

**Props.** None.

**State.** None.

**Key functions.** Uses `next/dynamic` to import `KartGame` with `ssr: false`
and a loading placeholder (a bordered box matching the game's footprint).

**Render logic.** Renders `<KartGame />`; shows the placeholder while the chunk
loads.

**Why it exists.** `not-found.tsx` is a server component (it exports metadata),
and `ssr: false` is only allowed in client components -- so the dynamic import
has to live in this small client wrapper. The canvas game also has no meaningful
server render, so skipping SSR is correct.

---

## home/KartModelSection.tsx

**Purpose.** Client component: the interactive React Three Fiber 3D viewer for
the team's go-kart model on the home page.

**Props.** None (default export).

**State.**
- `isTouch: boolean` -- whether the device is touch-capable (set on mount).
- `interacting: boolean` -- on touch devices, whether the canvas currently
  captures pointer/scroll.
- `resetTimer` (ref) -- the timeout that auto-releases interaction.

**Key functions.**
- `KartModel()` -- loads the `.glb` from R2 via `useGLTF` and renders it as a
  `<primitive>`. (`KART_URL` is a hard-coded R2 asset.)
- `LoadingBox()` -- a plain dark box mesh shown as the Suspense fallback while
  the model loads.
- `activateInteraction()` -- enables interaction and (re)starts a 4-second
  timer that turns it back off.
- Mount effect detects touch (`ontouchstart` / `maxTouchPoints`) and clears the
  timer on unmount.

No API calls beyond loading the GLB asset.

**Render logic.** A bordered card containing a `Canvas` (`frameloop="demand"`).
Inside Suspense: a `Stage` (city environment, rembrandt preset) wrapping the
kart, plus `OrbitControls` (zoom on, pan off, slow auto-rotate, clamped polar
angles). On touch devices, while not interacting the canvas has
`pointerEvents: none` and a "Tap to interact" overlay is shown; tapping
activates interaction (auto-reset after 4s of no touches). A footer caption
reads "Drag to rotate - scroll to zoom".

**Why it exists.** Shows off the physical kart in 3D. The tap-to-activate gate
exists because on touch devices OrbitControls swallows every touch, which would
otherwise trap the page and prevent scrolling past the canvas; desktop
behaviour is unchanged. Per project rules this model renders on all viewports
(no mobile placeholder).

---

## home/KartModelWrapper.tsx

**Purpose.** Client component: dynamically imports `KartModelSection` with SSR
disabled.

**Props.** None.

**State.** None.

**Key functions.** `next/dynamic` import of `KartModelSection` with
`ssr: false` and a plain bordered-box loading placeholder sized to the viewer
(28rem tall).

**Render logic.** Renders `<KartModelSection />`; placeholder while loading.

**Why it exists.** React Three Fiber cannot server-render, and `ssr: false` is
only valid inside a client component, so the dynamic import is isolated here.
This is the same pattern as `KartGameWrapper`. Per the project gotchas, this
wrapper renders the 3D kart on all viewports -- the mobile placeholder was
removed deliberately.

---

## home/StatsTicker.tsx

**Purpose.** Client component: a small rotating stats carousel (one stat at a
time) shown on the home page.

**Props.** None (exported as named `StatsTicker`).

**State.**
- `index: number` -- which stat is currently shown.

`STATS` is a module constant: `2 MAJOR EVENTS`, `85 MEMBERS`, `6 DOMAINS`.

**Key functions.** A mount effect sets a 3-second `setInterval` that advances
`index` modulo `STATS.length`; cleared on unmount. `stat` reads the current
entry with an `?? STATS[0]` guard. No API calls.

**Render logic.** A bordered horizontal bar. `AnimatePresence` in `mode="wait"`
swaps the current stat with a vertical slide/fade keyed on `index` (value in
accent, label in muted mono). A row of progress dots highlights the active
stat.

**Why it exists.** A compact, animated way to surface headline club numbers
without a static list. The modulo and `??` guard keep `index` always in range.

---

## join/JoinClient.tsx

**Purpose.** Client component: the four-step recruitment application form on
/join, driven by a single `<form>` element. Includes a closed-recruitment
gate, a cookie-based already-applied deterrent, a honeypot, domain tiles, and a
success screen.

**Props.**
- `recruitmentOpen: boolean` -- when false, the whole form is replaced by a
  "recruitment closed" screen.

`DOMAINS` (six values: Coding, Automotives, Sponsorship, Robotics, Operations,
Social Media) and `SEMESTERS` (1st/3rd/5th) are module constants; the comment
notes these must stay in sync with `/api/join` and the DB CHECK constraints
(migration 004).

**State.**
- `form: FormData` -- all text fields: name, email, mobile_number, srn_prn,
  semester, why_join, value_addition, domain_experience,
  design_portfolio_url, and `website` (the honeypot).
- `selectedDomains: Domain[]` -- chosen domains, capped at `MAX_DOMAINS` (3).
- `step: Step` -- current step, 1-4.
- `status` -- "idle" | "submitting" | "success" | "error".
- `errorMsg: string` -- the current validation/submit error text.
- `alreadyApplied: boolean` -- set from a cookie check on mount.

**Steps.**
1. WHO ARE YOU -- name, email, mobile (pattern-validated), SRN/PRN, and a
   semester tile group.
2. WHERE YOU WANT TO BUILD -- the domain tile selector (1-3, with a live
   count and dimmed tiles once the cap is hit).
3. WHY VEGAVATH -- why_join and value_addition textareas.
4. YOUR EXPERIENCE -- domain_experience textarea, plus a conditional portfolio
   link field that appears (and is required) only when "Social Media" is
   selected.

**Key functions.**
- `handleChange(e)` -- generic controlled-input updater keyed by input name.
- `toggleDomain(d)` -- adds/removes a domain, silently ignoring clicks past the
  3-domain cap.
- `clearError()` -- clears the error and resets status from "error" to "idle".
- `goBack()` -- decrements the step (floored at 1).
- `validateStep(s)` -- JS validation for the tile selectors only (step 1 needs
  a semester; step 2 needs >=1 domain); text fields rely on native
  required/type/pattern validation.
- `submitApplication()` -- POSTs to **`/api/join`** with the full payload
  (domains mapped to `domain_interest`, `domain_interest_2`,
  `domain_interest_3`; `design_portfolio_url` sent only if Social Media is
  chosen; `website` honeypot included). On success it sets a `vg_applied=1`
  cookie (30-day max-age) and flips status to "success"; on non-OK it shows the
  server error; network failures show a generic message.
- `handleSubmit(e)` -- one submit handler for all steps: runs `validateStep`,
  then either advances the step or (on step 4) calls `submitApplication`.

A mount effect reads `document.cookie` and, if `vg_applied=` is present, sets
`alreadyApplied`.

**Render logic.**
- If `!recruitmentOpen` -> a "Recruitment is currently closed" screen with an
  Instagram link and a back-home link.
- Else if `status === "success"` -> an "Application received / You're on the
  grid" confirmation screen.
- Else the split layout: a branding panel ("JOIN THE TEAM", six domains) and
  the form panel. If `alreadyApplied`, the form panel shows an "already applied
  this cycle" message instead of the form. Otherwise it renders the step
  indicator (Step N of 4 plus progress bars), the current step's fields, an
  inline error line when `status === "error"`, and the submit button (label
  cycles NEXT -> SUBMIT APPLICATION -> SUBMITTING...) with a Back button from
  step 2 on. The honeypot `website` input is hidden and rendered on every step.

**Why it exists.** Splitting the long application into four steps reduces
drop-off and lets each step validate before advancing. The cookie check is
explicitly a casual-spam deterrent only (clearing cookies bypasses it) -- the
server (`/api/join`) stays the source of truth via the honeypot and validation.
The Social-Media-only portfolio field keeps the form short for everyone else.

---

## layout/CursorControls.tsx

**Purpose.** Client component: the top-level coordinator that owns the racing
cursor preference and renders both the cursor and its toggle.

**Props.** None (named export `CursorControls`).

**State.**
- `enabled: boolean` -- whether the racing cursor is on.
- `mounted: boolean` -- gates rendering until after hydration.

**Key functions.** A mount effect sets `mounted` and reads the `racing-cursor`
value from localStorage (default false). `handleToggle(val)` updates state and
persists to localStorage (try/catch guarded). No API calls.

**Render logic.** Returns `null` until mounted (avoids a hydration flash), then
renders `RacingCursor` and `CursorToggle` wired to the shared state. Touch
devices are handled in CSS (`@media (pointer: coarse)`), not here.

**Why it exists.** Single owner of the cursor on/off preference so the cursor
and its toggle never disagree. Deferring render until mount prevents the
one-frame hydration mismatch that JS-based detection used to cause.

---

## layout/CursorToggle.tsx

**Purpose.** Client component: the fixed bottom-right switch that turns the
racing cursor on/off. Also exports a `useCursorPreference` hook.

**Props.**
- `enabled: boolean` -- current state (controlled by the parent).
- `onToggle: (enabled: boolean) => void` -- callback when toggled.

**State.** The component itself is controlled (no local state). The exported
`useCursorPreference` hook has its own `enabled` and `isLoading` state.

**Key functions.**
- `handleToggle()` -- flips the value, calls `onToggle`, and persists to
  localStorage (`racing-cursor`, try/catch guarded).
- `useCursorPreference()` -- a standalone hook that reads the stored preference
  on mount and returns `{ enabled, setEnabled, isLoading }`.

No API calls.

**Render logic.** A fixed-position (`bottom-5 right-5`, very high z-index)
labelled switch built with Tailwind classes; the "on" state shows an
accent gradient track and moves the knob. `aria-pressed` and `aria-label`
reflect state.

**Why it exists.** Gives users an explicit, persistent control over the custom
cursor (some find custom cursors distracting). The extra `useCursorPreference`
hook is a reusable reader for the same stored value. Note: this file's active
button element uses `bg-gradient-to-r` and a glow shadow, which the project's
sharp/no-glow styling rules generally forbid in UI text -- flagged here, not
changed, since this task is documentation only.

---

## layout/Footer.tsx

**Purpose.** Server component: the site-wide footer with logo, social links,
and the footer nav.

**Props.**
- `settings: SiteSettings | null` -- optional site settings; social URLs fall
  back to `DEFAULT_SOCIALS` (the real club Instagram/LinkedIn/GitHub) when a
  field is missing.

**State.** None.

**Key functions.** Three inline SVG icon components -- `InstagramIcon`,
`LinkedInIcon`, `GitHubIcon`. `socials` is built from `settings` with the
default-URL fallback. `NAV_LINKS` is the footer link list (Home, About, Events,
Gallery, Crew, Sponsors, Join Us, Legal). No API calls.

**Render logic.** A bordered footer: row 1 has the logo + "TEAM VEGAVATH · PESU
ECC" and the three social icon links (open in a new tab); row 2 has the footer
nav list and a "© 2026 Team Vegavath" mono line. Always rendered.

**Why it exists.** Consistent site footer with editable socials. The
default-URL fallback means the footer is never broken even before site settings
are configured.

---

## layout/Navbar.tsx

**Purpose.** Client component: the fixed site header with the logo, desktop nav
links, a JOIN US button, and a full-screen mobile menu.

**Props.** None (named export `Navbar`).

**State.**
- `menuOpen: boolean` -- mobile overlay open/closed.
- `scrolled: boolean` -- true once the page is scrolled past 80px (drives the
  background/border).

Reads `usePathname()` for active-link detection and `useScroll()` for the
scroll position.

**Nav links.** `NAV_LINKS` = HOME, ABOUT, EVENTS, GALLERY, CREW, SPONSORS
(uppercase). Join is a separate CTA, not part of this list.

**Key functions.**
- `useMotionValueEvent(scrollY, "change", ...)` -- sets `scrolled` when the
  scroll position crosses 80px.
- A body-scroll-lock effect while the mobile menu is open.
- An effect that closes the menu whenever `pathname` changes (so navigating via
  a link dismisses the overlay).

No API calls.

**Render logic.** A `position: fixed` header whose background becomes
`--bg-base` (and gains a bottom border) once `scrolled` or when the menu is
open, otherwise transparent. Contains: the logo link home; the desktop
`ul.nav-links-desktop` where the active route's link is accent-coloured (active
detection is `pathname === href`); the JOIN US primary button (desktop); and a
hamburger button that animates into an X. When `menuOpen`, a `.nav-overlay`
renders the same links vertically (active link accent-coloured) plus a
full-width JOIN US button; each link closes the menu on click.

**Why it exists.** The single navigation surface for the public site.
Transparent-over-hero then solid-on-scroll keeps the hero clean while staying
legible once scrolled. Active-route highlighting and the auto-close-on-navigate
behaviour are the two details that make it feel correct. JOIN US is kept
separate from the link list because it is a conversion CTA, styled as a primary
button.

---

## layout/PageTransition.tsx

**Purpose.** Client component: wraps page content in a route-keyed fade/slide
transition.

**Props.**
- `children: React.ReactNode` -- the page content.

**State.** None; reads `usePathname()` as the animation key.

**Key functions.** None beyond the JSX. No API calls.

**Render logic.** An `AnimatePresence mode="wait"` around a `motion.div` keyed
by pathname: fade + slide up on enter, fade + slide up on exit (0.2s). Because
the key is the route, each navigation animates out the old page and in the new
one.

**Why it exists.** Gives the SPA-style route changes a subtle, consistent
transition without per-page animation code.

---

## layout/RacingCursor.tsx

**Purpose.** Client component: the custom F1-style cursor -- an orange dot that
follows the pointer exactly plus a larger ring that lags behind it, forming a
trail. Per the project styling rules this is the sole allowed circular
(rounded-full) element on the site.

**Props.**
- `enabled: boolean` -- whether the custom cursor is active.

**State.**
- `mounted: boolean` -- gates render until after hydration.
- `isTouch: boolean` -- true (default) until proven mouse-only; the cursor is
  suppressed on any touch-capable device.

**Key functions.**
- A mount effect sets `mounted` and detects touch capability via
  `matchMedia("(pointer: coarse), (hover: none)")` or `maxTouchPoints > 0`.
- The main effect (runs only when mounted, non-touch, and enabled): tracks the
  mouse in an `onMove` handler (sets the dot's transform to the exact pointer
  position) and runs a `requestAnimationFrame` `animate` loop that lerps the
  trailing ring toward the pointer at 0.15 per frame. It hides the native
  cursor (`document.body.style.cursor = "none"`) and cleans up the listener,
  rAF, and cursor style on teardown.

No API calls.

**Render logic.** Returns `null` until mounted or on any touch device.
Otherwise renders two fixed, `pointer-events: none`, max-z-index divs: the
inner 3x3 solid orange dot and the outer 6x6 bordered ring at 50% opacity.
Both use `display: enabled ? block : none`.

**Why it exists.** A branded motorsport pointer (leading dot + lagging trail
ring evokes a racing line). Two subtleties are called out in the source:
`pointer-events: none` is set inline rather than via a Tailwind class because
this setup drops some utilities and a click-eating div at max z-index would
swallow every click; and the touch check requires a genuinely mouse-only
environment because hiding the cursor on touch/hybrid devices (S Pen, DeX) can
suppress taps.

---

## sponsors/SponsorMarquee.tsx

**Purpose.** Server component: an infinite horizontally-scrolling marquee of
sponsor logos.

**Props.**
- `sponsors: Sponsor[]` -- the sponsor list.

**State.** None.

**Key functions.** None beyond the map. No API calls.

**Render logic.** Returns `null` when there are no sponsors. Otherwise renders
a `.marquee-track` containing the sponsor list duplicated (`[...sponsors,
...sponsors]`) so the CSS scroll animation loops seamlessly. Each logo is a Next
`Image` (`unoptimized`, since logos are small); sponsors with a `website_url`
wrap the logo in an external link, others in a plain span.

**Why it exists.** A compact, continuously-scrolling way to show all sponsors.
Duplicating the list is the standard trick for a seamless CSS marquee loop;
`unoptimized` avoids pointless image processing for tiny logos.

---

## ui/Container.tsx

**Purpose.** Server component: the shared max-width, horizontally-centred page
container.

**Props.**
- `children: ReactNode`.
- `className?: string` -- optional extra classes (default "").

**State.** None.

**Key functions.** None.

**Render logic.** A `<div>` at `max-width: 80rem`, centred with
`className="mx-auto"` and 1.5rem horizontal padding. Always renders its
children.

**Why it exists.** One reusable content-width wrapper so pages share consistent
margins. Centring used to be inline `margin: "0 auto"` on the belief that
Tailwind v4 did not generate `mx-auto` here. That belief was wrong -- the
utility lost the cascade to an unlayered `* { margin: 0 }`, fixed in S52B and
converted in S53. This component is the highest-leverage instance: eight pages
import it.

---

## ui/Reveal.tsx

**Purpose.** Client component: a scroll-into-view wrapper that fades and slides
its children up once, when they enter the viewport.

**Props.**
- `children: ReactNode`.
- `delay?: number` -- animation delay in seconds (default 0).
- `className?: string`.
- `style?: CSSProperties`.

**State.** None (framer-motion handles the animation).

**Key functions.** None. No API calls.

**Render logic.** A `motion.div` that animates from `{ opacity: 0, y: 24 }` to
`{ opacity: 1, y: 0 }` via `whileInView`, with `viewport={{ once: true, margin:
"-60px" }}` so it triggers slightly before fully in view and only once. Passes
through `className` and `style`.

**Why it exists.** The reusable scroll-reveal primitive used across the public
pages, so entrance animations stay consistent and are not re-implemented per
section. Reusing `Reveal` (rather than inventing a parallel animation) is
explicitly encouraged by the project's "reuse before inventing" rule.

---

## Note on the crew/ directory

The session brief expected `src/components/crew/` either to not exist or to
contain crew components. The actual state on disk: the directory **exists but
is empty** -- it contains no `.tsx` files (verified with a directory listing).
So the practical conclusion the brief pointed at holds: **crew is a page only,
with no dedicated crew components.** Any crew UI is rendered directly by the
crew route/page rather than by components under this directory. The empty
directory is likely a leftover placeholder and could be removed, but that is a
cleanup decision for a human, not part of this documentation task.
