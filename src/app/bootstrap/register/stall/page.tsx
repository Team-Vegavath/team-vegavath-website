import type { Metadata } from "next";

import BootstrapRegister from "@/components/bootstrap/BootstrapRegister";
import { getActiveBootstrapSession, getBootstrapStalls } from "@/lib/services/bootstrap";

export const metadata: Metadata = {
  title: "Stall Volunteer Registration",
};

export const dynamic = "force-dynamic";

// PUBLIC page (S35) - stall volunteers self-register, no login involved.
export default async function StallRegisterPage() {
  const session = await getActiveBootstrapSession().catch(() => null);
  const stalls = session ? await getBootstrapStalls(session.id).catch(() => []) : [];
  return (
    <BootstrapRegister
      variant="stall"
      hasSession={session !== null}
      stalls={stalls.map((s) => ({ id: s.id, stall_name: s.stall_name }))}
    />
  );
}
