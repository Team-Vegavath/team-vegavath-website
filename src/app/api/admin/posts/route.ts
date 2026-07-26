import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAllPostsAdmin,
  createPost,
  type CreatePostInput,
} from "@/lib/services/posts";
import { slugify } from "@/lib/utils";
import { DEFAULT_POST_CATEGORY, isPostCategory } from "@/types/post";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const posts = await getAllPostsAdmin();
    return NextResponse.json(posts);
  } catch (error) {
    console.error("[GET /api/admin/posts]", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const authorName =
      typeof body?.author_name === "string" ? body.author_name.trim() : "";
    const postBody = typeof body?.body === "string" ? body.body : "";
    if (!title || !authorName || !postBody.trim()) {
      return NextResponse.json(
        { error: "Title, author name and content are required" },
        { status: 400 }
      );
    }

    // Slug falls back to the title so a post can never land without one; the
    // DB UNIQUE constraint is what actually rejects collisions.
    const rawSlug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const slug = slugify(rawSlug || title);
    if (!slug) {
      return NextResponse.json({ error: "Could not derive a slug" }, { status: 400 });
    }

    const category =
      typeof body?.category === "string" && isPostCategory(body.category)
        ? body.category
        : DEFAULT_POST_CATEGORY;

    const input: CreatePostInput = {
      slug,
      title,
      author_name: authorName,
      author_role: body?.author_role ? String(body.author_role).trim() : null,
      category,
      body: postBody,
      excerpt: body?.excerpt ? String(body.excerpt).trim().slice(0, 200) : null,
      source_url: body?.source_url ? String(body.source_url).trim() : null,
      source_label: body?.source_label ? String(body.source_label).trim() : null,
      thumbnail_url:
        typeof body?.thumbnail_url === "string" ? body.thumbnail_url : null,
      published: Boolean(body?.published),
      // Backdating an older post. Null (blank field, or an unparseable value)
      // leaves createPost to stamp now() if the post is published.
      published_at:
        typeof body?.published_at === "string" &&
        !Number.isNaN(Date.parse(body.published_at))
          ? new Date(body.published_at)
          : null,
    };

    const post = await createPost(input);
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/posts]", error);
    const message =
      error instanceof Error && error.message.includes("posts_slug_key")
        ? "That slug is already taken"
        : "Failed to create post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
