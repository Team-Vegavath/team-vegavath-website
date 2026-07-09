import type { ReactNode } from "react";

import AdminShell from "@/components/admin/AdminShell";
import SignOutButton from "@/components/admin/SignOutButton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  // AdminShell (client) renders the sidebar chrome and skips it on /admin (login).
  // SignOutButton is a server component, so it's passed down as a slot.
  return <AdminShell signOutSlot={<SignOutButton />}>{children}</AdminShell>;
}
