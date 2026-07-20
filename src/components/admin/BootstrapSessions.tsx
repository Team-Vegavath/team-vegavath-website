"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import BootstrapCreateSession from "@/components/admin/BootstrapCreateSession";
import type { BootstrapSession } from "@/lib/services/bootstrap";

export default function BootstrapSessions({ sessions }: { sessions: BootstrapSession[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function activate(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/bootstrap/sessions/${id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `Delete session "${name}"? This also deletes all stalls and volunteer accounts for this session. This cannot be undone.`
      )
    )
      return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/bootstrap/sessions/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.error ?? "Delete failed");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (creating) {
    return (
      <BootstrapCreateSession
        onDone={() => {
          setCreating(false);
          router.refresh();
        }}
      />
    );
  }

  // S35: self-registered volunteer accounts pile up in old sessions; nudge the
  // admin to clean up (no automated deletion - DELETE stays a manual click).
  // created_at is the only timestamp on sessions, so "inactive for 7+ days"
  // means an inactive session created more than 7 days ago.
  const isStale = (s: BootstrapSession) =>
    !s.is_active && Date.now() - new Date(s.created_at).getTime() > 7 * 24 * 60 * 60 * 1000;

  return (
    <>
      <header className="admin-page-header">
        <h1 className="admin-page-title">Bootstrap</h1>
        <button
          className="btn-primary"
          style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
          onClick={() => setCreating(true)}
        >
          CREATE SESSION
        </button>
      </header>

      <section className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Created</th>
              <th>Stalls</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length > 0 ? (
              sessions.map((s) => (
                <tr key={s.id}>
                  <td className="admin-td-primary" style={{ fontWeight: 500 }}>
                    {s.name}
                    {isStale(s) && (
                      <span
                        style={{
                          display: "block",
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                          fontWeight: 400,
                        }}
                      >
                        Session inactive for 7+ days. Consider deleting to remove
                        volunteer accounts.
                      </span>
                    )}
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                    {new Date(s.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="admin-cell-mono">{s.stall_count ?? 0}</td>
                  <td className="admin-cell-mono" style={{ textTransform: "uppercase" }}>
                    <span
                      className="admin-dot"
                      style={{ background: s.is_active ? "var(--success)" : "var(--text-muted)" }}
                      aria-hidden="true"
                    />
                    {s.is_active ? "ACTIVE" : "INACTIVE"}
                  </td>
                  <td>
                    {!s.is_active && (
                      <span style={{ display: "inline-flex", gap: "0.5rem" }}>
                        <button
                          className="btn-outline"
                          style={{ padding: "0.4rem 0.9rem", fontSize: "0.7rem", cursor: "pointer" }}
                          disabled={busyId === s.id}
                          onClick={() => activate(s.id)}
                        >
                          {busyId === s.id ? "WORKING…" : "ACTIVATE"}
                        </button>
                        <button
                          className="admin-row-action admin-row-action-danger"
                          disabled={busyId === s.id}
                          onClick={() => handleDelete(s.id, s.name)}
                        >
                          DELETE
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="admin-empty" colSpan={5}>
                  No sessions yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
