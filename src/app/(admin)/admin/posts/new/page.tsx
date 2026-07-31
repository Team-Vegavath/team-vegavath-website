import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
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

      <div style={{ marginTop: "1rem" }}>
        <AdminPageHeader title="New Post" />
      </div>

      <PostForm mode="create" />
    </div>
  );
}
