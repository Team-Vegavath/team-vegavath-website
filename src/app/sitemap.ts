import type { MetadataRoute } from "next";

const siteUrl = "https://vegavath.live";

const routes = [
  "/",
  "/about",
  "/events",
  // S50: section roots only. Individual post slugs would make this file async
  // and DB-dependent, which is a separate call.
  "/posts",
  "/f1",
  "/gallery",
  "/crew",
  "/sponsors",
  "/join",
  "/legal",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    lastModified,
  }));
}