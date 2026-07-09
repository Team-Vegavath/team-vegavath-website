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
    <div style={{ maxWidth: "52rem" }}>
      <Link href="/admin/team" className="admin-back-link">
        ← Back to team
      </Link>

      <header className="admin-page-header" style={{ marginTop: "1rem" }}>
        <h1 className="admin-page-title">Edit Member</h1>
      </header>

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
          photo_url: member.photo_url,
        }}
      />

      <section className="admin-danger-zone">
        <p className="admin-danger-title">Danger Zone</p>
        <p className="admin-danger-text">
          Deleting a member removes them permanently. This cannot be undone.
        </p>
        <DeleteMemberButton id={member.id as string} name={member.name as string} />
      </section>
    </div>
  );
}
