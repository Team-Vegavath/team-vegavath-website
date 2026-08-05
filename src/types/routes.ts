// S72C: moved out of src/app/sitemap.ts so a "use client" component can share it.
//
// sitemap.ts VALUE-imports getEvents and getPublishedPosts, so importing anything
// from it inside a client component would drag src/lib/db.ts and the whole Neon
// driver into .next/static/chunks, where db.ts's module-level DATABASE_URL check
// throws in the browser. src/types/ exists for exactly this case: a constant a
// client component needs to share with something on the server side.
//
// One list, two consumers (sitemap.ts and /admin/qr), so the QR tool can never
// drift out of sync with what the site actually advertises as public.

export const SITE_URL = "https://vegavath.live";

/**
 * Public, crawlable route pages. Deliberately does NOT include:
 *   - /projects/combat-bot (S60/D4: a "check back soon" stub)
 *   - /events/[slug] and /posts/[slug] (DB-backed; sitemap.ts adds them at build)
 *   - /events/[slug]/register, /docs/*, /admin/*, /bootstrap/* (internal)
 *
 * Because /admin/qr renders a dropdown over this array and nothing else, "public
 * routes only, no fragments" is enforced by construction - there is no input to
 * validate and no way to type `/events#stalls`.
 */
export const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1.0 },
  { path: "/about", priority: 0.9 },
  { path: "/events", priority: 0.9 },
  { path: "/projects", priority: 0.8 },
  { path: "/projects/kart", priority: 0.8 },
  { path: "/crew", priority: 0.8 },
  { path: "/join", priority: 0.8 },
  { path: "/gallery", priority: 0.7 },
  { path: "/posts", priority: 0.7 },
  { path: "/sponsors", priority: 0.6 },
  { path: "/f1", priority: 0.5 },
  { path: "/f1/drivers", priority: 0.4 },
  { path: "/f1/circuits", priority: 0.4 },
  { path: "/f1/seasons", priority: 0.4 },
  { path: "/legal", priority: 0.3 },
];
