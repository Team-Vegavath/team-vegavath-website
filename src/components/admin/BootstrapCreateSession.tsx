"use client";

import { useEffect, useState } from "react";

import type { BootstrapSession } from "@/lib/services/bootstrap";
import SegmentedCount from "./SegmentedCount";

interface StallDraft {
  stall_name: string;
  max_occupancy: number;
  max_groups: number; // S73B - how many groups may be at the stall at once
  lead_names: string[]; // informational - shown on stall cards, no accounts (S35)
}

// S35: two steps only. Volunteers self-register at /bootstrap/register/*, so
// there is no credential step and no CSV - the success screen hands the admin
// the two registration links to share instead.
export default function BootstrapCreateSession({
  onDone,
  sessions = [],
}: {
  onDone: () => void;
  /** S49: past sessions, so step 2 can import their stall list as a starting point. */
  sessions?: BootstrapSession[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [maxGroupSize, setMaxGroupSize] = useState("20");
  const [groupCount, setGroupCount] = useState("4");
  const [stalls, setStalls] = useState<StallDraft[]>([]);
  const [stallName, setStallName] = useState("");
  const [stallOcc, setStallOcc] = useState(1);
  const [stallGroups, setStallGroups] = useState(1);
  const [stallLeadsText, setStallLeadsText] = useState("");
  const [stallError, setStallError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  // S49: how many pool members the server auto-matched to these stalls
  const [autoAssigned, setAutoAssigned] = useState(0);
  // S49 stall import from a previous session
  const [importId, setImportId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  // only sessions that actually have stalls are worth importing from
  const importable = sessions.filter((s) => (s.stall_count ?? 0) > 0);

  // Reuses the admin session GET (stalls + volunteers + groups) rather than
  // adding a route just for stall names. The drafts are fully editable after
  // import - nothing is written until CREATE SESSION.
  async function importStalls(sessionId: string) {
    setImportId(sessionId);
    setImportError("");
    if (!sessionId) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/admin/bootstrap/sessions/${sessionId}`);
      if (!res.ok) {
        setImportError("Could not load that session's stalls.");
        return;
      }
      const data = await res.json();
      const imported: StallDraft[] = (data.stalls ?? []).map(
        (s: {
          stall_name: string;
          max_occupancy: number;
          max_groups?: number;
          lead_names: string | null;
        }) => ({
          stall_name: s.stall_name,
          // occupancy is constrained to 1-3 in this form; clamp legacy values
          max_occupancy: Math.min(3, Math.max(1, Number(s.max_occupancy) || 1)),
          // S73B: same clamp. An imported stall whose capacity was raised past 3
          // by the live override comes back as 3 here, because this form cannot
          // represent more - the admin re-raises it after creation. Clamping
          // rather than dropping keeps the intent ("more than one group").
          max_groups: Math.min(3, Math.max(1, Number(s.max_groups) || 1)),
          lead_names: s.lead_names
            ? s.lead_names.split(",").map((n) => n.trim()).filter(Boolean).slice(0, 3)
            : [],
        })
      );
      if (imported.length === 0) {
        setImportError("That session has no stalls.");
        return;
      }
      setStalls(imported);
    } catch {
      setImportError("Could not load that session's stalls.");
    } finally {
      setImporting(false);
    }
  }

  // window.location only exists client-side; set after mount so the links
  // render without a hydration mismatch
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  function addStall() {
    if (!stallName.trim()) return;
    const leadNames = stallLeadsText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (leadNames.length > 3) {
      setStallError("Max 3 lead names per stall.");
      return;
    }
    setStallError("");
    setStalls([
      ...stalls,
      {
        stall_name: stallName.trim(),
        max_occupancy: stallOcc,
        max_groups: stallGroups,
        lead_names: leadNames,
      },
    ]);
    setStallName("");
    setStallOcc(1);
    setStallGroups(1);
    setStallLeadsText("");
  }

  function moveStall(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= stalls.length) return;
    const next = [...stalls];
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    setStalls(next);
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/bootstrap/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          stalls,
          group_count: Number(groupCount) || 4,
          max_group_size: Number(maxGroupSize) || 20,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to create session");
        return;
      }
      setAutoAssigned(Number(data?.autoAssigned) || 0);
      setCreated(true);
    } catch {
      setError("Request failed ∙ check your connection");
    } finally {
      setBusy(false);
    }
  }

  const monoLabel: React.CSSProperties = {
    fontFamily: "var(--font-mono), monospace",
    fontSize: "0.7rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
  };

  if (created) {
    const linkBox = (label: string, path: string) => (
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{ ...monoLabel, marginBottom: "0.5rem" }}>{label}</p>
        <code
          style={{
            display: "block",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            padding: "0.75rem 1rem",
            wordBreak: "break-all",
            userSelect: "all",
          }}
        >
          {origin ? `${origin}${path}` : path}
        </code>
      </div>
    );

    return (
      <div style={{ maxWidth: "42rem" }}>
        <header className="admin-page-header">
          <h1 className="admin-page-title">Session created</h1>
        </header>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          Share these registration links with your team. Volunteers register
          themselves and get a username (their SRN) plus a login code ∙ both
          visible in the dashboard tables, so nothing to download or lose.
        </p>

        {/* S49: pool members whose typed stall preference matched a stall name
            were pulled into this session automatically (migration 021). */}
        {autoAssigned > 0 && (
          <p
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.75rem",
              color: "var(--success)",
              lineHeight: 1.7,
              marginBottom: "1.5rem",
            }}
          >
            {autoAssigned} pre-registered volunteer
            {autoAssigned === 1 ? "" : "s"} auto-assigned from the pool. The rest
            stay in PRE-REGISTERED VOLUNTEERS for manual assignment.
          </p>
        )}

        {linkBox("Stall volunteers", "/bootstrap/register/stall")}
        {linkBox("Group volunteers", "/bootstrap/register/group")}

        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            lineHeight: 1.8,
            marginBottom: "1.5rem",
          }}
        >
          Registration opens once you ACTIVATE the session. Group numbers are
          handed out first-come-first-served as group volunteers register.
        </p>

        <button
          className="btn-primary"
          style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
          onClick={onDone}
        >
          DONE
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "34rem" }}>
      <header className="admin-page-header">
        <h1 className="admin-page-title">New Session</h1>
      </header>

      {/* Step indicator ∙ same pattern as JoinClient */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <p style={monoLabel}>Step {step} of 2</p>
        <div style={{ display: "flex", gap: "6px" }}>
          {([1, 2] as const).map((s) => (
            <div
              key={s}
              style={{
                width: "18px",
                height: "4px",
                background:
                  s === step ? "var(--accent)" : s < step ? "var(--border-strong)" : "var(--border)",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div>
          <label htmlFor="bs-session-name" className="admin-label">
            Session name
          </label>
          <input
            id="bs-session-name"
            type="text"
            className="admin-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bootstrap Day 1"
            maxLength={100}
          />

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <div>
              <label htmlFor="bs-group-count" className="admin-label">
                Visitor groups
              </label>
              <input
                id="bs-group-count"
                type="number"
                className="admin-input"
                min={1}
                max={26}
                value={groupCount}
                onChange={(e) => setGroupCount(e.target.value)}
                style={{ width: "8rem" }}
              />
            </div>
            <div>
              <label htmlFor="bs-max-group" className="admin-label">
                Max visitors per group
              </label>
              <input
                id="bs-max-group"
                type="number"
                className="admin-input"
                min={1}
                max={100}
                value={maxGroupSize}
                onChange={(e) => setMaxGroupSize(e.target.value)}
                style={{ width: "8rem" }}
              />
            </div>
          </div>
          <p className="admin-hint" style={{ marginTop: "0.5rem" }}>
            Group volunteers are spread over the groups first-come-first-served
            when they register. Check-in closes for a group at the size cap.
          </p>

          <div style={{ marginTop: "1.5rem" }}>
            <button
              className="btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
              disabled={
                !name.trim() || Number(groupCount) < 1 || Number(groupCount) > 26
              }
              onClick={() => setStep(2)}
            >
              NEXT
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          {/* S49: most Bootstrap days reuse last year's stall list - import it and
              edit from there instead of retyping every stall. */}
          {importable.length > 0 && (
            <div style={{ marginBottom: "1.75rem" }}>
              <label htmlFor="bs-import-session" className="admin-label">
                Import from previous session
              </label>
              <select
                id="bs-import-session"
                className="admin-input"
                value={importId}
                onChange={(e) => importStalls(e.target.value)}
                disabled={importing}
                style={{ maxWidth: "22rem" }}
              >
                <option value="">
                  {importing ? "Loading stalls…" : "Start from scratch"}
                </option>
                {importable.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.stall_count} stalls)
                  </option>
                ))}
              </select>
              <p className="admin-hint" style={{ marginTop: "0.5rem" }}>
                Replaces the list below with that session&apos;s stalls. Edit them
                freely -- nothing is saved until you create the session.
              </p>
              {importError && (
                <p className="admin-error" style={{ marginTop: "0.5rem" }}>
                  {importError}
                </p>
              )}
            </div>
          )}

          <label htmlFor="bs-stall-name" className="admin-label">
            Stall name
          </label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <input
              id="bs-stall-name"
              type="text"
              className="admin-input"
              value={stallName}
              onChange={(e) => setStallName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addStall();
                }
              }}
              placeholder="Go-Kart"
              maxLength={60}
              style={{ flex: "1 1 12rem" }}
            />
            {/* max occupancy ∙ max groups -- 1/2/3 segmented tiles each */}
            <SegmentedCount value={stallOcc} onChange={setStallOcc} label="Max volunteers" />
            <SegmentedCount value={stallGroups} onChange={setStallGroups} label="Max groups" />
            <button
              type="button"
              className="btn-outline"
              style={{ padding: "0.55rem 1rem", fontSize: "0.75rem", cursor: "pointer" }}
              disabled={!stallName.trim()}
              onClick={addStall}
            >
              ADD
            </button>
          </div>

          <div style={{ marginTop: "0.75rem" }}>
            <label htmlFor="bs-stall-leads" className="admin-label">
              Stall lead names (optional, max 3)
            </label>
            <textarea
              id="bs-stall-leads"
              className="admin-input"
              value={stallLeadsText}
              onChange={(e) => setStallLeadsText(e.target.value)}
              placeholder={"Sharanya N\nKethan K B"}
              rows={2}
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
            <p className="admin-hint" style={{ marginTop: "0.5rem" }}>
              Shown on the stall card for reference only ∙ accounts are no
              longer created here. Volunteers register themselves at
              /bootstrap/register/stall.
            </p>
          </div>
          <p className="admin-hint" style={{ marginTop: "0.5rem" }}>
            Max occupancy = how many volunteers can claim the stall at once.
          </p>
          {stallError && <p className="admin-error" style={{ marginTop: "0.5rem" }}>{stallError}</p>}

          {stalls.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: "1.5rem 0 0" }}>
              {stalls.map((s, i) => (
                <li
                  key={`${s.stall_name}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.6rem 0.75rem",
                    border: "1px solid var(--border)",
                    borderBottom: i === stalls.length - 1 ? "1px solid var(--border)" : "none",
                    background: "var(--bg-card)",
                  }}
                >
                  <span className="admin-cell-mono" style={{ color: "var(--text-muted)" }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: "0.85rem" }}>
                    {s.stall_name}
                    {s.lead_names.length > 0 && (
                      <span
                        style={{
                          display: "block",
                          fontFamily: "var(--font-mono), monospace",
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {s.lead_names.join(", ")}
                      </span>
                    )}
                  </span>
                  <span className="admin-cell-mono">
                    max {s.max_occupancy} · {s.max_groups}g
                  </span>
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => moveStall(i, -1)}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.2rem" }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={i === stalls.length - 1}
                    onClick={() => moveStall(i, 1)}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.2rem" }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="Remove stall"
                    onClick={() => setStalls(stalls.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", padding: "0.2rem" }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="admin-error" style={{ marginTop: "1rem" }}>{error}</p>}

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              className="btn-outline"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
              onClick={() => setStep(1)}
              disabled={busy}
            >
              BACK
            </button>
            <button
              className="btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
              disabled={busy || stalls.length === 0}
              onClick={submit}
            >
              {busy ? "CREATING…" : "CREATE SESSION"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
