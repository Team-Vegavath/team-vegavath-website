import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import DeleteGalleryItemButton from "@/components/admin/DeleteGalleryItemButton";
import GalleryUploadForm from "@/components/admin/GalleryUploadForm";
import { auth } from "@/lib/auth";
import { deleteGalleryItem, getGalleryItemsLimited } from "@/lib/services/gallery";
import type { GalleryItem } from "@/types/gallery";

export const metadata: Metadata = {
  title: "Gallery | Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  void deleteGalleryItem;

  const items = await getGalleryItemsLimited(200).catch(() => [] as GalleryItem[]);

  return (
    <main style={{ minHeight: "100vh", background: "#09090b", color: "white", padding: "6rem 2rem 4rem", boxSizing: "border-box" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "72rem", display: "flex", flexDirection: "column", gap: "1.5rem", boxSizing: "border-box" }}>
        <Link
          href="/admin/dashboard"
          style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", border: "1.5px solid #EF5D08", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, color: "#EF5D08", textDecoration: "none", transition: "all 0.2s", width: "fit-content" }}
        >
          ← Back to dashboard
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight">Manage Gallery</h1>

        <GalleryUploadForm />

        <section className="space-y-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <h2 className="text-xl font-semibold text-zinc-100">Current Gallery Items</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-950/60 text-left text-xs uppercase tracking-[0.12em] text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Event Label</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Caption</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {items.length > 0 ? (
                  items.map((item) => (
                    <tr key={item.id} className="text-zinc-200">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-100">
                        {item.event_label}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 uppercase text-zinc-300">
                        {item.type}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{item.caption ?? "-"}</td>
                      <td className="px-4 py-3 text-zinc-300">{truncateUrl(item.url, 40)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <DeleteGalleryItemButton id={item.id} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                      No gallery items yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function truncateUrl(url: string, maxLength: number): string {
  if (url.length <= maxLength) {
    return url;
  }

  return `${url.slice(0, maxLength)}...`;
}
