import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
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
      <AdminPageHeader
        title="Road So Far"
        subtitle={`${milestones.length} milestones`}
      />

      <MilestonesTable initialData={milestones} isViewer={session.user.isViewer} />
    </>
  );
}
