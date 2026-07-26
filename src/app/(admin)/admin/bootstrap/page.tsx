import type { Metadata } from "next";
import { redirect } from "next/navigation";

import BootstrapAdminDashboard from "@/components/admin/BootstrapAdminDashboard";
import BootstrapSessions from "@/components/admin/BootstrapSessions";
import { auth } from "@/lib/auth";
import {
  getBootstrapSessions,
  getBootstrapStalls,
  getBootstrapVolunteers,
  getUnassignedVolunteers,
  type BootstrapSession,
  type PoolVolunteer,
} from "@/lib/services/bootstrap";

export const metadata: Metadata = {
  title: "Bootstrap",
};

export const dynamic = "force-dynamic";

export default async function AdminBootstrapPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const sessions = await getBootstrapSessions().catch(() => [] as BootstrapSession[]);
  const active = sessions.find((s) => s.is_active) ?? null;

  if (active) {
    const [stalls, volunteers] = await Promise.all([
      getBootstrapStalls(active.id),
      getBootstrapVolunteers(active.id),
    ]);
    return (
      <BootstrapAdminDashboard
        session={active}
        initialStalls={stalls}
        initialVolunteers={volunteers}
        isViewer={session.user.isViewer}
      />
    );
  }

  // S49: the pre-registration pool only matters on the sessions view - the live
  // dashboard is for a session that already has its volunteers.
  const pool = await getUnassignedVolunteers().catch(() => [] as PoolVolunteer[]);

  return (
    <BootstrapSessions
      sessions={sessions}
      pool={pool}
      isViewer={session.user.isViewer}
    />
  );
}
