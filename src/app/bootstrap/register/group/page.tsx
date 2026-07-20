import type { Metadata } from "next";

import BootstrapRegister from "@/components/bootstrap/BootstrapRegister";
import { getActiveBootstrapSession } from "@/lib/services/bootstrap";

export const metadata: Metadata = {
  title: "Group Volunteer Registration",
};

export const dynamic = "force-dynamic";

// PUBLIC page (S35) - group volunteers self-register, no login involved.
export default async function GroupRegisterPage() {
  const session = await getActiveBootstrapSession().catch(() => null);
  return <BootstrapRegister variant="group" hasSession={session !== null} />;
}
