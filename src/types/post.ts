// S50: post category constants live here, not in services/posts.ts, because
// PostForm is a client component and needs them at runtime. A value import from
// a service would pull lib/db.ts (and the Neon driver) into the client bundle
// -- every other client component in the repo only ever `import type` from a
// service, which is erased at compile time. Keep it that way.
//
// Must stay in sync with the category CHECK in migrations/022_posts.sql.
export const POST_CATEGORIES = [
  "motorsport",
  "automotives",
  "robotics",
  "coding",
  "events",
  "general",
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  motorsport: "Motorsport",
  automotives: "Automotives",
  robotics: "Robotics",
  coding: "Coding",
  events: "Events",
  general: "General",
};

export function isPostCategory(value: string): value is PostCategory {
  return (POST_CATEGORIES as readonly string[]).includes(value);
}
