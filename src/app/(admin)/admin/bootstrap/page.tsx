import type { Metadata } from "next";
import { redirect } from "next/navigation";

import BootstrapAdminDashboard from "@/components/admin/BootstrapAdminDashboard";
import BootstrapSessions from "@/components/admin/BootstrapSessions";
import { auth } from "@/lib/auth";
import {
  getBootstrapSessions,
  getBootstrapStalls,
  getBootstrapVolunteers,
  type BootstrapSession,
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
      />
    );
  }

  return <BootstrapSessions sessions={sessions} />;
}
