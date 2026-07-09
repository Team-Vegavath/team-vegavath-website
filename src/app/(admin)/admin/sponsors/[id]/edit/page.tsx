import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import DeleteSponsorButton from "@/components/admin/DeleteSponsorButton";
import SponsorForm from "@/components/admin/SponsorForm";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

export const metadata: Metadata = {
  title: "Edit Sponsor | Admin",
};

export const dynamic = "force-dynamic";

export default async function EditSponsorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const { id } = await params;
  const rows = await sql`SELECT * FROM sponsors WHERE id = ${id} LIMIT 1`;

  if (rows.length === 0) {
    notFound();
  }

  const sponsor = rows[0]!;

  return (
    <div style={{ maxWidth: "52rem" }}>
      <Link href="/admin/sponsors" className="admin-back-link">
        ← Back to sponsors
      </Link>

      <header className="admin-page-header" style={{ marginTop: "1rem" }}>
        <h1 className="admin-page-title">Edit Sponsor</h1>
      </header>

      <SponsorForm
        mode="edit"
        initialData={{
          id: sponsor.id,
          name: sponsor.name,
          tier: sponsor.tier,
          website_url: sponsor.website_url,
          description: sponsor.description,
          display_order: sponsor.display_order,
          is_active: sponsor.is_active,
          logo_url: sponsor.logo_url,
        }}
      />

      <section className="admin-danger-zone">
        <p className="admin-danger-title">Danger Zone</p>
        <p className="admin-danger-text">
          Deleting a sponsor removes it permanently. This cannot be undone.
        </p>
        <DeleteSponsorButton id={sponsor.id as string} name={sponsor.name as string} />
      </section>
    </div>
  );
}
