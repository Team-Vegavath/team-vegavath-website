"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

import BootstrapMapSVG from "@/components/bootstrap/BootstrapMapSVG";
import StallCard, { BS, StallGrid, bootstrapBtnStyle } from "@/components/bootstrap/StallCard";
import SegmentedCount from "./SegmentedCount";
import type {
  BootstrapFeedbackSummary,
  BootstrapSession,
  BootstrapStall,
  BootstrapVolunteer,
} from "@/lib/services/bootstrap";

const POLL_MS = 4000;

export default function BootstrapAdminDashboard({
  session,
  initialStalls,
  initialVolunteers,
  isViewer = false,
}: {
  session: BootstrapSession;
  initialStalls: BootstrapStall[];
  initialVolunteers: BootstrapVolunteer[];
  /** Read-only admin tier: hides every write control (S47). */
  isViewer?: boolean;
}) {
  const router = useRouter();
  const [stalls, setStalls] = useState(initialStalls);
  const [volunteers, setVolunteers] = useState(initialVolunteers);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<BootstrapStall["status"]>("free");
  const [overrideClaimedBy, setOverrideClaimedBy] = useState("");
  const [busy, setBusy] = useState(false);
  // S33 pin-drop: which stall the next map click positions
  const [editingStall, setEditingStall] = useState<string | null>(null);
  // S49 stall add/remove: "add" while the new stall posts, else the stall id
  const [stallFormOpen, setStallFormOpen] = useState(false);
  const [newStallName, setNewStallName] = useState("");
  const [newStallOcc, setNewStallOcc] = useState(1);
  // S73B - how many GROUPS may be at the new stall at once (migration 027)
  const [newStallGroups, setNewStallGroups] = useState(1);
  const [stallBusy, setStallBusy] = useState<string | null>(null);
  const [stallError, setStallError] = useState("");
  // S73B - live capacity override, keyed by stall id while an edit is in flight
  const [capacityBusy, setCapacityBusy] = useState<string | null>(null);
  // S55 volunteer detail edit - name / phone / SRN, one row at a time
  const [volEditId, setVolEditId] = useState<string | null>(null);
  const [volName, setVolName] = useState("");
  const [volPhone, setVolPhone] = useState("");
  const [volSrn, setVolSrn] = useState("");
  const [volBusy, setVolBusy] = useState<string | null>(null);
  const [volError, setVolError] = useState("");
  const [feedback, setFeedback] = useState<BootstrapFeedbackSummary | null>(null);
  // S38: Gemini feedback summary modal
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryMeta, setSummaryMeta] = useState<{
    responseCount: number;
    avgOverall: string;
    avgJoin: string;
    feedbackRows: {
      overall: number | null;
      join: number | null;
      stall: string | null;
      text: string | null;
    }[];
  } | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  // S46: how long the Gemini round-trip took, shown in the modal footer
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const summarizeStartRef = useRef<number>(0);
  // window.location only exists client-side; set after mount to avoid a
  // hydration mismatch on the feedback URL line
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/bootstrap/sessions/${session.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setStalls(data.stalls);
      setVolunteers(data.volunteers);
    } catch {
      // next poll self-corrects
    }
  }, [session.id]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (intervalId === null) intervalId = setInterval(poll, POLL_MS);
    };
    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    start();
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        poll();
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  function expandStall(stall: BootstrapStall) {
    if (expandedId === stall.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(stall.id);
    setOverrideStatus(stall.status);
    setOverrideClaimedBy((stall.claimed_by ?? []).join(", "));
  }

  async function applyOverride(stallId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bootstrap/stalls/${stallId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: overrideStatus,
          claimed_by: overrideClaimedBy
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .join(","),
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as BootstrapStall;
        setStalls((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setExpandedId(null);
      }
    } finally {
      setBusy(false);
    }
  }

  // S33 pin-drop: click a stall's PLACE PIN, then click the map - optimistic
  // local update so the pin lands instantly; the 4s poll confirms
  async function handlePositionSet(stallId: string, x: number, y: number) {
    await fetch(`/api/admin/bootstrap/stalls/${stallId}/position`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ map_x: x, map_y: y }),
    }).catch(() => {});
    setStalls((prev) => prev.map((s) => (s.id === stallId ? { ...s, map_x: x, map_y: y } : s)));
    setEditingStall(null); // deselect after placing
  }

  async function handleClearPosition(stallId: string) {
    await fetch(`/api/admin/bootstrap/stalls/${stallId}/position`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ map_x: null, map_y: null }),
    }).catch(() => {});
    setStalls((prev) =>
      prev.map((s) => (s.id === stallId ? { ...s, map_x: null, map_y: null } : s))
    );
  }

  // S49: stalls are no longer frozen at session creation. Add one when a sponsor
  // turns up late; delete one that never happened (blocked while occupied).
  async function addStall() {
    const name = newStallName.trim();
    if (!name) return;
    setStallBusy("add");
    setStallError("");
    try {
      const res = await fetch(`/api/admin/bootstrap/sessions/${session.id}/stalls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stallName: name,
          maxOccupancy: newStallOcc,
          maxGroups: newStallGroups,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStallError(data?.error ?? "Failed to add stall");
        return;
      }
      setStalls((prev) => [...prev, data.stall as BootstrapStall]);
      setNewStallName("");
      setNewStallOcc(1);
      setNewStallGroups(1);
      setStallFormOpen(false);
    } finally {
      setStallBusy(null);
    }
  }

  /**
   * S73B (Section C): live per-stall group capacity, 1-10.
   *
   * The second of the two widgets that write this one column - the setup tiles
   * above offer 1/2/3 to match max_occupancy's control, this one goes wider
   * because a stall that turns out to absorb more groups than planned is exactly
   * the situation an admin needs to fix mid-event.
   *
   * Optimistic like handlePositionSet: the number lands instantly and the 4s poll
   * confirms. On rejection the poll puts the old value back within one cycle, and
   * the error line says why.
   */
  async function setMaxGroups(stallId: string, n: number) {
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      setStallError("Groups must be a whole number between 1 and 10");
      return;
    }
    setCapacityBusy(stallId);
    setStallError("");
    setStalls((prev) => prev.map((s) => (s.id === stallId ? { ...s, max_groups: n } : s)));
    try {
      const res = await fetch(`/api/admin/bootstrap/stalls/${stallId}/max-groups`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_groups: n }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStallError(data?.error ?? "Failed to set capacity");
        await poll(); // put the real value back
      }
    } finally {
      setCapacityBusy(null);
    }
  }

  async function removeStall(stall: BootstrapStall) {
    if (
      !window.confirm(
        `Delete stall "${stall.stall_name}"? Volunteers pointed at it lose their stall assignment.`
      )
    )
      return;
    setStallBusy(stall.id);
    setStallError("");
    try {
      const res = await fetch(
        `/api/admin/bootstrap/sessions/${session.id}/stalls?stallId=${encodeURIComponent(stall.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStallError(data?.error ?? "Failed to delete stall");
        return;
      }
      setStalls((prev) => prev.filter((s) => s.id !== stall.id));
      poll();
    } finally {
      setStallBusy(null);
    }
  }

  async function unlock(volunteerId: string) {
    await fetch(`/api/admin/bootstrap/volunteers/${volunteerId}/unlock`, {
      method: "PATCH",
    }).catch(() => {});
    poll();
  }

  // S55C: UNLOCK next door clears the session token; this replaces the code
  // itself. Confirmed because the old code dies the moment this fires.
  async function resetCode(v: BootstrapVolunteer) {
    if (
      !window.confirm(
        `Issue ${v.display_name} a new login code? Their current code stops working immediately.`
      )
    )
      return;
    setVolBusy(v.id);
    try {
      await fetch(`/api/admin/bootstrap/volunteers/${v.id}/reset-code`, {
        method: "POST",
      }).catch(() => {});
      // poll() re-reads the volunteers, so the new code lands in the table.
      await poll();
    } finally {
      setVolBusy(null);
    }
  }

  async function deactivate() {
    if (!window.confirm("Deactivate this session? Volunteers will be signed out of /bootstrap.")) return;
    const res = await fetch(`/api/admin/bootstrap/sessions/${session.id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: false }),
    });
    if (res.ok) router.refresh();
  }

  // S35: volunteers self-register with a role baked in - no admin role toggle.
  // Service order is display_name; group volunteers re-sort by group number
  // (unassigned last) so the table reads Group 1, 2, ... top to bottom.
  const stallVolunteers = volunteers.filter((v) => v.role === "stall");
  const groupVolunteers = volunteers
    .filter((v) => v.role === "lead")
    .sort((a, b) => (a.group_number ?? Infinity) - (b.group_number ?? Infinity));

  function startVolunteerEdit(v: BootstrapVolunteer) {
    setVolError("");
    if (volEditId === v.id) {
      setVolEditId(null);
      return;
    }
    setVolEditId(v.id);
    setVolName(v.display_name);
    setVolPhone(v.phone ?? "");
    setVolSrn(v.srn ?? v.username);
  }

  async function saveVolunteer(volunteerId: string) {
    setVolBusy(volunteerId);
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
      // poll() already re-reads stalls + volunteers into local state, so the
      // edited row swaps in without a second copy of the update logic.
      await poll();
    } finally {
      setVolBusy(null);
    }
  }

  async function suggest(volunteerId: string, stallId: string | null) {
    await fetch(`/api/admin/bootstrap/volunteers/${volunteerId}/suggest`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stall_id: stallId }),
    }).catch(() => {});
    poll();
  }

  // S72C (Section B4): resolve a volunteer's pending stall-switch request.
  // APPROVE routes through resolveStallSwitch, which calls the SAME
  // suggestStallToVolunteer the MOVE STALL dropdown above uses - one
  // implementation of "change someone's assigned stall", not two. It also takes
  // them off their old stall, since after the reassignment they can no longer do
  // that themselves (S72B's ownership gate).
  async function resolveSwitch(v: BootstrapVolunteer, action: "approve" | "deny") {
    const target = v.switch_requested_stall_name ?? "the requested stall";
    if (
      !window.confirm(
        action === "approve"
          ? `Move ${v.display_name} to ${target}? They are taken off their current stall, which goes FREE if nobody else is on it.`
          : `Deny ${v.display_name}'s request to move to ${target}?`
      )
    )
      return;
    setVolBusy(v.id);
    try {
      await fetch(`/api/admin/bootstrap/volunteers/${v.id}/switch-request`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }).catch(() => {});
      await poll();
    } finally {
      setVolBusy(null);
    }
  }

  // S55B: move a volunteer between the two tables mid-event. The /role route
  // and setVolunteerRole both predate this session; only the UI was missing.
  // Confirmed rather than one-click because it moves the row to another table
  // and swaps which dashboard the volunteer sees on their next /bootstrap load.
  async function changeRole(v: BootstrapVolunteer) {
    const next = v.role === "lead" ? "stall" : "lead";
    if (
      !window.confirm(
        next === "lead"
          ? `Make ${v.display_name} a group volunteer? They get the lead dashboard and a QR check-in code. Their stall assignment is kept in case you switch back.`
          : `Make ${v.display_name} a stall volunteer? They lose the lead dashboard. Any group they lead keeps its visitors and needs a new lead.`
      )
    )
      return;
    setVolBusy(v.id);
    try {
      await fetch(`/api/admin/bootstrap/volunteers/${v.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      }).catch(() => {});
      await poll();
    } finally {
      setVolBusy(null);
    }
  }

  // shared cells for the two volunteer tables (S35)
  const sectionTitleStyle: React.CSSProperties = {
    fontFamily: "var(--font-chakra), sans-serif",
    fontWeight: 700,
    fontSize: "0.85rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-primary)",
    margin: "0 0 0.75rem",
  };

  const statusBadge = (v: BootstrapVolunteer) => (
    // square badge - admin pages keep the main site's sharp corners
    <span
      style={{
        display: "inline-block",
        padding: "0.4rem 0.8rem",
        fontFamily: "var(--font-mono), monospace",
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        color: v.is_active ? "var(--success)" : "var(--text-muted)",
        background: v.is_active
          ? "color-mix(in srgb, var(--success) 12%, transparent)"
          : "color-mix(in srgb, var(--text-muted) 12%, transparent)",
      }}
    >
      {v.is_active ? "ACTIVE" : "LOGGED OUT"}
    </span>
  );

  const loginCode = (v: BootstrapVolunteer) => (
    // plaintext by design - these accounts only reach /bootstrap
    <code
      style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: "0.75rem",
        letterSpacing: "0.1em",
        color: "var(--text-primary)",
        background: "var(--bg-elevated)",
        padding: "2px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {v.login_code ?? "-"}
    </code>
  );

  // S55B: was inline in the Group Volunteers table only. Stall volunteers are
  // the ones who actually stand at a stall, so having no way to re-point them
  // was the gap -- lifted here verbatim and used by both tables.
  // value pinned to "" so the select re-arms after each pick.
  const stallSelect = (v: BootstrapVolunteer) =>
    isViewer ? null : (
      <select
        value=""
        disabled={volBusy === v.id}
        onChange={(e) => {
          if (e.target.value === "") return;
          suggest(v.id, e.target.value === "clear" ? null : e.target.value);
        }}
        style={{
          background: "var(--bg-base)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
          padding: "6px 8px",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "11px",
          minHeight: "36px",
          cursor: "pointer",
        }}
      >
        <option value="">{v.suggested_stall_name ? "MOVE STALL..." : "SUGGEST STALL..."}</option>
        <option value="clear">-- CLEAR --</option>
        {stalls.map((s) => (
          <option key={s.id} value={s.id}>
            {s.stall_name}
          </option>
        ))}
      </select>
    );

  // S72C (Section B4): a pending switch request lives on the volunteer's own row
  // rather than in a separate list - the row already carries their name, their
  // current stall and a MOVE STALL control, which is everything the decision
  // needs, and it is a two-line insertion instead of a new table. Rendered in both
  // volunteer tables: a stall volunteer flipped TO GROUP keeps any pending
  // request, and an invisible request nobody can deny is worse than a stray row.
  //
  // Gated on the ID, never switch_requested_at - migration 025's FK nulls the id
  // alone, so the timestamp outlives a request whose target stall was deleted.
  const switchRequestCell = (v: BootstrapVolunteer) =>
    v.switch_requested_stall_id ? (
      <>
        <span
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            color: "var(--accent)",
            letterSpacing: "0.05em",
            whiteSpace: "nowrap",
          }}
        >
          {"WANTS: "}
          {v.switch_requested_stall_name ?? "?"}
        </span>
        {isViewer ? null : (
          <>
            <button
              className="admin-row-action"
              disabled={volBusy === v.id}
              title={`Approve the move to ${v.switch_requested_stall_name ?? "the requested stall"}`}
              onClick={() => resolveSwitch(v, "approve")}
            >
              APPROVE
            </button>
            <button
              className="admin-row-action admin-row-action-danger"
              disabled={volBusy === v.id}
              title="Drop the request; nothing is reassigned"
              onClick={() => resolveSwitch(v, "deny")}
            >
              DENY
            </button>
          </>
        )}
      </>
    ) : null;

  const roleButton = (v: BootstrapVolunteer) =>
    isViewer ? null : (
      <button
        className="admin-row-action"
        disabled={volBusy === v.id}
        title={
          v.role === "lead"
            ? "Move to the Stall Volunteers table"
            : "Move to the Group Volunteers table"
        }
        onClick={() => changeRole(v)}
      >
        {v.role === "lead" ? "TO STALL" : "TO GROUP"}
      </button>
    );

  const unlockButton = (v: BootstrapVolunteer) =>
    v.is_active && !isViewer ? (
      <button
        className="btn-outline"
        style={{ minHeight: "44px", padding: "0.5rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
        onClick={() => unlock(v.id)}
      >
        UNLOCK
      </button>
    ) : null;

  // S55: same volunteer detail edit the pre-registration pool got, for
  // volunteers already assigned to this session. Two tables render it, so it
  // lives with the other shared cells rather than being written twice.
  const editButton = (v: BootstrapVolunteer) =>
    isViewer ? null : (
      <button
        className="admin-row-action"
        disabled={volBusy === v.id}
        onClick={() => startVolunteerEdit(v)}
      >
        {volEditId === v.id ? "CANCEL" : "EDIT"}
      </button>
    );

  // S55C: both tables render it, so it sits with the other shared cells.
  const resetCodeButton = (v: BootstrapVolunteer) =>
    isViewer ? null : (
      <button
        className="admin-row-action"
        disabled={volBusy === v.id}
        title="Issue a new login code"
        onClick={() => resetCode(v)}
      >
        RESET CODE
      </button>
    );

  const volunteerEditRow = (v: BootstrapVolunteer, colSpan: number) =>
    volEditId === v.id && !isViewer ? (
      <tr>
        <td colSpan={colSpan} style={{ background: "var(--bg-elevated)" }}>
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
                Phone
              </label>
              <input
                id={`bs-vol-phone-${v.id}`}
                type="tel"
                className="admin-input"
                value={volPhone}
                onChange={(e) => setVolPhone(e.target.value)}
                maxLength={20}
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
              disabled={volBusy === v.id || !volName.trim() || !volSrn.trim()}
              onClick={() => saveVolunteer(v.id)}
            >
              {volBusy === v.id ? "SAVING…" : "SAVE"}
            </button>
          </div>
          <p className="admin-hint" style={{ marginTop: "0.5rem" }}>
            The SRN is also the login username. Changing it changes how this
            volunteer signs in; the login code is unchanged.
          </p>
          {volError && (
            <p className="admin-error" style={{ marginTop: "0.5rem" }}>
              {volError}
            </p>
          )}
        </td>
      </tr>
    ) : null;

  const loadFeedback = useCallback(async () => {
    const res = await fetch(`/api/admin/bootstrap/sessions/${session.id}/feedback`).catch(
      () => null
    );
    if (res?.ok) setFeedback(await res.json());
  }, [session.id]);

  // feedback is low-churn - load once, refresh on demand (not on the 4s poll)
  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  // S38: on-demand Gemini summary of all feedback for this session
  async function handleSummarizeFeedback() {
    setSummarizing(true);
    setSummaryError(null);
    setSummaryOpen(true);
    setSummary(null);
    setElapsedMs(null);
    summarizeStartRef.current = Date.now();
    try {
      const res = await fetch(
        `/api/admin/bootstrap/sessions/${session.id}/summarize`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Summary failed");
      setSummary(data.summary);
      setSummaryMeta({
        responseCount: data.responseCount,
        avgOverall: data.avgOverall,
        avgJoin: data.avgJoin,
        feedbackRows: data.feedbackRows ?? [],
      });
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Failed");
    } finally {
      setElapsedMs(Date.now() - summarizeStartRef.current);
      setSummarizing(false);
    }
  }

  // Groups stuck in the queue past 15 min - derived from polled data, no extra API.
  //
  // S73B: flattened from one-alert-per-stall to one-per-waiting-GROUP, because a
  // stall can now have several groups queued and the old shape could only ever
  // surface the single queued_by name. The status check is gone with it: a stall
  // that went FREE while groups are still queued is the MOST urgent case (nobody
  // is being served and nobody has moved), and gating on status === "queued"
  // would have hidden exactly that.
  const longWaiters = stalls.flatMap((s) =>
    (s.queue ?? [])
      .filter((e) => Date.now() - new Date(e.queued_at).getTime() > 15 * 60 * 1000)
      .map((e) => ({ stall: s, entry: e }))
  );

  const counts = {
    free: stalls.filter((s) => s.status === "free").length,
    occupied: stalls.filter((s) => s.status === "occupied").length,
    queued: stalls.filter((s) => s.status === "queued").length,
    active: volunteers.filter((v) => v.is_active).length,
  };

  // stat numbers use the Bootstrap status palette so they match the stall badges
  const stats: [string, number, string][] = [
    ["Free", counts.free, BS.free],
    ["Occupied", counts.occupied, BS.occupied],
    ["Queued", counts.queued, BS.queued],
    ["Active volunteers", counts.active, "var(--text-primary)"],
  ];

  return (
    <>
      <header className="admin-page-header">
        <h1 className="admin-page-title">{session.name}</h1>
        {!isViewer ? (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              className="admin-btn-danger-outline"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
              onClick={deactivate}
            >
              DEACTIVATE SESSION
            </button>
          </div>
        ) : null}
      </header>

      {/* S33: check-in URLs are per group lead (on their own dashboards);
          only the shared feedback URL lives in admin */}
      <div
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "0.75rem",
          color: "var(--text-secondary)",
          marginBottom: "1.5rem",
          wordBreak: "break-all",
        }}
      >
        FEEDBACK URL: {origin ? `${origin}/bootstrap/feedback` : "/bootstrap/feedback"}
      </div>

      {/* Long-wait alerts - refresh with the 4s poll */}
      {longWaiters.map(({ stall: s, entry }) => {
        const mins = Math.floor((Date.now() - new Date(entry.queued_at).getTime()) / 60000);
        return (
          <div
            key={`${s.id}:${entry.group_id}`}
            style={{
              background: "color-mix(in srgb, var(--warning) 10%, transparent)",
              border: "1px solid var(--warning)",
              padding: "10px 14px",
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "12px",
                color: "var(--warning)",
                letterSpacing: "0.06em",
              }}
            >
              {entry.group_name} waiting at {s.stall_name} for {mins} min
              {s.status === "free" ? " -- STALL IS FREE" : ""}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              Consider redirecting or assigning another stall
            </span>
          </div>
        );
      })}

      {/* Stats bar */}
      <div style={{ display: "flex", gap: "2.5rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
        {stats.map(([label, value, color]) => (
          <div key={label}>
            <div
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "1.75rem",
                lineHeight: 1.1,
                color,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginTop: "0.25rem",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      <StallGrid>
        {stalls.map((stall) => (
          <StallCard
            key={stall.id}
            stall={stall}
            expanded={expandedId === stall.id}
            onToggle={() => expandStall(stall)}
            actions={
              isViewer ? null : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <select
                  className="admin-input"
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as BootstrapStall["status"])}
                  style={{ fontSize: "0.75rem" }}
                >
                  <option value="free">free</option>
                  <option value="occupied">occupied</option>
                  <option value="queued">queued</option>
                </select>
                <input
                  type="text"
                  className="admin-input"
                  value={overrideClaimedBy}
                  onChange={(e) => setOverrideClaimedBy(e.target.value)}
                  placeholder="claimed by (vol-1, vol-2)"
                  style={{ fontSize: "0.75rem" }}
                />
                <button
                  style={{ ...bootstrapBtnStyle, borderColor: "var(--accent)" }}
                  disabled={busy}
                  onClick={() => applyOverride(stall.id)}
                >
                  {busy ? "Applying…" : "Apply override"}
                </button>
              </div>
              )
            }
          />
        ))}
      </StallGrid>

      {/* S49: add / remove stalls mid-session. Occupied stalls cannot be deleted -
          the volunteer standing there would silently lose their claim. */}
      {!isViewer && (
        <section style={{ marginTop: "2.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "0.75rem",
            }}
          >
            <h2 style={{ ...sectionTitleStyle, margin: 0 }}>Manage Stalls</h2>
            <button
              className="btn-outline"
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.7rem", cursor: "pointer" }}
              onClick={() => {
                setStallError("");
                setStallFormOpen(!stallFormOpen);
              }}
            >
              {stallFormOpen ? "CANCEL" : "ADD STALL"}
            </button>
          </div>

          {stallFormOpen && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                flexWrap: "wrap",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                padding: "0.9rem 1rem",
                marginBottom: "1rem",
              }}
            >
              <input
                type="text"
                className="admin-input"
                value={newStallName}
                onChange={(e) => setNewStallName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addStall();
                  }
                }}
                placeholder="Stall name"
                maxLength={60}
                aria-label="New stall name"
                style={{ flex: "1 1 12rem", fontSize: "0.8rem" }}
              />
              {/* volunteers behind the stall / groups at it -- same control,
                  two columns. Raising groups past 3 is the stall table's live
                  override, not this form. */}
              <SegmentedCount
                value={newStallOcc}
                onChange={setNewStallOcc}
                label="Max volunteers"
              />
              <SegmentedCount
                value={newStallGroups}
                onChange={setNewStallGroups}
                label="Max groups"
              />
              <button
                className="btn-primary"
                style={{ padding: "0.5rem 1.1rem", fontSize: "0.7rem", cursor: "pointer" }}
                disabled={stallBusy === "add" || !newStallName.trim()}
                onClick={addStall}
              >
                {stallBusy === "add" ? "ADDING…" : "ADD"}
              </button>
            </div>
          )}

          {stallError && (
            <p className="admin-error" style={{ marginBottom: "0.75rem" }}>
              {stallError}
            </p>
          )}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stall</th>
                  <th>Max</th>
                  <th>Groups</th>
                  <th>Claimed by</th>
                  <th>Waiting</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stalls.length > 0 ? (
                  stalls.map((s) => {
                    const claimed = s.claimed_by ?? [];
                    return (
                      <tr key={s.id}>
                        <td className="admin-cell-mono">{s.stall_number}</td>
                        <td className="admin-td-primary" style={{ fontWeight: 500 }}>
                          {s.stall_name}
                        </td>
                        <td className="admin-cell-mono">{s.max_occupancy}</td>
                        {/* S73B: the live capacity override. Editable for admins,
                            read-only text for viewers, sitting next to the
                            read-only max_occupancy cell it mirrors. */}
                        <td className="admin-cell-mono">
                          {isViewer ? (
                            s.max_groups
                          ) : (
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={s.max_groups}
                              disabled={capacityBusy === s.id}
                              aria-label={`Max groups at ${s.stall_name}`}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                if (Number.isInteger(n) && n >= 1 && n <= 10) {
                                  void setMaxGroups(s.id, n);
                                }
                              }}
                              style={{
                                width: "3.5rem",
                                padding: "0.25rem 0.4rem",
                                fontFamily: "var(--font-mono), monospace",
                                fontSize: "0.8rem",
                                background: "transparent",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border)",
                              }}
                            />
                          )}
                        </td>
                        <td className="admin-cell-mono">
                          {claimed.length > 0 ? claimed.join(", ") : "-"}
                        </td>
                        {/* S73B: the queue that replaced queued_by. A stall can
                            hold several waiting groups now, so this is a list. */}
                        <td className="admin-cell-mono">
                          {(s.queue ?? []).length > 0
                            ? (s.queue ?? []).map((e) => e.group_name).join(", ")
                            : "-"}
                        </td>
                        <td>
                          <button
                            className="admin-row-action admin-row-action-danger"
                            disabled={stallBusy === s.id || claimed.length > 0}
                            title={
                              claimed.length > 0
                                ? "Stall is occupied - free it before deleting"
                                : "Delete this stall"
                            }
                            onClick={() => removeStall(s)}
                          >
                            {stallBusy === s.id ? "WORKING…" : "DELETE"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="admin-empty" colSpan={7}>
                      No stalls in this session yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* S35: self-registered accounts, split by role. Login codes are shown
          in plaintext on purpose - these accounts only reach /bootstrap. */}
      <section style={{ marginTop: "2.5rem" }}>
        <h2 style={sectionTitleStyle}>
          Stall Volunteers
        </h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Stall</th>
                <th>Phone</th>
                <th>Login code</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stallVolunteers.length > 0 ? (
                stallVolunteers.map((v) => (
                  <Fragment key={v.id}>
                    <tr>
                      <td className="admin-td-primary">{v.display_name}</td>
                      <td className="admin-cell-mono">{v.username}</td>
                      <td>{v.suggested_stall_name ?? "-"}</td>
                      <td className="admin-cell-mono">{v.phone ?? "-"}</td>
                      <td>{loginCode(v)}</td>
                      <td>{statusBadge(v)}</td>
                      <td>
                        <div
                          style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}
                        >
                          {switchRequestCell(v)}
                          {stallSelect(v)}
                          {unlockButton(v)}
                          {editButton(v)}
                          {resetCodeButton(v)}
                          {roleButton(v)}
                        </div>
                      </td>
                    </tr>
                    {volunteerEditRow(v, 7)}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td className="admin-empty" colSpan={7}>
                    No stall volunteers yet. Share /bootstrap/register/stall with the team.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <h2 style={sectionTitleStyle}>
          Group Volunteers
        </h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Group</th>
                <th>Phone</th>
                <th>Login code</th>
                <th>Status</th>
                <th>Classroom</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupVolunteers.length > 0 ? (
                groupVolunteers.map((v) => (
                  <Fragment key={v.id}>
                  <tr>
                    <td className="admin-td-primary">{v.display_name}</td>
                    <td className="admin-cell-mono">{v.username}</td>
                    <td className="admin-cell-mono">
                      {v.group_number ? `Group ${v.group_number}` : "Not assigned"}
                    </td>
                    <td className="admin-cell-mono">{v.phone ?? "-"}</td>
                    <td>{loginCode(v)}</td>
                    <td>{statusBadge(v)}</td>
                    <td>
                      {v.in_classroom ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.4rem 0.8rem",
                            fontFamily: "var(--font-mono), monospace",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            color: "var(--accent)",
                            background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                          }}
                        >
                          IN CLASS
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        {v.suggested_stall_name && (
                          <span
                            style={{
                              fontFamily: "var(--font-mono), monospace",
                              fontSize: "11px",
                              color: "var(--accent)",
                              letterSpacing: "0.05em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {"-> "}
                            {v.suggested_stall_name}
                          </span>
                        )}
                        {switchRequestCell(v)}
                        {stallSelect(v)}
                        {unlockButton(v)}
                        {editButton(v)}
                        {resetCodeButton(v)}
                        {roleButton(v)}
                      </div>
                    </td>
                  </tr>
                  {volunteerEditRow(v, 8)}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td className="admin-empty" colSpan={8}>
                    No group volunteers yet. Share /bootstrap/register/group with the team.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Feedback summary (S32) - refresh on demand, not on the 4s poll */}
      <section style={{ marginTop: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
          <h2
            style={{
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 700,
              fontSize: "0.85rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Feedback
          </h2>
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
            }}
          >
            {feedback ? `${feedback.total} RESPONSES` : "…"}
          </span>
          <button
            className="btn-outline"
            style={{ padding: "0.4rem 1rem", fontSize: "0.68rem", cursor: "pointer" }}
            onClick={loadFeedback}
          >
            REFRESH
          </button>
          {/* Summarising spends paid Gemini quota, so it is gated with the
              write controls even though it stores nothing. */}
          {isViewer ? null : (
          <button
            onClick={handleSummarizeFeedback}
            disabled={summarizing || !feedback || feedback.total === 0}
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.68rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.4rem 1rem",
              background: "transparent",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
              cursor: summarizing || !feedback?.total ? "default" : "pointer",
              opacity: feedback?.total ? 1 : 0.4,
            }}
          >
            {summarizing ? "SUMMARISING..." : "SUMMARISE FEEDBACK"}
          </button>
          )}
        </div>

        {feedback && feedback.total > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            {[
              {
                label: "Avg overall",
                value: feedback.avgOverall != null ? `${feedback.avgOverall.toFixed(2)} / 10` : "-",
              },
              {
                label: "Avg join likelihood",
                value:
                  feedback.avgJoinLikelihood != null
                    ? `${feedback.avgJoinLikelihood.toFixed(2)} / 5`
                    : "-",
              },
              { label: "Responses", value: String(feedback.total) },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  border: "1px solid var(--border)",
                  padding: "10px 16px",
                  minWidth: "9rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "0.62rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-chakra), sans-serif",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    color: "var(--text-primary)",
                    marginTop: "2px",
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {feedback && feedback.perStall.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Stall</th>
                  <th>Avg rating</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {feedback.perStall.map((row) => (
                  <tr key={row.stall_name}>
                    <td className="admin-td-primary">{row.stall_name}</td>
                    <td className="admin-cell-mono">{row.avg_rating.toFixed(2)} / 5</td>
                    <td className="admin-cell-mono">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {feedback && feedback.recentComments.length > 0 && (
          <details style={{ marginTop: "1rem" }}>
            <summary
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                cursor: "pointer",
                marginBottom: "0.5rem",
              }}
            >
              Recent suggestions ({Math.min(feedback.recentComments.length, 5)})
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {feedback.recentComments.slice(0, 5).map((c, i) => (
              <div
                key={`${c.submitted_at}-${i}`}
                style={{
                  border: "1px solid var(--border)",
                  padding: "10px 14px",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "0.68rem",
                    color: "var(--text-muted)",
                    marginRight: "0.6rem",
                  }}
                >
                  {c.rating != null ? `${c.rating}/5` : "-"}
                  {c.stall_name ? ` · ${c.stall_name}` : ""}
                </span>
                {c.comment}
              </div>
              ))}
            </div>
          </details>
        )}

        {feedback && feedback.total === 0 && (
          <p
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
            }}
          >
            No feedback yet. Visitors submit at /bootstrap/feedback.
          </p>
        )}
      </section>

      {/* Map setup - native <details> for the collapsible, no toggle state */}
      {session.is_active && (
        <details style={{ marginTop: "2.5rem" }}>
          <summary
            style={{
              fontFamily: "var(--font-chakra), sans-serif",
              fontWeight: 700,
              fontSize: "0.85rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            Stall positions on map
          </summary>
          <div
            style={{
              marginTop: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              maxWidth: "40rem",
            }}
          >
            {/* S33 pin-drop: pick a stall below, then click the map to place
                its pin - no more typing X/Y percentages by trial and error */}
            {/* S72C (Section C): was a hard-coded height: 300px against an
                aspect-ratio-locked child. On a narrow panel the map came out
                shorter than 300px (gap below it); on a wide one it came out taller
                and overflow: hidden silently clipped the bottom of the map. The
                SVG's own viewBox is 1024 x 419, so matching that ratio makes the
                wrapper exactly as tall as its content at every width. */}
            <div style={{ position: "relative", aspectRatio: "1024 / 419", overflow: "hidden" }}>
              <BootstrapMapSVG
                stalls={stalls}
                onClose={() => {}}
                inline
                editingStallId={isViewer ? null : editingStall}
                onPositionSet={isViewer ? undefined : handlePositionSet}
              />
            </div>
            <div>
              {stalls.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {isViewer ? null : (
                  <button
                    onClick={() => setEditingStall(editingStall === s.id ? null : s.id)}
                    aria-pressed={editingStall === s.id}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      letterSpacing: "0.1em",
                      padding: "4px 12px",
                      background: editingStall === s.id ? "var(--accent)" : "var(--bg-base)",
                      color: editingStall === s.id ? "var(--bg-base)" : "var(--text-muted)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {editingStall === s.id ? "PLACING..." : "PLACE PIN"}
                  </button>
                  )}
                  <span
                    style={{
                      fontFamily: "var(--font-chakra)",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {s.stall_name}
                  </span>
                  {s.map_x != null && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      ({s.map_x}%, {s.map_y}%)
                    </span>
                  )}
                  {s.map_x != null && !isViewer && (
                    <button
                      onClick={() => handleClearPosition(s.id)}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.65rem",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* S38: Gemini feedback summary modal */}
      {summaryOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSummaryOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              background: "rgba(0,0,0,0.75)",
              cursor: "pointer",
            }}
          />
          {/* Panel */}
          <div
            style={{
              position: "fixed",
              zIndex: 51,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(680px, 90vw)",
              maxHeight: "80vh",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-strong)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-chakra), sans-serif",
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    letterSpacing: "0.06em",
                    margin: 0,
                  }}
                >
                  FEEDBACK SUMMARY
                </h2>
                {summaryMeta && (
                  <p
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {summaryMeta.responseCount} RESPONSES · AVG{" "}
                    {summaryMeta.avgOverall}/10 OVERALL · AVG {summaryMeta.avgJoin}/5 JOIN
                    LIKELIHOOD
                  </p>
                )}
              </div>
              <button
                onClick={() => setSummaryOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "22px",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
              {summarizing && (
                <p
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                    textAlign: "center",
                    padding: "2rem 0",
                  }}
                >
                  GENERATING SUMMARY...
                </p>
              )}
              {summaryError && (
                <p
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "0.8rem",
                    color: "var(--error)",
                  }}
                >
                  {summaryError}
                </p>
              )}
              {summary && (
                <div
                  style={{
                    fontFamily: "var(--font-space), sans-serif",
                    fontSize: "0.9rem",
                    lineHeight: 1.7,
                    color: "var(--text-secondary)",
                  }}
                >
                  {/* S46: react-markdown replaces the old **bold**-only span
                      renderer, which left ### headings and lists as raw text */}
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p style={{ marginBottom: "0.75rem" }}>{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 600,
                          }}
                        >
                          {children}
                        </strong>
                      ),
                      h3: ({ children }) => (
                        <h3
                          style={{
                            fontFamily: "var(--font-chakra), sans-serif",
                            fontSize: "0.85rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "var(--accent)",
                            marginTop: "1.25rem",
                            marginBottom: "0.4rem",
                          }}
                        >
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4
                          style={{
                            fontFamily: "var(--font-chakra), sans-serif",
                            fontSize: "0.8rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: "var(--text-secondary)",
                            marginTop: "1rem",
                            marginBottom: "0.35rem",
                          }}
                        >
                          {children}
                        </h4>
                      ),
                      ol: ({ children }) => (
                        <ol
                          style={{
                            paddingLeft: "1.25rem",
                            marginBottom: "0.75rem",
                            listStyle: "decimal",
                          }}
                        >
                          {children}
                        </ol>
                      ),
                      ul: ({ children }) => (
                        <ul
                          style={{
                            paddingLeft: "1.25rem",
                            marginBottom: "0.75rem",
                            listStyle: "square",
                          }}
                        >
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li style={{ marginBottom: "0.35rem" }}>{children}</li>
                      ),
                    }}
                  >
                    {summary}
                  </ReactMarkdown>
                </div>
              )}

              {/* S46: the rows Gemini worked from, so typos and junk
                  submissions stay visible after summarization */}
              {summary && summaryMeta?.feedbackRows?.length ? (
                <details style={{ marginTop: "1.25rem" }}>
                  <summary
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    Raw responses ({summaryMeta.feedbackRows.length})
                  </summary>
                  <div style={{ marginTop: "0.75rem", overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.78rem",
                        fontFamily: "var(--font-space), sans-serif",
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-strong)" }}>
                          {["Overall", "Join", "Stall", "Feedback"].map((h) => (
                            <th
                              key={h}
                              style={{
                                textAlign: "left",
                                padding: "0.4rem 0.5rem",
                                fontFamily: "var(--font-mono), monospace",
                                fontSize: "0.65rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                color: "var(--text-muted)",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {summaryMeta.feedbackRows.map((row, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom: "1px solid var(--border)",
                              verticalAlign: "top",
                            }}
                          >
                            <td style={{ padding: "0.4rem 0.5rem", whiteSpace: "nowrap" }}>
                              {row.overall ?? "--"}/10
                            </td>
                            <td style={{ padding: "0.4rem 0.5rem", whiteSpace: "nowrap" }}>
                              {row.join ?? "--"}/5
                            </td>
                            <td
                              style={{
                                padding: "0.4rem 0.5rem",
                                maxWidth: "120px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.stall ?? "--"}
                            </td>
                            <td
                              style={{
                                padding: "0.4rem 0.5rem",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {row.text ?? (
                                <span style={{ color: "var(--text-muted)" }}>--</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ) : null}
            </div>

            {/* Footer -- also shown on failure so a slow call's timing is visible */}
            {(summary || elapsedMs !== null) && (
              <div
                style={{
                  padding: "0.75rem 1.5rem",
                  borderTop: "1px solid var(--border)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                {elapsedMs !== null && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "0.65rem",
                      color: "var(--text-muted)",
                      marginRight: "auto",
                    }}
                  >
                    {(elapsedMs / 1000).toFixed(1)}s
                  </span>
                )}
                {summary && (
                  <p
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "0.65rem",
                      color: "var(--text-muted)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    AI Generated · BASED ON{" "}
                    {summaryMeta?.responseCount} STUDENT RESPONSES
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
