import type { Metadata } from "next";
import { redirect } from "next/navigation";

import GalleryUploadForm from "@/components/admin/GalleryUploadForm";
import InlineDelete from "@/components/admin/InlineDelete";
import { auth } from "@/lib/auth";
import { getGalleryItemsLimited } from "@/lib/services/gallery";
import type { GalleryItem } from "@/types/gallery";

export const metadata: Metadata = {
  title: "Gallery",
};

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const items = await getGalleryItemsLimited(200).catch(() => [] as GalleryItem[]);

  return (
    <>
      <header className="admin-page-header">
        <h1 className="admin-page-title">Gallery</h1>
      </header>

      <div style={{ maxWidth: "52rem", marginBottom: "2rem" }}>
        <GalleryUploadForm />
      </div>

      <section className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Event Label</th>
              <th>Type</th>
              <th>Caption</th>
              <th>URL</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="admin-td-primary" style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{item.event_label}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>{item.type}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{item.caption ?? "-"}</td>
                  <td className="admin-cell-mono">{truncateUrl(item.url, 40)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <InlineDelete
                      endpoint={`/api/admin/gallery?id=${encodeURIComponent(item.id)}`}
                      confirmMessage="Delete this gallery item? This cannot be undone."
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="admin-empty">
                  No gallery items yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}

function truncateUrl(url: string, maxLength: number): string {
  if (url.length <= maxLength) {
    return url;
  }

  return `${url.slice(0, maxLength)}...`;
}
