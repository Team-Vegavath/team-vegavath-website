"use client";

import { Fragment, useState } from "react";
import InlineDelete from "@/components/admin/InlineDelete";
import type { Application, ApplicationStatus } from "@/types/settings";
import { APPLICATION_STATUSES } from "@/types/settings";

// Dot colors per pipeline stage; 'reviewed'/'accepted' are legacy rows.
const STATUS_COLORS: Record<ApplicationStatus, string> = {
  pending: "var(--text-muted)",
  shortlisted: "var(--gold)",
  interview: "var(--accent)",
  selected: "var(--success)",
  rejected: "var(--error)",
  reviewed: "var(--text-muted)",
  accepted: "var(--success)",
};

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
}

export default function ApplicationsTable({ applications }: ApplicationsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Local status overrides so a PATCH updates the dot without a full refetch.
  const [statuses, setStatuses] = useState<Record<string, ApplicationStatus>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const statusOf = (app: Application): ApplicationStatus =>
    statuses[app.id] ?? app.status;

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

  return (
    <section className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Domains</th>
            <th>Semester</th>
            <th>Date</th>
            <th>Status</th>
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
                    <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>
                      <span
                        className="admin-dot"
                        style={{ background: STATUS_COLORS[status] }}
                        aria-hidden="true"
                      />
                      {updatingId === app.id ? "..." : status}
                    </td>
                    {/* Actions cell swallows clicks so the row doesn't toggle. */}
                    <td style={{ whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
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
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={7} style={{ background: "var(--bg-surface)", padding: "1.5rem" }}>
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
              <td colSpan={7} className="admin-empty">
                NO APPLICATIONS
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
