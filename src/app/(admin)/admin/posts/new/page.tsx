import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PostForm from "@/components/admin/PostForm";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "New Post",
};

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }
  // Viewers read the list pages; the editor is a write surface.
  if (session.user.isViewer) {
    redirect("/admin/posts");
  }

  return (
    <div style={{ maxWidth: "52rem" }}>
      <Link href="/admin/posts" className="admin-back-link">
        ← Back to posts
      </Link>

      <header className="admin-page-header" style={{ marginTop: "1rem" }}>
        <h1 className="admin-page-title">New Post</h1>
      </header>

      <PostForm mode="create" />
    </div>
  );
}
