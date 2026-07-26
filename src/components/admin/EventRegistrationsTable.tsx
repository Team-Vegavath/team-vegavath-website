"use client";

import { useState } from "react";

import type {
  EventRegistration,
  EventRegistrationStatus,
} from "@/lib/services/events";

const STATUSES: EventRegistrationStatus[] = [
  "pending",
  "confirmed",
  "rejected",
  "waitlisted",
];

const STATUS_COLORS: Record<EventRegistrationStatus, string> = {
  pending: "var(--text-muted)",
  confirmed: "var(--success)",
  rejected: "var(--accent)",
  waitlisted: "var(--gold)",
};

interface Props {
  eventId: string;
  initialData: EventRegistration[];
  /** Read-only admin tier: status stays visible but is not editable (S47). */
  isViewer?: boolean;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

export default function EventRegistrationsTable({
  eventId,
  initialData,
  isViewer = false,
}: Props) {
  const [items, setItems] = useState(initialData);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeStatus(id: string, status: EventRegistrationStatus) {
    const previous = items;
    // Optimistic, reverted on failure -- same pattern as the team table.
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    setBusyId(id);

    const res = await fetch(`/api/admin/events/${eventId}/registrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);

    setBusyId(null);

    if (!res?.ok) {
      setItems(previous);
      alert("Could not update the status. Please retry.");
    }
  }

  return (
    <section style={{ marginTop: "3rem" }}>
      <header className="admin-page-header">
        <h2 className="admin-page-title" style={{ fontSize: "1.1rem" }}>
          Registrations
        </h2>
        <span
          className="mono"
          style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "var(--text-muted)" }}
        >
          {items.length} TOTAL
        </span>
      </header>

      <section className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>SRN</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((reg) => (
                <tr key={reg.id}>
                  <td className="admin-td-primary" style={{ whiteSpace: "nowrap", fontWeight: 500 }}>
                    {reg.name}
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                    {reg.email}
                  </td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{reg.phone}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{reg.srn ?? "-"}</td>
                  <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                    {formatDate(reg.registered_at)}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span
                      className="admin-dot"
                      style={{ background: STATUS_COLORS[reg.status] }}
                      aria-hidden="true"
                    />
                    {isViewer ? (
                      <span className="admin-cell-mono" style={{ textTransform: "uppercase" }}>
                        {reg.status}
                      </span>
                    ) : (
                      <select
                        value={reg.status}
                        disabled={busyId === reg.id}
                        onChange={(e) =>
                          void changeStatus(reg.id, e.target.value as EventRegistrationStatus)
                        }
                        className="mono"
                        aria-label={`Status for ${reg.name}`}
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-strong)",
                          borderRadius: 0,
                          color: "var(--text-primary)",
                          fontSize: "0.7rem",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          padding: "0.35rem 0.5rem",
                          cursor: busyId === reg.id ? "wait" : "pointer",
                        }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No registrations yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}
