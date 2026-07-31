"use client";

import { useState } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
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

// S67: STATUS_COLORS is gone -- .status-badge status-${status} carries all four
// colours now, and S67 added the .status-confirmed / .status-waitlisted
// modifiers that were missing. Same deletion S66 made in ApplicationsTable, for
// the same reason: one place for a status colour, not two that can disagree.
// (They already did: rejected was --accent here and --error in the badge.)

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
      {/* S67: last non-Bootstrap legacy .admin-page-header call site, migrated.
          The "n TOTAL" span was the header's right-hand slot; it is the subtitle
          now -- a count is what a subtitle is for, and AdminPageHeader's action
          slot is for controls. */}
      <AdminPageHeader
        title="Registrations"
        subtitle={`${items.length} ${items.length === 1 ? "registration" : "registrations"}`}
        level={2}
      />

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
                    {/* Viewer gets the badge; the admin's cell stays a <select>,
                        because a badge cannot be an interactive dropdown and the
                        select is already the colour-free control. */}
                    {isViewer ? (
                      <span className={`status-badge status-${reg.status}`}>{reg.status}</span>
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
                          // S67: elevated -- table rows are --bg-card now, and a
                          // control has to sit above the row it lives in.
                          background: "var(--bg-elevated)",
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
