"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** S76C: every action on this page used to alert a hardcoded string, so a real
 *  server error ("Failed to create invite" from a 500) was indistinguishable
 *  from a dropped network request, and the HTTP status was never visible at all.
 *  This shows the status plus whatever the server actually said. */
async function failureText(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return `${data?.error ?? fallback} (HTTP ${res.status})`;
}

/** Shared copyable-URL box for generated invite / reset links. */
function CopyUrlBox({ url, note }: { url: string; note: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // clipboard blocked - the URL is selectable text, user can copy manually
    }
  }

  return (
    <>
      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          padding: "0.75rem 1rem",
        }}
      >
        <code
          className="mono"
          style={{
            flex: 1,
            fontSize: "0.7rem",
            color: "var(--text-secondary)",
            wordBreak: "break-all",
            userSelect: "all",
          }}
        >
          {url}
        </code>
        <button type="button" onClick={copy} className="admin-row-action">
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
      <p className="mono" style={{ marginTop: "0.5rem", fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
        {note}
      </p>
    </>
  );
}

/** Godfather-only: POSTs for a one-time invite token, shows a copyable URL. */
export function GenerateInviteButton() {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("admin");
  const [url, setUrl] = useState("");
  const [issuedRole, setIssuedRole] = useState<"admin" | "viewer">("admin");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!name.trim()) {
      alert("Enter the invitee's full name first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/accounts/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteeName: name.trim(), role }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.url) {
          setUrl(data.url as string);
          setIssuedRole(data.role === "viewer" ? "viewer" : "admin");
        } else {
          alert("Server returned no invite URL (HTTP 200)");
        }
      } else {
        alert(await failureText(res, "Failed to generate invite link"));
      }
    } catch (e) {
      alert(`Could not reach the server: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "stretch" }}>
        <div>
          <label
            htmlFor="invitee-name"
            className="mono"
            style={{
              display: "block",
              fontSize: "0.65rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "0.4rem",
            }}
          >
            Invitee full name
          </label>
          <input
            id="invitee-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rahul Kumar"
            style={{
              minWidth: "16rem",
              border: "1px solid var(--border-strong)",
              background: "var(--bg-base)",
              padding: "0.55rem 0.75rem",
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>
        <div>
          <label
            htmlFor="invitee-role"
            className="mono"
            style={{
              display: "block",
              fontSize: "0.65rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "0.4rem",
            }}
          >
            Access level
          </label>
          <select
            id="invitee-role"
            value={role}
            onChange={(e) => setRole(e.target.value === "viewer" ? "viewer" : "admin")}
            style={{
              minWidth: "10rem",
              border: "1px solid var(--border-strong)",
              background: "var(--bg-base)",
              padding: "0.55rem 0.75rem",
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              outline: "none",
            }}
          >
            <option value="admin">Admin - full access</option>
            <option value="viewer">Viewer - read only</option>
          </select>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="btn-primary"
          style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", alignSelf: "flex-end" }}
        >
          {busy ? "GENERATING…" : "GENERATE INVITE LINK"}
        </button>
      </div>

      {url && (
        <CopyUrlBox
          url={url}
          note={`${issuedRole === "viewer" ? "VIEWER" : "ADMIN"} INVITE - ONE-TIME LINK - EXPIRES IN 48 HOURS`}
        />
      )}
    </div>
  );
}

export type OpenTokenRow = {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
};

function daysLeft(expiresAt: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
  );
}

/** S67: production-only. An open registration link created against the draft or
 *  a local database is a live credential path into whichever environment made
 *  it, and there is no reason to mint one outside prod. Set to "true" ONLY in
 *  the prod Vercel project; unset everywhere else, which is falsy.
 *
 *  Read at module scope because NEXT_PUBLIC_* is inlined at build time -- this
 *  is a literal in the bundle, not a runtime lookup (same pattern as
 *  NEXT_PUBLIC_R2_PUBLIC_URL in src/lib/r2.ts and CheckinQROverlay.tsx). */
const SHOW_VIEWER_INVITES = process.env.NEXT_PUBLIC_SHOW_VIEWER_INVITES === "true";

/** Godfather-only (S48): one reusable link that registers anyone as a viewer.
 *  Named invites don't scale to a 30-person domain; this is the alternative,
 *  with per-person approval still happening in Pending Requests.
 *
 *  This is an ADDITIONAL condition on top of the godfather gate the accounts
 *  page already applies -- it does not replace it. */
export function OpenViewerLink({ initialTokens }: { initialTokens: OpenTokenRow[] }) {
  const router = useRouter();
  const [tokens, setTokens] = useState<OpenTokenRow[]>(initialTokens);
  const [newUrl, setNewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState("");

  // The URL is rebuilt client-side so the list rows and the freshly created
  // link always agree on origin, whichever host the panel is served from.
  function urlFor(token: string) {
    return `${window.location.origin}/admin/register?token=${token}`;
  }

  async function create() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/accounts/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "open" }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.url) {
          setNewUrl(data.url as string);
          router.refresh();
        } else {
          alert("Server returned no link URL (HTTP 200)");
        }
      } else {
        alert(await failureText(res, "Failed to create open viewer link"));
      }
    } catch (e) {
      alert(`Could not reach the server: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this open viewer link? Anyone holding it can no longer register.")) return;
    setRevoking(id);
    try {
      const res = await fetch(`/api/admin/accounts/invite?tokenId=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTokens((rows) => rows.filter((r) => r.id !== id));
        setNewUrl("");
        router.refresh();
      } else {
        alert(await failureText(res, "Failed to revoke link"));
      }
    } catch (e) {
      alert(`Could not reach the server: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRevoking("");
    }
  }

  // After the hooks, never before -- SHOW_VIEWER_INVITES is a build-time
  // constant so the order is stable either way, but the lint rule is not.
  // Renders nothing at all rather than a disabled control: outside production
  // this feature does not exist, and a greyed-out button advertises it.
  if (!SHOW_VIEWER_INVITES) return null;

  return (
    <div style={{ marginTop: "2rem", borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
      <h3
        className="heading"
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          margin: "0 0 0.5rem",
        }}
      >
        Open viewer link
      </h3>
      <p
        className="mono"
        style={{
          fontSize: "0.68rem",
          lineHeight: 1.7,
          color: "var(--text-muted)",
          maxWidth: "42rem",
          margin: "0 0 1rem",
        }}
      >
        Anyone with this link can register as a viewer. Approve them
        individually in Pending Requests. Valid 30 days, reusable until revoked.
      </p>

      <button
        type="button"
        onClick={create}
        disabled={busy}
        className="btn-primary"
        style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}
      >
        {busy ? "CREATING…" : "CREATE OPEN VIEWER LINK"}
      </button>

      {newUrl && (
        <CopyUrlBox url={newUrl} note="OPEN VIEWER LINK - REUSABLE - EXPIRES IN 30 DAYS" />
      )}

      {tokens.length > 0 && (
        <section className="admin-table-wrap" style={{ marginTop: "1.25rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Expires in</th>
                <th>Link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id}>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                    {new Date(t.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                    {daysLeft(t.expires_at)} days
                  </td>
                  <td
                    className="admin-cell-mono"
                    style={{
                      maxWidth: "22rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--text-secondary)",
                    }}
                    title={`/admin/register?token=${t.token}`}
                  >
                    /admin/register?token={t.token.slice(0, 12)}…
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                      <CopyLinkButton url={urlFor(t.token)} />
                      <button
                        type="button"
                        onClick={() => revoke(t.id)}
                        disabled={revoking === t.id}
                        className="admin-row-action admin-row-action-danger"
                      >
                        {revoking === t.id ? "…" : "REVOKE"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

/** Inline copy for a table row -- CopyUrlBox is too tall to sit in a cell. */
function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="admin-row-action"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {
          // clipboard blocked - the full URL is in the cell's title attribute
        }
      }}
    >
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}

/** Godfather-only: generates a one-time password reset link for an account. */
export function ResetPasswordButton({ accountId }: { accountId: string }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/reset-token`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.url) {
          setUrl(data.url as string);
        } else {
          alert("Server returned no reset URL (HTTP 200)");
        }
      } else {
        alert(await failureText(res, "Failed to generate reset link"));
      }
    } catch (e) {
      alert(`Could not reach the server: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-block" }}>
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="admin-row-action"
      >
        {busy ? "…" : "RESET PASSWORD"}
      </button>
      {url && <CopyUrlBox url={url} note="ONE-TIME LINK - EXPIRES IN 2 HOURS" />}
    </span>
  );
}

/** Godfather-only: approve / reject a pending registration request. */
export function PendingRequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    if (action === "reject" && !confirm("Reject this registration request?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/accounts/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        alert(await failureText(res, "Action failed"));
      }
      router.refresh();
    } catch (e) {
      alert(`Could not reach the server: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      <button
        type="button"
        onClick={() => act("approve")}
        disabled={busy}
        className="admin-row-action"
        style={{ color: "var(--success)" }}
      >
        {busy ? "…" : "APPROVE"}
      </button>
      <button
        type="button"
        onClick={() => act("reject")}
        disabled={busy}
        className="admin-row-action admin-row-action-danger"
      >
        {busy ? "…" : "REJECT"}
      </button>
    </div>
  );
}
