import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

import DeleteMemberButton from "@/components/admin/DeleteMemberButton";
import MemberForm from "@/components/admin/MemberForm";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

export const metadata: Metadata = {
  title: "Edit Member | Admin",
};

export const dynamic = "force-dynamic";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const { id } = await params;
  const rows = await sql`SELECT * FROM team_members WHERE id = ${id} LIMIT 1`;

  const member = rows[0];

  if (!member) {
    notFound();
  }

  return (
    <main style={{ minHeight: "100vh", background: "#09090b", color: "#EBEBEB", padding: "6rem 2rem 4rem", boxSizing: "border-box" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "52rem", display: "flex", flexDirection: "column", gap: "1.5rem", boxSizing: "border-box" }}>
        <Link
          href="/admin/team"
          style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", border: "1.5px solid #EF5D08", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, color: "#EF5D08", textDecoration: "none", transition: "all 0.2s", width: "fit-content" }}
        >
          ← Back to team list
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight text-[#EBEBEB]">Edit Member</h1>

        <MemberForm
          mode="edit"
          initialData={{
            id: member.id,
            name: member.name,
            role: member.role,
            tier: member.tier,
            domain: member.domain,
            quote: member.quote,
            linkedin_url: member.linkedin_url,
            display_order: member.display_order,
            is_active: member.is_active,
          }}
        />

        <DeleteMemberButton id={member.id as string} name={member.name as string} />
      </div>
    </main>
  );
}
