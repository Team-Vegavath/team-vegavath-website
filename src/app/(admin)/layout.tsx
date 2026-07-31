import type { ReactNode } from "react";

import AdminShell from "@/components/admin/AdminShell";
import SignOutButton from "@/components/admin/SignOutButton";
import { auth } from "@/lib/auth";
import { getPendingRequests } from "@/lib/services/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Badge dot on the Accounts nav link; swallow errors so a missing table
  // (pre-migration-010) never breaks the whole admin panel.
  const hasPendingAccounts = await getPendingRequests()
    .then((rows) => rows.length > 0)
    .catch(() => false);

  // S65 sidebar footer. The session carries the three role booleans, not a
  // `role` string (see src/types/next-auth.d.ts), so the label is derived
  // here instead of augmenting the session type for one line of chrome.
  const session = await auth();
  const userRole = session?.user
    ? session.user.isGodfather
      ? "Godfather"
      : session.user.isViewer
        ? "Viewer"
        : "Admin"
    : undefined;

  // AdminShell (client) renders the sidebar chrome and skips it on /admin (login).
  // SignOutButton is a server component, so it's passed down as a slot.
  return (
    <AdminShell
      signOutSlot={<SignOutButton />}
      hasPendingAccounts={hasPendingAccounts}
      userName={session?.user?.name ?? undefined}
      userRole={userRole}
    >
      {children}
    </AdminShell>
  );
}
