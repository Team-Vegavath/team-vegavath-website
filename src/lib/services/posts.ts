import { sql } from "@/lib/db";
import type { PostCategory } from "@/types/post";

// S50: blog posts (/posts). The Post row shape lives here (matching
// bootstrap.ts). The category constants and isPostCategory() live in
// src/types/post.ts and are deliberately NOT re-exported from here: PostForm is
// a client component that needs them at runtime, and any value import out of
// this module drags lib/db.ts and the Neon driver into the client bundle.
// Import them from "@/types/post" everywhere, server or client.

export interface Post {
  id: string;
  slug: string;
  title: string;
  author_name: string;
  author_role: string | null;
  category: string;
  body: string;
  excerpt: string | null;
  source_url: string | null;
  source_label: string | null;
  thumbnail_url: string | null;
  published: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type CreatePostInput = Omit<Post, "id" | "created_at" | "updated_at">;
export type UpdatePostInput = Partial<CreatePostInput>;

export async function getPublishedPosts(
  category?: PostCategory,
  limit = 20
): Promise<Post[]> {
  // Two branches rather than a dynamic WHERE: the neon tagged template only
  // interpolates values, not SQL fragments.
  if (category) {
    const rows = await sql`
      SELECT * FROM posts
      WHERE published = true AND category = ${category}
      ORDER BY published_at DESC NULLS LAST, created_at DESC
      LIMIT ${limit}`;
    return rows as Post[];
  }
  const rows = await sql`
    SELECT * FROM posts
    WHERE published = true
    ORDER BY published_at DESC NULLS LAST, created_at DESC
    LIMIT ${limit}`;
  return rows as Post[];
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const rows = await sql`
    SELECT * FROM posts
    WHERE slug = ${slug} AND published = true
    LIMIT 1`;
  return (rows[0] as Post) ?? null;
}

export async function getAllPostsAdmin(): Promise<Post[]> {
  const rows = await sql`
    SELECT * FROM posts
    ORDER BY created_at DESC
    LIMIT 200`;
  return rows as Post[];
}

// Admin editor loads drafts too, so this one is not gated on published.
export async function getPostByIdAdmin(id: string): Promise<Post | null> {
  const rows = await sql`SELECT * FROM posts WHERE id = ${id} LIMIT 1`;
  return (rows[0] as Post) ?? null;
}

export async function createPost(data: CreatePostInput): Promise<Post> {
  // published_at is stamped here when a post is created already-published,
  // so the public list has something to sort on.
  const publishedAt =
    data.published_at ?? (data.published ? new Date() : null);
  const rows = await sql`
    INSERT INTO posts (
      slug, title, author_name, author_role, category, body,
      excerpt, source_url, source_label, thumbnail_url, published, published_at
    ) VALUES (
      ${data.slug}, ${data.title}, ${data.author_name},
      ${data.author_role ?? null}, ${data.category}, ${data.body},
      ${data.excerpt ?? null}, ${data.source_url ?? null},
      ${data.source_label ?? null}, ${data.thumbnail_url ?? null},
      ${data.published},
      ${publishedAt ? publishedAt.toISOString() : null}
    ) RETURNING *`;
  return rows[0] as Post;
}

export async function updatePost(
  id: string,
  data: UpdatePostInput
): Promise<Post> {
  // Read-then-write rather than COALESCE-per-column: the nullable fields
  // (author_role, excerpt, source_url, source_label, thumbnail_url) have to be
  // clearable, and
  // COALESCE(${x ?? null}, col) can never write a NULL back. Admin CRUD is
  // low-volume, so the extra SELECT is cheap.
  const current = await getPostByIdAdmin(id);
  if (!current) throw new Error("Post not found");

  const merged: CreatePostInput = {
    slug: data.slug ?? current.slug,
    title: data.title ?? current.title,
    author_name: data.author_name ?? current.author_name,
    author_role:
      data.author_role !== undefined ? data.author_role : current.author_role,
    category: data.category ?? current.category,
    body: data.body ?? current.body,
    excerpt: data.excerpt !== undefined ? data.excerpt : current.excerpt,
    source_url:
      data.source_url !== undefined ? data.source_url : current.source_url,
    source_label:
      data.source_label !== undefined
        ? data.source_label
        : current.source_label,
    thumbnail_url:
      data.thumbnail_url !== undefined
        ? data.thumbnail_url
        : current.thumbnail_url,
    published: data.published ?? current.published,
    published_at:
      data.published_at !== undefined ? data.published_at : current.published_at,
  };

  // First publish stamps the date; unpublishing keeps it so a re-publish does
  // not reset the post's place in the list.
  if (merged.published && !merged.published_at) merged.published_at = new Date();

  const publishedAt = merged.published_at
    ? new Date(merged.published_at).toISOString()
    : null;

  const rows = await sql`
    UPDATE posts SET
      slug = ${merged.slug},
      title = ${merged.title},
      author_name = ${merged.author_name},
      author_role = ${merged.author_role},
      category = ${merged.category},
      body = ${merged.body},
      excerpt = ${merged.excerpt},
      source_url = ${merged.source_url},
      source_label = ${merged.source_label},
      thumbnail_url = ${merged.thumbnail_url},
      published = ${merged.published},
      published_at = ${publishedAt},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *`;
  return rows[0] as Post;
}

export async function deletePost(id: string): Promise<void> {
  await sql`DELETE FROM posts WHERE id = ${id}`;
}
