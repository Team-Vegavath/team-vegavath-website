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
  const [url, setUrl] = useState("");
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
        body: JSON.stringify({ inviteeName: name.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        setUrl(data.url as string);
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

      {url && <CopyUrlBox url={url} note="ONE-TIME LINK - EXPIRES IN 48 HOURS" />}
    </div>
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
