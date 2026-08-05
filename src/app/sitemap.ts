import type { MetadataRoute } from "next";

import { getEvents } from "@/lib/services/events";
import { getPublishedPosts } from "@/lib/services/posts";
// S72C: both moved to src/types/routes.ts so /admin/qr's client component can
// share the same list without value-importing this file (which would pull the
// Neon driver into the browser bundle). The exclusions, including S60/D4's
// /projects/combat-bot stub, are documented there.
import { SITE_URL as siteUrl, STATIC_ROUTES } from "@/types/routes";

// S52B: async and DB-backed. Event and post slugs were missing entirely, so the
// pages carrying Event and Article JSON-LD -- the ones most likely to win a
// query -- were never submitted. Real updated_at replaces the old build
// timestamp, which claimed every URL changed on every deploy.
//
// Both reads are wrapped: migration 022 (posts) is UNAPPLIED against the live
// DB, so getPublishedPosts throws there, and this file runs at build time. An
// unguarded read would fail the build. Degrading to the static routes is the
// right failure mode for a sitemap.
//
// /events/[slug]/register and /docs/* stay out deliberately.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const buildTime = new Date();

  const [events, posts] = await Promise.all([
    getEvents({ limit: 50 }).catch(() => []),
    getPublishedPosts(undefined, 100).catch(() => []),
  ]);

  const staticRoutes = STATIC_ROUTES.map(({ path, priority }) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified: buildTime,
    priority,
  }));

  const eventRoutes = events
    // Archived events are pulled from the site's own listings, so they should
    // not be advertised to crawlers either.
    .filter((event) => event.status !== "archived")
    .map((event) => ({
      url: new URL(`/events/${event.slug}`, siteUrl).toString(),
      lastModified: event.updated_at ? new Date(event.updated_at) : buildTime,
      priority: 0.8,
    }));

  const postRoutes = posts.map((post) => ({
    url: new URL(`/posts/${post.slug}`, siteUrl).toString(),
    lastModified: post.updated_at ? new Date(post.updated_at) : buildTime,
    priority: 0.7,
  }));

  return [...staticRoutes, ...eventRoutes, ...postRoutes];
}
