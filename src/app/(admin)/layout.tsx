import type { ReactNode } from "react";

import AdminShell from "@/components/admin/AdminShell";
import SignOutButton from "@/components/admin/SignOutButton";
import { getPendingRequests } from "@/lib/services/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Badge dot on the Accounts nav link; swallow errors so a missing table
  // (pre-migration-010) never breaks the whole admin panel.
  const hasPendingAccounts = await getPendingRequests()
    .then((rows) => rows.length > 0)
    .catch(() => false);

  // AdminShell (client) renders the sidebar chrome and skips it on /admin (login).
  // SignOutButton is a server component, so it's passed down as a slot.
  return (
    <AdminShell signOutSlot={<SignOutButton />} hasPendingAccounts={hasPendingAccounts}>
      {children}
    </AdminShell>
  );
}
