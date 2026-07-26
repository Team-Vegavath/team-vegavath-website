"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        setUrl(data.url as string);
        setIssuedRole(data.role === "viewer" ? "viewer" : "admin");
      } else {
        alert(data?.error ?? "Failed to generate invite link");
      }
    } catch {
      alert("Failed to generate invite link");
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

/** Godfather-only (S48): one reusable link that registers anyone as a viewer.
 *  Named invites don't scale to a 30-person domain; this is the alternative,
 *  with per-person approval still happening in Pending Requests. */
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
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        setNewUrl(data.url as string);
        router.refresh();
      } else {
        alert(data?.error ?? "Failed to create open viewer link");
      }
    } catch {
      alert("Failed to create open viewer link");
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
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Failed to revoke link");
      }
    } catch {
      alert("Failed to revoke link");
    } finally {
      setRevoking("");
    }
  }

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
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        setUrl(data.url as string);
      } else {
        alert(data?.error ?? "Failed to generate reset link");
      }
    } catch {
      alert("Failed to generate reset link");
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
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Action failed");
      }
      router.refresh();
    } catch {
      alert("Action failed. Please retry.");
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
