"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BootstrapCreateSession from "@/components/admin/BootstrapCreateSession";
import GoogleSheetsExportButton from "@/components/admin/GoogleSheetsExportButton";
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

  // S55 volunteer detail edit - name / phone / SRN, one row at a time
  const [volEditId, setVolEditId] = useState<string | null>(null);
  const [volName, setVolName] = useState("");
  const [volPhone, setVolPhone] = useState("");
  const [volSrn, setVolSrn] = useState("");
  const [volError, setVolError] = useState("");

  // S73K bulk pool reset -- an inline confirm rather than window.confirm, because
  // the dialog has to carry a working "export first" link and a native confirm
  // cannot hold one.
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [wipeError, setWipeError] = useState("");

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

  // S55: the pool row can expand into either the assign form or the edit form,
  // never both, so each opener closes the other.
  function startVolunteerEdit(v: PoolVolunteer) {
    setVolError("");
    if (volEditId === v.id) {
      setVolEditId(null);
      return;
    }
    setAssignId(null);
    setVolEditId(v.id);
    setVolName(v.display_name);
    setVolPhone(v.phone ?? "");
    setVolSrn(v.srn ?? v.username);
  }

  async function saveVolunteer(volunteerId: string) {
    setBusyId(volunteerId);
    setVolError("");
    try {
      const res = await fetch(`/api/admin/bootstrap/volunteers/${volunteerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: volName.trim(),
          phone: volPhone.trim(),
          srn: volSrn.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setVolError(data?.error ?? "Update failed");
        return;
      }
      setVolEditId(null);
      // router.refresh() re-runs the server component and swaps the row in
      // place - no reload, and no second copy of the pool in local state.
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  // S55C: pool members registered before any session existed, so their code has
  // usually been lost by the time they need it. Confirmed because the old code
  // stops working the moment this fires.
  async function resetCode(v: PoolVolunteer) {
    if (
      !confirm(
        `Issue ${v.display_name} a new login code? Their current code stops working immediately.`
      )
    )
      return;
    setBusyId(v.id);
    setVolError("");
    try {
      const res = await fetch(`/api/admin/bootstrap/volunteers/${v.id}/reset-code`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.error ?? "Reset failed");
        return;
      }
      // Same refresh path as saveVolunteer -- the server component re-renders the
      // row with the new code, so no second copy of the pool lives in state.
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  // S55B: pool entries are duplicates, test rows and dropouts often enough to
  // need a bin. Safe to hard-delete because a pool row has no session and so
  // nothing references it -- see deletePoolVolunteer.
  async function deleteVolunteer(v: PoolVolunteer) {
    if (
      !confirm(
        `Delete the pre-registration for "${v.display_name}" (${v.username})? This cannot be undone. They would have to register again.`
      )
    )
      return;
    setBusyId(v.id);
    setVolError("");
    try {
      const res = await fetch(`/api/admin/bootstrap/volunteers/${v.id}`, {
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

  // S73K: the between-events reset. Deleting the pool one row at a time is fine
  // for a duplicate and useless for a roster turnover, which is what this is for.
  async function deleteAllPool() {
    setWiping(true);
    setWipeError("");
    try {
      const res = await fetch("/api/admin/bootstrap/volunteers/pool/delete-all", {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setWipeError(data?.error ?? "Delete failed");
        return;
      }
      setWipeOpen(false);
      router.refresh();
    } finally {
      setWiping(false);
    }
  }

  function startAssign(volunteerId: string) {
    setAssignError("");
    if (assignId === volunteerId) {
      setAssignId(null);
      return;
    }
    setVolEditId(null);
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

  // S73K: same treatment as the applications page's EXPORT CSV link, so the two
  // exports read as one control rather than two inventions.
  const exportLinkStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    border: "1px solid var(--border)",
    padding: "6px 14px",
    textDecoration: "none",
  };

  return (
    <>
      <AdminPageHeader
        title="Bootstrap"
        action={
          !isViewer ? (
            <button
              className="btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
              onClick={() => setCreating(true)}
            >
              CREATE SESSION
            </button>
          ) : null
        }
      />

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
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={`status-badge status-${s.is_active ? "active" : "inactive"}`}>
                        {s.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
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
          Registered at /bootstrap/register/pool, which is open whether or not a
          session is running. Creating a session auto-assigns anyone whose stall
          preference matches a stall name, and pulls in everyone who registered as
          a group lead; the rest are assigned here.
        </p>

        {/* S73K: bulk actions on the whole pool. Only shown when there is a pool
            to act on -- an EXPORT that yields a header row and a DELETE ALL that
            deletes nothing are both noise on an empty table. */}
        {pool.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: "0.75rem",
            }}
          >
            {/* Plain <a>: must be a real navigation so the browser downloads the
                file. Not gated on isViewer -- this reads, and the read-only tier
                is meant to be able to read. */}
            <a
              href="/api/admin/bootstrap/volunteers/pool/export"
              download
              style={exportLinkStyle}
            >
              EXPORT POOL CSV
            </a>
            {/* S73K: sibling destination, not a replacement. If the Google
                integration is unconfigured or down it reports that and the CSV
                link above is unaffected. */}
            {!isViewer && (
              <GoogleSheetsExportButton endpoint="/api/admin/bootstrap/volunteers/pool/export/google" />
            )}
            {!isViewer && !wipeOpen && (
              <button
                type="button"
                className="admin-btn-danger-outline"
                onClick={() => {
                  setWipeError("");
                  setWipeOpen(true);
                }}
              >
                DELETE ALL
              </button>
            )}
          </div>
        )}

        {/* The confirmation. An inline danger zone rather than window.confirm,
            because the nudge to export first has to be a link the person can
            actually click without losing the dialog. Deliberately a nudge and
            not a gate -- skipping the export is their call. */}
        {wipeOpen && !isViewer && (
          <div className="admin-danger-zone" style={{ marginTop: 0, marginBottom: "1rem" }}>
            <p className="admin-danger-title">Delete all pre-registered volunteers</p>
            <p className="admin-danger-text">
              Delete all {pool.length} pre-registered{" "}
              {pool.length === 1 ? "volunteer" : "volunteers"}? This cannot be
              undone. They would each have to register again. Volunteers already
              assigned to a session are not affected. Export the list first if you
              might need their details or login codes.
            </p>
            {wipeError && (
              <p className="admin-danger-text" style={{ color: "var(--error)" }}>
                {wipeError}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <a
                href="/api/admin/bootstrap/volunteers/pool/export"
                download
                style={exportLinkStyle}
              >
                EXPORT FIRST
              </a>
              <button
                type="button"
                className="admin-btn-danger"
                disabled={wiping}
                onClick={() => void deleteAllPool()}
              >
                {wiping ? "DELETING..." : `DELETE ALL ${pool.length}`}
              </button>
              <button
                type="button"
                className="admin-row-action"
                disabled={wiping}
                onClick={() => setWipeOpen(false)}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username (SRN)</th>
                <th>Phone</th>
                <th>Prefers</th>
                <th>Login code</th>
                <th>Registered</th>
                {/* S66: the actions column is pinned right, and its cells carry
                    a left border. At 25+ pre-registrations the identity block
                    and the four action buttons need a visible seam, otherwise
                    the row reads as one undifferentiated line of mono text. */}
                <th style={{ textAlign: "right", borderLeft: "1px solid var(--border)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pool.length > 0 ? (
                pool.map((v) => (
                  <Fragment key={v.id}>
                    <tr>
                      <td className="admin-td-primary" style={{ whiteSpace: "nowrap", fontWeight: 500 }}>
                        {v.display_name}
                      </td>
                      <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{v.username}</td>
                      <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{v.phone ?? "-"}</td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {v.preferred_stall_name ?? "-"}
                      </td>
                      {/* S55C: plaintext by design, same as the active-session
                          tables -- these accounts only reach /bootstrap. */}
                      <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                        {v.login_code ?? "-"}
                      </td>
                      <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                        {shortDate(v.created_at)}
                      </td>
                      <td style={{ textAlign: "right", borderLeft: "1px solid var(--border)" }}>
                        {isViewer ? (
                          <span className="admin-cell-mono" style={{ color: "var(--text-muted)" }}>
                            -
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              justifyContent: "flex-end",
                              gap: "0.25rem",
                              flexWrap: "wrap",
                            }}
                          >
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
                            {/* S55: fix a typo in what the volunteer typed at
                                registration. Not a password reset. */}
                            <button
                              className="admin-row-action"
                              disabled={busyId === v.id}
                              onClick={() => startVolunteerEdit(v)}
                            >
                              {volEditId === v.id ? "CANCEL" : "EDIT"}
                            </button>
                            <button
                              className="admin-row-action"
                              disabled={busyId === v.id}
                              title="Issue a new login code"
                              onClick={() => resetCode(v)}
                            >
                              RESET CODE
                            </button>
                            <button
                              className="admin-row-action admin-row-action-danger"
                              disabled={busyId === v.id}
                              title="Remove this pre-registration entirely"
                              onClick={() => deleteVolunteer(v)}
                            >
                              DELETE
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>

                    {volEditId === v.id && !isViewer && (
                      <tr>
                        <td colSpan={7} style={{ background: "var(--bg-elevated)" }}>
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
                              <label htmlFor={`bs-vol-name-${v.id}`} className="admin-label">
                                Full name
                              </label>
                              <input
                                id={`bs-vol-name-${v.id}`}
                                type="text"
                                className="admin-input"
                                value={volName}
                                onChange={(e) => setVolName(e.target.value)}
                                maxLength={100}
                                style={{ width: "16rem" }}
                              />
                            </div>
                            <div>
                              <label htmlFor={`bs-vol-phone-${v.id}`} className="admin-label">
                                Phone (10 digits)
                              </label>
                              {/* S73I: see BootstrapAdminDashboard -- no form
                                  wraps this editor, so maxLength is the only
                                  client-side cap that can fire. */}
                              <input
                                id={`bs-vol-phone-${v.id}`}
                                type="tel"
                                className="admin-input"
                                value={volPhone}
                                onChange={(e) => setVolPhone(e.target.value)}
                                maxLength={10}
                                title="10 digits only -- no country code, no spaces"
                                placeholder="9876543210"
                                style={{ width: "10rem" }}
                              />
                            </div>
                            <div>
                              <label htmlFor={`bs-vol-srn-${v.id}`} className="admin-label">
                                SRN / PRN
                              </label>
                              <input
                                id={`bs-vol-srn-${v.id}`}
                                type="text"
                                className="admin-input"
                                value={volSrn}
                                onChange={(e) => setVolSrn(e.target.value)}
                                maxLength={40}
                                style={{ width: "12rem" }}
                              />
                            </div>
                            <button
                              className="btn-primary"
                              style={{ padding: "0.55rem 1.1rem", fontSize: "0.7rem", cursor: "pointer" }}
                              disabled={busyId === v.id || !volName.trim() || !volSrn.trim()}
                              onClick={() => saveVolunteer(v.id)}
                            >
                              {busyId === v.id ? "SAVING…" : "SAVE"}
                            </button>
                          </div>
                          {/* Changing the SRN changes the login username too --
                              say so, because the volunteer has to be told. */}
                          <p className="admin-hint" style={{ marginTop: "0.5rem" }}>
                            The SRN is also the login username. Changing it changes
                            how this volunteer signs in; the password is unchanged.
                          </p>
                          {volError && (
                            <p className="admin-error" style={{ marginTop: "0.5rem" }}>
                              {volError}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}

                    {assignId === v.id && !isViewer && (
                      <tr>
                        <td colSpan={7} style={{ background: "var(--bg-elevated)" }}>
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
                  <td className="admin-empty" colSpan={7}>
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
