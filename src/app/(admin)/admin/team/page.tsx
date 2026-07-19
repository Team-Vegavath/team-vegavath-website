import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import BulkImportTeam from "@/components/admin/BulkImportTeam";
import BulkTeamPhotoUpload from "@/components/admin/BulkTeamPhotoUpload";
import InlineDelete from "@/components/admin/InlineDelete";
import MemberForm from "@/components/admin/MemberForm";
import QuickPhotoUpload from "@/components/admin/QuickPhotoUpload";
import { auth } from "@/lib/auth";
import { getMembers } from "@/lib/services/team";
import type { TeamMember } from "@/types/member";

export const metadata: Metadata = {
  title: "Team",
};

export const dynamic = "force-dynamic";

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; import?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const resolvedSearchParams = await searchParams;
  const members = await getMembers().catch(() => [] as TeamMember[]);

  if (resolvedSearchParams.import === "true") {
    return (
      <div style={{ maxWidth: "52rem" }}>
        <Link href="/admin/team" className="admin-back-link">
          ← Back to team
        </Link>

        <header className="admin-page-header" style={{ marginTop: "1rem" }}>
          <h1 className="admin-page-title">Import Members</h1>
        </header>

        <BulkImportTeam />
      </div>
    );
  }

  if (resolvedSearchParams.new === "true") {
    return (
      <div style={{ maxWidth: "52rem" }}>
        <Link href="/admin/team" className="admin-back-link">
          ← Back to team
        </Link>

        <header className="admin-page-header" style={{ marginTop: "1rem" }}>
          <h1 className="admin-page-title">New Member</h1>
        </header>

        <MemberForm mode="create" />
      </div>
    );
  }

  return (
    <>
      <header className="admin-page-header">
        <h1 className="admin-page-title">Team</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/admin/team?import=true" className="btn-outline" style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}>
            IMPORT CSV
          </Link>
          <Link href="/admin/team?new=true" className="btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}>
            ADD MEMBER
          </Link>
        </div>
      </header>

      <BulkTeamPhotoUpload
        members={members.map((m) => ({ id: m.id, name: m.name, photo_url: m.photo_url }))}
      />

      <section className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Role</th>
              <th>Tier</th>
              <th>Domain</th>
              <th>Active</th>
              <th>Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length > 0 ? (
              members.map((member) => (
                <tr key={member.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {member.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.photo_url} alt={member.name} className="admin-thumb" />
                    ) : (
                      <span className="admin-thumb-empty" aria-hidden="true" />
                    )}
                  </td>
                  <td className="admin-td-primary" style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{member.name}</td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{member.role}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>{member.tier}</td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{member.domain ?? "-"}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>
                    <span
                      className="admin-dot"
                      style={{ background: member.is_active ? "var(--success)" : "var(--text-muted)" }}
                      aria-hidden="true"
                    />
                    {member.is_active ? "YES" : "NO"}
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{member.display_order}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <QuickPhotoUpload
                        memberId={member.id}
                        currentPhotoUrl={member.photo_url}
                      />
                      <Link href={`/admin/team/${member.id}/edit`} className="admin-row-action">
                        EDIT
                      </Link>
                      <InlineDelete
                        endpoint={`/api/admin/team?id=${member.id}`}
                        confirmMessage={`Permanently delete "${member.name}"? This cannot be undone.`}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="admin-empty">
                  No members yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
