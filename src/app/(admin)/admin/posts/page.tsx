import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import InlineDelete from "@/components/admin/InlineDelete";
import { auth } from "@/lib/auth";
import { getAllPostsAdmin, type Post } from "@/lib/services/posts";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Posts",
};

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const isViewer = session.user.isViewer;
  const posts = await getAllPostsAdmin().catch(() => [] as Post[]);

  return (
    <>
      <AdminPageHeader
        title="Posts"
        subtitle={`${posts.length} posts`}
        action={
          !isViewer ? (
            <Link
              href="/admin/posts/new"
              className="btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}
            >
              ADD POST
            </Link>
          ) : null
        }
      />

      <section className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Category</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.length > 0 ? (
              posts.map((post) => (
                <tr key={post.id}>
                  <td className="admin-td-primary" style={{ fontWeight: 500 }}>
                    {post.title}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{post.author_name}</td>
                  <td
                    className="admin-cell-mono"
                    style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}
                  >
                    {post.category}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span
                      className={`status-badge status-${post.published ? "published" : "draft"}`}
                    >
                      {post.published ? "PUBLISHED" : "DRAFT"}
                    </span>
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                    {formatDate(post.published_at ?? post.created_at)}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {isViewer ? (
                      <span
                        className="admin-cell-mono"
                        style={{ color: "var(--text-muted)" }}
                      >
                        -
                      </span>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        <Link
                          href={`/admin/posts/${post.id}/edit`}
                          className="admin-row-action"
                        >
                          EDIT
                        </Link>
                        <InlineDelete
                          endpoint={`/api/admin/posts/${encodeURIComponent(post.id)}`}
                          confirmMessage={`Delete post "${post.title}"? This cannot be undone.`}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No posts yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
