import type { MetadataRoute } from "next";

const siteUrl = "https://vegavath.live";

const routes = [
  "/",
  "/about",
  "/events",
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