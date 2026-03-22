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
    <main style={{ minHeight: "100vh", background: "#09090b", color: "#EBEBEB", padding: "6rem 2rem 4rem", boxSizing: "border-box" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "52rem", display: "flex", flexDirection: "column", gap: "1.5rem", boxSizing: "border-box" }}>
        <Link
          href="/admin/sponsors"
          style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", border: "1.5px solid #EF5D08", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, color: "#EF5D08", textDecoration: "none", transition: "all 0.2s", width: "fit-content" }}
        >
          ← Back to sponsors
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight text-[#EBEBEB]">Edit Sponsor</h1>

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
          }}
        />

        <DeleteSponsorButton id={sponsor.id as string} name={sponsor.name as string} />
      </div>
    </main>
  );
}