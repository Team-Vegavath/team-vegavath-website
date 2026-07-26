import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  GenerateInviteButton,
  OpenViewerLink,
  PendingRequestActions,
  ResetPasswordButton,
} from "@/components/admin/AccountsActions";
import InlineDelete from "@/components/admin/InlineDelete";
import { auth } from "@/lib/auth";
import {
  getAdminAccounts,
  getOpenViewerTokens,
  getPendingRequests,
  type AdminAccount,
  type OpenViewerToken,
  type PendingRequest,
} from "@/lib/services/admin";

export const metadata: Metadata = {
  title: "Accounts",
};

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default async function AdminAccountsPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const isGodfather = session.user.isGodfather === true;
  const accounts = await getAdminAccounts().catch(() => [] as AdminAccount[]);
  const pending = isGodfather
    ? await getPendingRequests().catch(() => [] as PendingRequest[])
    : [];
  const openTokens = isGodfather
    ? await getOpenViewerTokens().catch(() => [] as OpenViewerToken[])
    : [];

  return (
    <>
      {isGodfather && pending.length > 0 && (
        <section style={{ marginBottom: "3rem" }}>
          <h2
            className="heading"
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--gold)",
              marginBottom: "1rem",
            }}
          >
            PENDING REQUESTS
            <span
              className="mono"
              style={{
                marginLeft: "0.75rem",
                padding: "0.15rem 0.5rem",
                fontSize: "0.7rem",
                background: "var(--bg-card)",
                border: "1px solid var(--gold)",
              }}
            >
              {pending.length}
            </span>
          </h2>

          <section className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Display name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Access</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((req) => (
                  <tr key={req.id}>
                    <td className="admin-td-primary" style={{ whiteSpace: "nowrap", fontWeight: 500 }}>
                      {req.pending_display_name}
                    </td>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{req.pending_username}</td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{req.pending_email ?? "-"}</td>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{req.pending_mobile ?? "-"}</td>
                    {/* Role was fixed when the invite was generated -- pre-019
                        tokens have no value and approve as admin. */}
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>
                      {req.pending_role === "viewer" ? "viewer" : "admin"}
                    </td>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{formatDate(req.created_at)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <PendingRequestActions id={req.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </section>
      )}

      <header className="admin-page-header">
        <h1 className="admin-page-title">Accounts</h1>
      </header>

      {isGodfather && (
        <div style={{ marginBottom: "2rem" }}>
          <GenerateInviteButton />
          {/* ISO-normalised here: the driver hands back Date objects for
              timestamptz, and OpenViewerLink is a client component. */}
          <OpenViewerLink
            initialTokens={openTokens.map((t) => ({
              id: t.id,
              token: t.token,
              created_at: new Date(t.created_at).toISOString(),
              expires_at: new Date(t.expires_at).toISOString(),
            }))}
          />
        </div>
      )}

      <section className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Display name</th>
              <th>Username</th>
              <th>Mobile</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length > 0 ? (
              accounts.map((account) => (
                <tr key={account.id}>
                  <td className="admin-td-primary" style={{ whiteSpace: "nowrap", fontWeight: 500 }}>
                    {account.display_name}
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{account.username}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{account.mobile_number ?? "-"}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>
                    <span
                      className="admin-dot"
                      style={{
                        background:
                          account.role === "godfather"
                            ? "var(--gold)"
                            : account.role === "viewer"
                              ? "var(--text-muted)"
                              : "var(--accent)",
                      }}
                      aria-hidden="true"
                    />
                    {account.role}
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{formatDate(account.created_at)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                      {isGodfather && <ResetPasswordButton accountId={account.id} />}
                      {isGodfather &&
                        (accounts.length > 1 ? (
                          <InlineDelete
                            endpoint={`/api/admin/accounts?id=${account.id}`}
                            confirmMessage={`Delete admin account "${account.display_name}"? This cannot be undone.`}
                          />
                        ) : (
                          <span
                            className="mono"
                            title="Cannot delete last admin"
                            style={{ fontSize: "0.7rem", color: "var(--text-muted)", cursor: "not-allowed" }}
                          >
                            DELETE
                          </span>
                        ))}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No additional admin accounts. Generate an invite link to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
