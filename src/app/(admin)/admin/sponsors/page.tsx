import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import SponsorForm from "@/components/admin/SponsorForm";
import SponsorsTable from "@/components/admin/SponsorsTable";
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
  const isViewer = session.user.isViewer;

  if (newMode === "true" && !isViewer) {
    return (
      <div style={{ maxWidth: "52rem" }}>
        <Link href="/admin/sponsors" className="admin-back-link">
          ← Back to sponsors
        </Link>

        <div style={{ marginTop: "1rem" }}>
          <AdminPageHeader title="New Sponsor" />
        </div>

        <SponsorForm mode="create" />
      </div>
    );
  }

  const sponsors = await getSponsors().catch(() => [] as Sponsor[]);

  return (
    <>
      <AdminPageHeader
        title="Sponsors"
        subtitle={`${sponsors.length} sponsors`}
        action={
          !isViewer ? (
            <Link href="/admin/sponsors?new=true" className="btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}>
              ADD SPONSOR
            </Link>
          ) : null
        }
      />

      {/* S62: the table and its row actions moved into a client component so
          EDIT can open a slide-in panel instead of navigating. The
          /admin/sponsors/[id]/edit route still exists and still works. */}
      <SponsorsTable sponsors={sponsors} isViewer={isViewer} />
    </>
  );
}
