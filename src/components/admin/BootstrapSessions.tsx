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
                  <td className="admin-td-primary" style={{ fontWeight: 500 }}>{s.name}</td>
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
                      <button
                        className="btn-outline"
                        style={{ padding: "0.4rem 0.9rem", fontSize: "0.7rem", cursor: "pointer" }}
                        disabled={busyId === s.id}
                        onClick={() => activate(s.id)}
                      >
                        {busyId === s.id ? "ACTIVATING…" : "ACTIVATE"}
                      </button>
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
