"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

import BootstrapCreateSession from "@/components/admin/BootstrapCreateSession";
import type { BootstrapSession, PoolVolunteer } from "@/lib/services/bootstrap";

export default function BootstrapSessions({
  sessions,
  pool = [],
  isViewer = false,
}: {
  sessions: BootstrapSession[];
  /** S49: pre-registered volunteers with no session yet (session_id NULL). */
  pool?: PoolVolunteer[];
  /** Read-only admin tier: hides create / activate / delete (S47). */
  isViewer?: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // S49 inline session edit - name + visitor cap, one row at a time
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMaxGroup, setEditMaxGroup] = useState("20");
  const [editError, setEditError] = useState("");

  // S49 pool assignment - which pool row is open, and its picked session/stall
  const [assignId, setAssignId] = useState<string | null>(null);
  const [assignSessionId, setAssignSessionId] = useState("");
  const [assignStallId, setAssignStallId] = useState("");
  const [assignStalls, setAssignStalls] = useState<{ id: string; stall_name: string }[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");

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

  function startEdit(s: BootstrapSession) {
    setEditError("");
    if (editingId === s.id) {
      setEditingId(null);
      return;
    }
    setEditingId(s.id);
    setEditName(s.name);
    setEditMaxGroup(String(s.max_group_size ?? 20));
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    setEditError("");
    try {
      const res = await fetch(`/api/admin/bootstrap/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          max_group_size: Number(editMaxGroup) || 20,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setEditError(data?.error ?? "Update failed");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  // stalls are fetched per session because the pool row has to offer the stalls
  // of whichever session the admin picks - the sessions list carries counts only
  async function pickAssignSession(sessionId: string) {
    setAssignSessionId(sessionId);
    setAssignStallId("");
    setAssignStalls([]);
    setAssignError("");
    if (!sessionId) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`/api/admin/bootstrap/sessions/${sessionId}`);
      if (!res.ok) {
        setAssignError("Could not load stalls for that session");
        return;
      }
      const data = await res.json();
      setAssignStalls(
        (data.stalls ?? []).map((s: { id: string; stall_name: string }) => ({
          id: s.id,
          stall_name: s.stall_name,
        }))
      );
    } catch {
      setAssignError("Could not load stalls for that session");
    } finally {
      setAssignLoading(false);
    }
  }

  function startAssign(volunteerId: string) {
    setAssignError("");
    if (assignId === volunteerId) {
      setAssignId(null);
      return;
    }
    setAssignId(volunteerId);
    setAssignSessionId("");
    setAssignStallId("");
    setAssignStalls([]);
  }

  async function confirmAssign(volunteerId: string) {
    if (!assignSessionId) {
      setAssignError("Pick a session first");
      return;
    }
    setBusyId(volunteerId);
    setAssignError("");
    try {
      const res = await fetch(`/api/admin/bootstrap/volunteers/${volunteerId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: assignSessionId,
          stallId: assignStallId || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAssignError(data?.error ?? "Assignment failed");
        return;
      }
      setAssignId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (creating && !isViewer) {
    return (
      <BootstrapCreateSession
        sessions={sessions}
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

  const shortDate = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const sectionTitleStyle: React.CSSProperties = {
    fontFamily: "var(--font-chakra), sans-serif",
    fontWeight: 700,
    fontSize: "0.85rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-primary)",
    margin: "0 0 0.75rem",
  };

  return (
    <>
      <header className="admin-page-header">
        <h1 className="admin-page-title">Bootstrap</h1>
        {!isViewer ? (
          <button
            className="btn-primary"
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
            onClick={() => setCreating(true)}
          >
            CREATE SESSION
          </button>
        ) : null}
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
                <Fragment key={s.id}>
                  <tr>
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
                      {shortDate(s.created_at)}
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
                      {!isViewer && (
                        <span style={{ display: "inline-flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          {!s.is_active && (
                            <button
                              className="btn-outline"
                              style={{ padding: "0.4rem 0.9rem", fontSize: "0.7rem", cursor: "pointer" }}
                              disabled={busyId === s.id}
                              onClick={() => activate(s.id)}
                            >
                              {busyId === s.id ? "WORKING…" : "ACTIVATE"}
                            </button>
                          )}
                          {/* S49: rename / re-cap a session after creation */}
                          <button
                            className="admin-row-action"
                            disabled={busyId === s.id}
                            onClick={() => startEdit(s)}
                          >
                            {editingId === s.id ? "CANCEL" : "EDIT"}
                          </button>
                          {!s.is_active && (
                            <button
                              className="admin-row-action admin-row-action-danger"
                              disabled={busyId === s.id}
                              onClick={() => handleDelete(s.id, s.name)}
                            >
                              DELETE
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>

                  {editingId === s.id && !isViewer && (
                    <tr>
                      <td colSpan={5} style={{ background: "var(--bg-elevated)" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "1rem",
                            alignItems: "flex-end",
                            flexWrap: "wrap",
                            padding: "0.5rem 0",
                          }}
                        >
                          <div>
                            <label htmlFor={`bs-edit-name-${s.id}`} className="admin-label">
                              Session name
                            </label>
                            <input
                              id={`bs-edit-name-${s.id}`}
                              type="text"
                              className="admin-input"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              maxLength={100}
                              style={{ width: "16rem" }}
                            />
                          </div>
                          <div>
                            <label htmlFor={`bs-edit-group-${s.id}`} className="admin-label">
                              Max visitors per group
                            </label>
                            <input
                              id={`bs-edit-group-${s.id}`}
                              type="number"
                              className="admin-input"
                              min={1}
                              max={100}
                              value={editMaxGroup}
                              onChange={(e) => setEditMaxGroup(e.target.value)}
                              style={{ width: "8rem" }}
                            />
                          </div>
                          <button
                            className="btn-primary"
                            style={{ padding: "0.55rem 1.1rem", fontSize: "0.7rem", cursor: "pointer" }}
                            disabled={busyId === s.id || !editName.trim()}
                            onClick={() => saveEdit(s.id)}
                          >
                            {busyId === s.id ? "SAVING…" : "SAVE"}
                          </button>
                        </div>
                        {editError && (
                          <p className="admin-error" style={{ marginTop: "0.5rem" }}>
                            {editError}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
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

      {/* S49: volunteers who registered before any session existed (mig 021).
          They have no session_id, so they cannot log in until assigned. */}
      <section style={{ marginTop: "2.5rem" }}>
        <h2 style={sectionTitleStyle}>Pre-registered Volunteers</h2>
        <p
          className="admin-hint"
          style={{ marginTop: "-0.25rem", marginBottom: "0.75rem" }}
        >
          Registered at /bootstrap/register/stall while no session was active.
          Creating a session auto-assigns anyone whose stall preference matches a
          stall name; the rest are assigned here.
        </p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username (SRN)</th>
                <th>Phone</th>
                <th>Prefers</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pool.length > 0 ? (
                pool.map((v) => (
                  <Fragment key={v.id}>
                    <tr>
                      <td className="admin-td-primary" style={{ fontWeight: 500 }}>
                        {v.display_name}
                      </td>
                      <td className="admin-cell-mono">{v.username}</td>
                      <td className="admin-cell-mono">{v.phone ?? "-"}</td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {v.preferred_stall_name ?? "-"}
                      </td>
                      <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                        {shortDate(v.created_at)}
                      </td>
                      <td>
                        {isViewer ? (
                          <span className="admin-cell-mono" style={{ color: "var(--text-muted)" }}>
                            -
                          </span>
                        ) : (
                          <button
                            className="admin-row-action"
                            disabled={busyId === v.id || sessions.length === 0}
                            title={
                              sessions.length === 0
                                ? "Create a session first"
                                : "Assign to a session stall"
                            }
                            onClick={() => startAssign(v.id)}
                          >
                            {assignId === v.id ? "CANCEL" : "ASSIGN"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {assignId === v.id && !isViewer && (
                      <tr>
                        <td colSpan={6} style={{ background: "var(--bg-elevated)" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "1rem",
                              alignItems: "flex-end",
                              flexWrap: "wrap",
                              padding: "0.5rem 0",
                            }}
                          >
                            <div>
                              <label htmlFor={`bs-assign-session-${v.id}`} className="admin-label">
                                Session
                              </label>
                              <select
                                id={`bs-assign-session-${v.id}`}
                                className="admin-input"
                                value={assignSessionId}
                                onChange={(e) => pickAssignSession(e.target.value)}
                                style={{ width: "16rem" }}
                              >
                                <option value="">Select a session…</option>
                                {sessions.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                    {s.is_active ? " (active)" : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`bs-assign-stall-${v.id}`} className="admin-label">
                                Stall
                              </label>
                              <select
                                id={`bs-assign-stall-${v.id}`}
                                className="admin-input"
                                value={assignStallId}
                                onChange={(e) => setAssignStallId(e.target.value)}
                                disabled={!assignSessionId || assignLoading}
                                style={{ width: "14rem" }}
                              >
                                <option value="">
                                  {assignLoading ? "Loading…" : "No stall yet"}
                                </option>
                                {assignStalls.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.stall_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              className="btn-primary"
                              style={{ padding: "0.55rem 1.1rem", fontSize: "0.7rem", cursor: "pointer" }}
                              disabled={busyId === v.id || !assignSessionId}
                              onClick={() => confirmAssign(v.id)}
                            >
                              {busyId === v.id ? "ASSIGNING…" : "CONFIRM"}
                            </button>
                          </div>
                          {assignError && (
                            <p className="admin-error" style={{ marginTop: "0.5rem" }}>
                              {assignError}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td className="admin-empty" colSpan={6}>
                    No pre-registered volunteers waiting.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
