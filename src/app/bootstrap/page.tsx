import type { Metadata } from "next";
import { cookies } from "next/headers";

import BootstrapDashboard from "@/components/bootstrap/BootstrapDashboard";
import BootstrapLogin from "@/components/bootstrap/BootstrapLogin";
import { getVolunteerByToken } from "@/lib/services/bootstrap";

export const metadata: Metadata = {
  title: "Bootstrap",
};

export const dynamic = "force-dynamic";

export default async function BootstrapPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vg_vol_session")?.value;
  const volunteer = token
    ? await getVolunteerByToken(token).catch(() => null)
    : null;

  if (!volunteer) {
    return <BootstrapLogin />;
  }
  return (
    <BootstrapDashboard
      displayName={volunteer.display_name}
      username={volunteer.username}
    />
  );
}
