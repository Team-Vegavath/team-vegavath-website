import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminProfileForm from "@/components/admin/AdminProfileForm";
import { auth } from "@/lib/auth";
import { getAdminAccountById } from "@/lib/services/admin";

export const metadata: Metadata = {
  title: "Profile",
};

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/admin");

  const accountId = session.user.accountId;

  // The env godfather has no admin_accounts row -- auth.ts gives it the literal
  // id "godfather". That string, not isGodfather, is the test: a DB account can
  // carry role='godfather' and DOES have a row to edit.
  const account =
    accountId && accountId !== "godfather"
      ? await getAdminAccountById(accountId).catch(() => null)
      : null;

  if (!account) {
    return (
      <>
        <AdminPageHeader title="Profile" subtitle="Environment-configured account" />
        <div className="admin-form">
          <span className="admin-section-label admin-form-section">Account</span>
          <dl style={{ display: "grid", gap: "1.4rem" }}>
            <div>
              <dt className="admin-label">Display name</dt>
              <dd style={{ fontSize: "0.95rem" }}>
                {session.user.name ?? "Vegavath Admin"}
              </dd>
            </div>
            {/* Not a .status-badge: S66 settled that a role is not a status and
                badging one implies the same vocabulary as the pipeline states. */}
            <div>
              <dt className="admin-label">Role</dt>
              <dd className="admin-cell-mono" style={{ color: "var(--accent)" }}>
                GODFATHER
              </dd>
            </div>
          </dl>
          <p className="admin-hint" style={{ marginTop: "1.6rem" }}>
            This account is configured through environment variables
            (ADMIN_USERNAME / ADMIN_PASSWORD_HASH / ADMIN_DISPLAY_NAME) and has no
            database row, so it cannot be edited here. Change it in the Vercel
            project settings.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader title="Profile" subtitle={account.username} />
      <AdminProfileForm
        displayName={account.display_name}
        mobileNumber={account.mobile_number ?? ""}
        username={account.username}
        role={account.role}
      />
    </>
  );
}
