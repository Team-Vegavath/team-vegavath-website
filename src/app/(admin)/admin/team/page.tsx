import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import BulkImportTeam from "@/components/admin/BulkImportTeam";
import BulkTeamPhotoUpload from "@/components/admin/BulkTeamPhotoUpload";
import MemberForm from "@/components/admin/MemberForm";
import TeamMembersTable from "@/components/admin/TeamMembersTable";
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
  const isViewer = session.user.isViewer;
  // includeInactive: admin must still see (and be able to re-activate) members
  // that were switched off -- the public query filters them out.
  const members = await getMembers({ includeInactive: true }).catch(
    () => [] as TeamMember[]
  );

  if (resolvedSearchParams.import === "true" && !isViewer) {
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

  if (resolvedSearchParams.new === "true" && !isViewer) {
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
        {!isViewer ? (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Link href="/admin/team?import=true" className="btn-outline" style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}>
              IMPORT CSV
            </Link>
            <Link href="/admin/team?new=true" className="btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}>
              ADD MEMBER
            </Link>
          </div>
        ) : null}
      </header>

      {!isViewer ? (
        <BulkTeamPhotoUpload
          members={members.map((m) => ({ id: m.id, name: m.name, photo_url: m.photo_url }))}
        />
      ) : null}

      <TeamMembersTable initialData={members} isViewer={isViewer} />
    </>
  );
}
