import type { Metadata } from "next";

import BootstrapCheckin from "@/components/bootstrap/BootstrapCheckin";
import { getCheckinContext } from "@/lib/services/bootstrap";

export const metadata: Metadata = {
  title: "Bootstrap Check-in",
};

export const dynamic = "force-dynamic";

// PUBLIC page - visitors land here from a group lead's QR code, no login.
// The token resolves to that lead's group; a bad token or inactive session
// renders the "not started" state (S33, migration 015).
export default async function BootstrapCheckinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await getCheckinContext(token).catch(() => null);

  return (
    <BootstrapCheckin
      token={token}
      sessionName={ctx?.session_name ?? null}
      // S72C (Section E): the pre-submit "Joining ..." line renders this number.
      // group_name ("Group A") is no longer passed - nothing visitor-facing shows
      // the letter form any more; it stays in the DB as the join key only.
      groupNumber={ctx?.group_number ?? null}
      isFull={ctx != null && ctx.group_id != null && ctx.visitor_count >= ctx.max_group_size}
    />
  );
}
