import type { Metadata } from "next";
import { redirect } from "next/navigation";

import MilestonesTable from "@/components/admin/MilestonesTable";
import { auth } from "@/lib/auth";
import { getMilestones, type Milestone } from "@/lib/services/about";

export const metadata: Metadata = {
  title: "Road So Far",
};

export const dynamic = "force-dynamic";

export default async function AdminMilestonesPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const milestones = await getMilestones().catch(() => [] as Milestone[]);

  return (
    <>
      <header className="admin-page-header">
        <h1 className="admin-page-title">Road So Far</h1>
      </header>

      <MilestonesTable initialData={milestones} isViewer={session.user.isViewer} />
    </>
  );
}
