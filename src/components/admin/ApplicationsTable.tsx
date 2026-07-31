"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import InlineDelete from "@/components/admin/InlineDelete";
import type { Application, ApplicationStatus, InterviewGroup } from "@/types/settings";
import { APPLICATION_STATUSES, INTERVIEW_GROUPS } from "@/types/settings";

// S66: the per-stage dot colours that used to live here are now the
// .status-* modifier rules in globals.css, keyed off the raw DB value.

const detailLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.65rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: "0.35rem",
};

const detailBodyStyle: React.CSSProperties = {
  fontFamily: "var(--font-space), sans-serif",
  fontSize: "0.875rem",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
  whiteSpace: "pre-wrap",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function domainList(app: Application): string {
  return [app.domain_interest, app.domain_interest_2, app.domain_interest_3]
    .filter(Boolean)
    .join(" · ");
}

interface ApplicationsTableProps {
  applications: Application[];
  // S32: page sets this on the plain INTERVIEW tab (no group filter) so the
  // panel auto-assign action appears exactly where it makes sense.
  showPanelAssign?: boolean;
  /** Read-only admin tier: hides every write control (S47). */
  isViewer?: boolean;
}

export default function ApplicationsTable({
  applications,
  showPanelAssign = false,
  isViewer = false,
}: ApplicationsTableProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [panelCount, setPanelCount] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  // Local status overrides so a PATCH updates the dot without a full refetch.
  const [statuses, setStatuses] = useState<Record<string, ApplicationStatus>>({});
  // Same optimistic pattern for interview groups.
  const [groups, setGroups] = useState<Record<string, InterviewGroup | null>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const statusOf = (app: Application): ApplicationStatus =>
    statuses[app.id] ?? app.status;

  // Explicit undefined check: a stored null means "cleared", so ?? won't do.
  const groupOf = (app: Application): InterviewGroup | null => {
    const override = groups[app.id];
    return override !== undefined ? override : app.interview_group ?? null;
  };

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function changeGroup(id: string, group: InterviewGroup | null) {
    const previous = groupOf(applications.find((a) => a.id === id)!);
    setGroups((prev) => ({ ...prev, [id]: group }));
    try {
      const res = await fetch(`/api/admin/applications/${id}/group`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group }),
      });
      if (!res.ok) throw new Error("Group update failed");
    } catch {
      setGroups((prev) => ({ ...prev, [id]: previous }));
      alert("Group update failed. Please retry.");
    }
  }

  async function handleBulkStatus() {
    if (!bulkStatus || selected.size === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/applications/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], status: bulkStatus }),
      });
      if (!res.ok) throw new Error("Bulk update failed");
      setSelected(new Set());
      setBulkStatus("");
      router.refresh();
    } catch {
      alert("Bulk update failed. Please retry.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleAutoAssign() {
    if (!panelCount) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/admin/applications/auto-assign-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panel_count: panelCount }),
      });
      if (!res.ok) throw new Error("Auto-assign failed");
      router.refresh();
    } catch {
      alert("Auto-assign failed. Please retry.");
    } finally {
      setAssigning(false);
    }
  }

  async function changeStatus(id: string, status: ApplicationStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Status update failed");
      setStatuses((prev) => ({ ...prev, [id]: status }));
    } catch {
      alert("Status update failed. Please retry.");
    } finally {
      setUpdatingId(null);
    }
  }

  const hasUnassignedInterviewees = applications.some(
    (app) => statusOf(app) === "interview" && groupOf(app) === null
  );

  return (
    <section className="admin-table-wrap">
      {showPanelAssign && hasUnassignedInterviewees && !isViewer && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            padding: "12px 0",
            marginBottom: "1rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.68rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Panels:
          </span>
          {/* segmented tiles - same treatment as the Bootstrap max-occupancy picker */}
          <div style={{ display: "flex" }}>
            {([1, 2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPanelCount(panelCount === n ? null : n)}
                aria-pressed={panelCount === n}
                style={{
                  minWidth: "3.2rem",
                  padding: "0.5rem 0.6rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  background: panelCount === n ? "var(--accent)" : "transparent",
                  color: panelCount === n ? "var(--bg-base)" : "var(--text-primary)",
                  border: "1px solid var(--border)",
                  borderLeft: n === 1 ? "1px solid var(--border)" : "none",
                }}
              >
                {n === 1 ? "A" : `A–${["", "B", "C", "D"][n - 1]}`}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void handleAutoAssign()}
            disabled={!panelCount || assigning}
            style={{
              background: panelCount ? "var(--accent)" : "var(--bg-base)",
              border: "1px solid var(--border)",
              color: panelCount ? "var(--bg-base)" : "var(--text-muted)",
              fontFamily: "var(--font-chakra)",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              padding: "0.5rem 1.25rem",
              cursor: assigning ? "wait" : panelCount ? "pointer" : "default",
            }}
          >
            {assigning ? "ASSIGNING..." : "AUTO-ASSIGN"}
          </button>
          <span
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-muted)" }}
          >
            Round-robins interviewees without a panel, oldest first.
          </span>
        </div>
      )}
      <table className="admin-table">
        <thead>
          <tr>
            {/* Column is kept for viewers so colSpan stays correct. */}
            <th>
              {isViewer ? null : (
                <input
                  type="checkbox"
                  aria-label="Select all filtered applications"
                  checked={applications.length > 0 && selected.size === applications.length}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? new Set(applications.map((a) => a.id))
                        : new Set()
                    )
                  }
                  style={{ cursor: "pointer" }}
                />
              )}
            </th>
            <th>Name</th>
            <th>Email</th>
            <th>Domains</th>
            <th>Semester</th>
            <th>Date</th>
            <th>Status</th>
            <th>Group</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.length > 0 ? (
            applications.map((app) => {
              const status = statusOf(app);
              const expanded = expandedId === app.id;
              return (
                <Fragment key={app.id}>
                  <tr
                    onClick={() => setExpandedId(expanded ? null : app.id)}
                    style={{ cursor: "pointer" }}
                    aria-expanded={expanded}
                  >
                    {/* Checkbox cell swallows clicks so the row doesn't toggle. */}
                    <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap" }}>
                      {isViewer ? null : (
                        <input
                          type="checkbox"
                          aria-label={`Select ${app.name}`}
                          checked={selected.has(app.id)}
                          onChange={() => toggleSelected(app.id)}
                          style={{ cursor: "pointer" }}
                        />
                      )}
                    </td>
                    <td className="admin-td-primary" style={{ whiteSpace: "nowrap", fontWeight: 500 }}>
                      {app.name}
                    </td>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                      {app.email}
                    </td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                      {domainList(app)}
                    </td>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                      {app.semester ?? "-"}
                    </td>
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                      {formatDate(app.submitted_at)}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {/* Modifier keys off the raw DB value: every one of the 7
                          APPLICATION_STATUSES has a .status-* rule, legacy
                          'reviewed'/'accepted' included. */}
                      <span className={`status-badge status-${status}`}>
                        {updatingId === app.id ? "..." : status}
                      </span>
                    </td>
                    {/* Group tiles - only meaningful once an applicant reaches interview. */}
                    <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap" }}>
                      {isViewer ? (
                        <span className="admin-cell-mono">{groupOf(app) ?? "-"}</span>
                      ) : status === "interview" || status === "shortlisted" ? (
                        <div style={{ display: "flex", gap: "4px" }}>
                          {INTERVIEW_GROUPS.map((g) => {
                            const active = groupOf(app) === g;
                            return (
                              <button
                                key={g}
                                onClick={() => void changeGroup(app.id, active ? null : g)}
                                aria-label={`Set ${app.name} to group ${g}`}
                                aria-pressed={active}
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  background: active ? "var(--accent)" : "var(--bg-base)",
                                  border: "1px solid var(--border)",
                                  color: active ? "var(--bg-base)" : "var(--text-muted)",
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                }}
                              >
                                {g}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>-</span>
                      )}
                    </td>
                    {/* Actions cell swallows clicks so the row doesn't toggle. */}
                    <td style={{ whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      {isViewer ? (
                        <span className="admin-cell-mono" style={{ color: "var(--text-muted)" }}>-</span>
                      ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <select
                          value={status}
                          disabled={updatingId === app.id}
                          onChange={(e) => void changeStatus(app.id, e.target.value as ApplicationStatus)}
                          className="mono"
                          aria-label={`Status for ${app.name}`}
                          style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-strong)",
                            borderRadius: 0,
                            color: "var(--text-primary)",
                            fontSize: "0.7rem",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            padding: "0.35rem 0.5rem",
                            cursor: updatingId === app.id ? "wait" : "pointer",
                          }}
                        >
                          {APPLICATION_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.toUpperCase()}
                            </option>
                          ))}
                        </select>
                        <InlineDelete
                          endpoint={`/api/admin/applications?id=${app.id}`}
                          confirmMessage={`Permanently delete ${app.name}'s application? This cannot be undone.`}
                        />
                      </div>
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={9} style={{ background: "var(--bg-surface)", padding: "1.5rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "48rem" }}>
                          <div>
                            <p style={detailLabelStyle}>Applicant</p>
                            <p style={detailBodyStyle}>
                              {app.name} · {app.email} · {app.mobile_number ?? "-"} ·{" "}
                              {app.srn_prn ?? "-"} · Sem {app.semester ?? "-"}
                            </p>
                          </div>
                          <div>
                            <p style={detailLabelStyle}>Domains</p>
                            <p style={detailBodyStyle}>{domainList(app)}</p>
                          </div>
                          <div>
                            <p style={detailLabelStyle}>Why join</p>
                            <p style={detailBodyStyle}>{app.why_join ?? "-"}</p>
                          </div>
                          <div>
                            <p style={detailLabelStyle}>Value add</p>
                            <p style={detailBodyStyle}>{app.value_addition ?? "-"}</p>
                          </div>
                          <div>
                            <p style={detailLabelStyle}>Experience</p>
                            <p style={detailBodyStyle}>{app.domain_experience ?? "-"}</p>
                          </div>
                          {app.design_portfolio_url && (
                            <div>
                              <p style={detailLabelStyle}>Portfolio</p>
                              <a
                                href={app.design_portfolio_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ ...detailBodyStyle, color: "var(--accent)", textDecoration: "none", borderBottom: "1px solid var(--border-strong)" }}
                              >
                                {app.design_portfolio_url}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan={9} className="admin-empty">
                NO APPLICATIONS
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selected.size > 0 && !isViewer && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}
          >
            {selected.size} SELECTED
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            aria-label="Bulk status"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              background: "var(--bg-base)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 0,
              padding: "6px 8px",
            }}
          >
            <option value="">SET STATUS...</option>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            onClick={() => void handleBulkStatus()}
            disabled={!bulkStatus || bulkBusy}
            style={{
              background: bulkStatus ? "var(--accent)" : "var(--bg-base)",
              border: "1px solid var(--border)",
              color: bulkStatus ? "var(--bg-base)" : "var(--text-muted)",
              fontFamily: "var(--font-chakra)",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              padding: "6px 16px",
              cursor: bulkBusy ? "wait" : "pointer",
            }}
          >
            {bulkBusy ? "APPLYING..." : "APPLY"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            aria-label="Clear selection"
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}
          >
            x
          </button>
        </div>
      )}
    </section>
  );
}
