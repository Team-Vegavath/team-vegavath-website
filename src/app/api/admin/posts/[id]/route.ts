import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  updatePost,
  deletePost,
  type UpdatePostInput,
} from "@/lib/services/posts";
import { slugify } from "@/lib/utils";
import { isPostCategory } from "@/types/post";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    // Only keys actually present are forwarded: updatePost distinguishes
    // undefined (leave alone) from null (clear the column).
    const input: UpdatePostInput = {};
    if (typeof body?.title === "string") input.title = body.title.trim();
    if (typeof body?.slug === "string") {
      const slug = slugify(body.slug.trim());
      if (!slug) {
        return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
      }
      input.slug = slug;
    }
    if (typeof body?.author_name === "string") {
      input.author_name = body.author_name.trim();
    }
    if (body?.author_role !== undefined) {
      input.author_role = body.author_role ? String(body.author_role).trim() : null;
    }
    if (typeof body?.category === "string" && isPostCategory(body.category)) {
      input.category = body.category;
    }
    if (typeof body?.body === "string") input.body = body.body;
    if (body?.excerpt !== undefined) {
      input.excerpt = body.excerpt
        ? String(body.excerpt).trim().slice(0, 200)
        : null;
    }
    if (body?.source_url !== undefined) {
      input.source_url = body.source_url ? String(body.source_url).trim() : null;
    }
    if (body?.source_label !== undefined) {
      input.source_label = body.source_label
        ? String(body.source_label).trim()
        : null;
    }
    if (body?.thumbnail_url !== undefined) {
      input.thumbnail_url = body.thumbnail_url
        ? String(body.thumbnail_url)
        : null;
    }
    if (body?.published !== undefined) input.published = Boolean(body.published);

    const post = await updatePost(id, input);
    return NextResponse.json(post);
  } catch (error) {
    console.error("[PATCH /api/admin/posts/[id]]", error);
    if (error instanceof Error && error.message === "Post not found") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    const message =
      error instanceof Error && error.message.includes("posts_slug_key")
        ? "That slug is already taken"
        : "Failed to update post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isViewer) {
    return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await deletePost(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/posts/[id]]", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
