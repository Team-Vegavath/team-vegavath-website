import type { Metadata } from "next";
import { Fragment } from "react";
import { redirect } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import CopyButton from "@/components/admin/CopyButton";
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

  const isViewer = session.user.isViewer;
  const items = await getGalleryItemsLimited(200).catch(() => [] as GalleryItem[]);

  // S49: grouped by event so a shoot reads as one block instead of 200 loose
  // rows. Grouping is client-side (well, render-side) - the service query keeps
  // its display_order sort, and a Map preserves first-seen event order.
  const groups = new Map<string, GalleryItem[]>();
  for (const item of items) {
    const key = item.event_label ?? "Unlabelled";
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  return (
    <>
      <AdminPageHeader
        title="Gallery"
        subtitle={`${items.length} items across ${groups.size} ${groups.size === 1 ? "event" : "events"}`}
      />

      {!isViewer ? (
        <div style={{ maxWidth: "52rem", marginBottom: "2rem" }}>
          <GalleryUploadForm />
        </div>
      ) : null}

      <section className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Caption</th>
              <th>Filename (R2 key)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              Array.from(groups.entries()).map(([label, groupItems]) => (
                <Fragment key={label}>
                  <tr>
                    <th
                      colSpan={4}
                      scope="colgroup"
                      style={{
                        textAlign: "left",
                        background: "var(--bg-elevated)",
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: "0.7rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      {label}
                      <span style={{ color: "var(--text-muted)" }}>
                        {"  ·  "}
                        {groupItems.length} item{groupItems.length === 1 ? "" : "s"}
                      </span>
                    </th>
                  </tr>
                  {groupItems.map((item) => (
                    <tr key={item.id}>
                      <td
                        className="admin-cell-mono"
                        style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}
                      >
                        {item.type}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{item.caption ?? "-"}</td>
                      <td className="admin-cell-mono" title={item.url} style={{ wordBreak: "break-all" }}>
                        {item.url.split("/").pop() ?? item.url}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <CopyButton text={item.url} />
                          {isViewer ? null : (
                            <InlineDelete
                              endpoint={`/api/admin/gallery?id=${encodeURIComponent(item.id)}`}
                              confirmMessage="Delete this gallery item? This cannot be undone."
                            />
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="admin-empty">
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
