import type { Metadata } from "next";

import BootstrapChecklist from "@/components/bootstrap/BootstrapChecklist";
import { getVisitorChecklistContext } from "@/lib/services/bootstrap";

export const metadata: Metadata = {
  title: "Your Bootstrap Progress",
};

export const dynamic = "force-dynamic";

/**
 * S73D (J2). PUBLIC page, mirroring /bootstrap/checkin/[token]'s shape: a
 * force-dynamic server component that resolves fresh data on every request.
 * There is no client-side polling and no submitted state - a student glances at
 * this between stalls, and a reload IS the refresh mechanism.
 *
 * The id is the visitor's own row id, handed to them in their check-in response.
 * An unknown id renders the same dead end a bad check-in token does rather than
 * confirming or denying that a visitor exists.
 */
export default async function BootstrapChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // A malformed id (not a UUID) throws in Postgres rather than returning no
  // rows, so the catch is what turns a junk URL into the not-found state.
  const ctx = await getVisitorChecklistContext(id).catch(() => null);

  return <BootstrapChecklist ctx={ctx} />;
}
