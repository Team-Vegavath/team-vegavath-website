import type { Metadata } from "next";

import BootstrapFeedback from "@/components/bootstrap/BootstrapFeedback";
import { getActiveBootstrapSession, getBootstrapStalls } from "@/lib/services/bootstrap";

export const metadata: Metadata = {
  title: "Bootstrap Feedback",
};

export const dynamic = "force-dynamic";

// PUBLIC page - visitor feedback, no login involved.
export default async function BootstrapFeedbackPage() {
  const session = await getActiveBootstrapSession().catch(() => null);
  const stalls = session
    ? await getBootstrapStalls(session.id).catch(() => [])
    : [];
  return (
    <BootstrapFeedback
      hasSession={session !== null}
      stalls={stalls.map((s) => ({ id: s.id, stall_name: s.stall_name }))}
    />
  );
}
