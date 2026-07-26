import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PostForm from "@/components/admin/PostForm";
import { auth } from "@/lib/auth";
import { getPostByIdAdmin } from "@/lib/services/posts";

export const metadata: Metadata = {
  title: "Edit Post",
};

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }
  // Viewers read the list pages; the editor is a write surface.
  if (session.user.isViewer) {
    redirect("/admin/posts");
  }

  const { id } = await params;
  // Admin lookup, not getPostBySlug: drafts have to be editable.
  const post = await getPostByIdAdmin(id).catch(() => null);

  if (!post) {
    notFound();
  }

  return (
    <div style={{ maxWidth: "52rem" }}>
      <Link href="/admin/posts" className="admin-back-link">
        ← Back to posts
      </Link>

      <header className="admin-page-header" style={{ marginTop: "1rem" }}>
        <h1 className="admin-page-title">Edit Post</h1>
      </header>

      <PostForm
        mode="edit"
        initialData={{
          id: post.id,
          slug: post.slug,
          title: post.title,
          author_name: post.author_name,
          author_role: post.author_role,
          category: post.category,
          body: post.body,
          excerpt: post.excerpt,
          source_url: post.source_url,
          source_label: post.source_label,
          published: post.published,
        }}
      />
    </div>
  );
}
