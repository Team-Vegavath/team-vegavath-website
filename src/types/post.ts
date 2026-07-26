// S50: post category constants live here, not in services/posts.ts, because
// PostForm is a client component and needs them at runtime. A value import from
// a service would pull lib/db.ts (and the Neon driver) into the client bundle
// -- every other client component in the repo only ever `import type` from a
// service, which is erased at compile time. Keep it that way.
//
// Must stay in sync with the category CHECK in migrations/022_posts.sql.
// S54B: cut to the three domains the team actually writes about. Dropped
// coding, events and general -- migration 023 rewrites existing rows to
// motorsport and narrows the CHECK to match.
export const POST_CATEGORIES = [
  "motorsport",
  "automotives",
  "robotics",
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

// Single source for the fallback so the API route and PostForm can never drift
// onto a value the DB CHECK rejects (which is what "general" became in S54B).
export const DEFAULT_POST_CATEGORY: PostCategory = POST_CATEGORIES[0];

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  motorsport: "Motorsport",
  automotives: "Automotives",
  robotics: "Robotics",
};

export function isPostCategory(value: string): value is PostCategory {
  return (POST_CATEGORIES as readonly string[]).includes(value);
}
