import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import InlineDelete from "@/components/admin/InlineDelete";
import SponsorForm from "@/components/admin/SponsorForm";
import { auth } from "@/lib/auth";
import { getSponsors } from "@/lib/services/sponsors";
import type { Sponsor } from "@/types/sponsor";

export const metadata: Metadata = {
  title: "Sponsors",
};

export const dynamic = "force-dynamic";

export default async function AdminSponsorsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const { new: newMode } = await searchParams;

  if (newMode === "true") {
    return (
      <div style={{ maxWidth: "52rem" }}>
        <Link href="/admin/sponsors" className="admin-back-link">
          ← Back to sponsors
        </Link>

        <header className="admin-page-header" style={{ marginTop: "1rem" }}>
          <h1 className="admin-page-title">New Sponsor</h1>
        </header>

        <SponsorForm mode="create" />
      </div>
    );
  }

  const sponsors = await getSponsors().catch(() => [] as Sponsor[]);

  return (
    <>
      <header className="admin-page-header">
        <h1 className="admin-page-title">Sponsors</h1>
        <Link href="/admin/sponsors?new=true" className="btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}>
          ADD SPONSOR
        </Link>
      </header>

      <section className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Tier</th>
              <th>Active</th>
              <th>Order</th>
              <th>Logo URL</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sponsors.length > 0 ? (
              sponsors.map((sponsor) => (
                <tr key={sponsor.id}>
                  <td className="admin-td-primary" style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{sponsor.name}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>{sponsor.tier}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>
                    <span
                      className="admin-dot"
                      style={{ background: sponsor.is_active ? "var(--success)" : "var(--text-muted)" }}
                      aria-hidden="true"
                    />
                    {sponsor.is_active ? "ACTIVE" : "INACTIVE"}
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{sponsor.display_order}</td>
                  <td className="admin-cell-mono">{truncateText(sponsor.logo_url, 40)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <Link href={`/admin/sponsors/${sponsor.id}/edit`} className="admin-row-action">
                        EDIT
                      </Link>
                      <InlineDelete
                        endpoint={`/api/admin/sponsors?id=${encodeURIComponent(sponsor.id)}`}
                        confirmMessage={`Delete sponsor "${sponsor.name}"? This cannot be undone.`}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No sponsors yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}
