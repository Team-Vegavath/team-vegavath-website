"use client";

import { useState } from "react";

import type {
  BootstrapSession,
  StallLeadCredential,
  VolunteerCredential,
} from "@/lib/services/bootstrap";

interface StallDraft {
  stall_name: string;
  max_occupancy: number;
  lead_names: string[]; // up to 3 - each becomes a role='stall' account (S33)
}

interface CarriedLead {
  id: string;
  username: string;
  display_name: string;
  stall_name: string | null;
}

interface CreateResult {
  session: BootstrapSession;
  stallLeadCredentials: StallLeadCredential[];
  groupLeadCredentials: VolunteerCredential[];
  copiedStallLeads: number;
}

function downloadCsv(filename: string, header: string, rows: string[][]) {
  const csv = [header, ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BootstrapCreateSession({
  onDone,
  sessions = [],
}: {
  onDone: () => void;
  // existing sessions (newest first) - carry-forward sources for stall leads
  sessions?: BootstrapSession[];
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [maxGroupSize, setMaxGroupSize] = useState("20");
  // carry-forward: reuse a previous day's stall-lead accounts verbatim so the
  // Day 1 credentials CSV keeps working all week
  const [copyMode, setCopyMode] = useState<"fresh" | "copy">("fresh");
  const [copyFrom, setCopyFrom] = useState(sessions[0]?.id ?? "");
  const [carriedLeads, setCarriedLeads] = useState<CarriedLead[] | null>(null);
  const [stalls, setStalls] = useState<StallDraft[]>([]);
  const [stallName, setStallName] = useState("");
  const [stallOcc, setStallOcc] = useState(1);
  const [stallLeadsText, setStallLeadsText] = useState("");
  const [stallError, setStallError] = useState("");
  const [volunteerCount, setVolunteerCount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreateResult | null>(null);

  const copying = copyMode === "copy" && !!copyFrom;

  async function loadCarriedLeads(sessionId: string) {
    setCarriedLeads(null);
    const res = await fetch(`/api/admin/bootstrap/sessions/${sessionId}/stall-leads`).catch(
      () => null
    );
    if (res?.ok) {
      const data = await res.json();
      setCarriedLeads(data.stallLeads ?? []);
    } else {
      setCarriedLeads([]);
    }
  }

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
    if (leadNames.some((n) => !/[a-zA-Z]/.test(n))) {
      setStallError("Every lead name needs at least one letter.");
      return;
    }
    setStallError("");
    setStalls([
      ...stalls,
      { stall_name: stallName.trim(), max_occupancy: stallOcc, lead_names: leadNames },
    ]);
    setStallName("");
    setStallOcc(1);
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
    const count = Number(volunteerCount || stalls.length);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/bootstrap/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          stalls,
          volunteer_count: count, // group leads - each gets a group + QR link
          max_group_size: Number(maxGroupSize) || 20,
          copy_stall_leads_from: copying ? copyFrom : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to create session");
        return;
      }
      setResult(data);
    } catch {
      setError("Request failed — check your connection");
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

  const choiceBtn = (active: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-mono), monospace",
    fontSize: "0.72rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "0.55rem 1rem",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--bg-base)" : "var(--text-muted)",
    border: "1px solid var(--border)",
    cursor: "pointer",
  });

  if (result) {
    const carriedNote = result.copiedStallLeads > 0;
    return (
      <div style={{ maxWidth: "42rem" }}>
        <header className="admin-page-header">
          <h1 className="admin-page-title">Credentials</h1>
        </header>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          Passwords are shown once and never stored in plain text. Download the CSVs
          now — if they are lost, regenerate credentials from the live dashboard.
          Hand the stall-lead CSV to each stall lead by name; hand the group-lead
          CSV out on the day.
        </p>

        {carriedNote && (
          <p
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginBottom: "1.5rem",
            }}
          >
            {result.copiedStallLeads} STALL LEADS CARRIED FORWARD — same usernames and
            passwords as the source session, so the Day 1 stall-lead CSV still works.
          </p>
        )}

        {result.stallLeadCredentials.length > 0 && (
          <>
            <p style={{ ...monoLabel, marginBottom: "0.5rem" }}>Stall leads</p>
            <section className="admin-table-wrap" style={{ marginBottom: "1.5rem" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Stall</th>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Password</th>
                  </tr>
                </thead>
                <tbody>
                  {result.stallLeadCredentials.map((c) => (
                    <tr key={c.username}>
                      <td className="admin-td-primary">{c.stall}</td>
                      <td>{c.display_name}</td>
                      <td className="admin-cell-mono">{c.username}</td>
                      <td className="admin-cell-mono">{c.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}

        <p style={{ ...monoLabel, marginBottom: "0.5rem" }}>Group leads</p>
        <section className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Display name</th>
                <th>Username</th>
                <th>Password</th>
              </tr>
            </thead>
            <tbody>
              {result.groupLeadCredentials.map((c) => (
                <tr key={c.username}>
                  <td className="admin-td-primary">{c.display_name}</td>
                  <td className="admin-cell-mono">{c.username}</td>
                  <td className="admin-cell-mono">{c.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
          {/* hidden on carry-forward sessions - credentials unchanged, use the Day 1 CSV */}
          {result.stallLeadCredentials.length > 0 && (
            <button
              className="btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
              onClick={() =>
                downloadCsv(
                  "bootstrap-stall-lead-credentials.csv",
                  "stall,display_name,username,password",
                  result.stallLeadCredentials.map((c) => [
                    c.stall,
                    c.display_name,
                    c.username,
                    c.password,
                  ])
                )
              }
            >
              DOWNLOAD STALL LEAD CREDENTIALS
            </button>
          )}
          <button
            className="btn-primary"
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
            onClick={() =>
              downloadCsv(
                "bootstrap-group-lead-credentials.csv",
                "display_name,username,password",
                result.groupLeadCredentials.map((c) => [c.display_name, c.username, c.password])
              )
            }
          >
            DOWNLOAD GROUP LEAD CREDENTIALS
          </button>
          <button
            className="btn-outline"
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
            onClick={onDone}
          >
            DONE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "34rem" }}>
      <header className="admin-page-header">
        <h1 className="admin-page-title">New Session</h1>
      </header>

      {/* Step indicator — same pattern as JoinClient */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <p style={monoLabel}>Step {step} of 3</p>
        <div style={{ display: "flex", gap: "6px" }}>
          {([1, 2, 3] as const).map((s) => (
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

          <div style={{ marginTop: "1.5rem" }}>
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
            <p className="admin-hint" style={{ marginTop: "0.5rem" }}>
              Check-in closes for a group once it reaches this size.
            </p>
          </div>

          {sessions.length > 0 && (
            <div style={{ marginTop: "1.5rem" }}>
              <label htmlFor="bs-copy-from" className="admin-label">
                Copy stall leads from previous session?
              </label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <select
                  id="bs-copy-from"
                  className="admin-input"
                  value={copyFrom}
                  onChange={(e) => {
                    setCopyFrom(e.target.value);
                    if (copyMode === "copy") void loadCarriedLeads(e.target.value);
                  }}
                  style={{ flex: "1 1 12rem" }}
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  style={choiceBtn(copyMode === "copy")}
                  onClick={() => {
                    setCopyMode("copy");
                    void loadCarriedLeads(copyFrom);
                  }}
                >
                  YES, COPY LEADS
                </button>
                <button
                  type="button"
                  style={choiceBtn(copyMode === "fresh")}
                  onClick={() => {
                    setCopyMode("fresh");
                    setCarriedLeads(null);
                  }}
                >
                  START FRESH
                </button>
              </div>
              {copying && (
                <p className="admin-hint" style={{ marginTop: "0.5rem" }}>
                  {carriedLeads === null
                    ? "Loading stall leads…"
                    : `Carrying forward ${carriedLeads.length} stall lead${
                        carriedLeads.length === 1 ? "" : "s"
                      } from ${sessions.find((s) => s.id === copyFrom)?.name ?? "the source session"} — same usernames and passwords, the Day 1 CSV keeps working. Name your stalls identically so leads land on the right stall.`}
                </p>
              )}
            </div>
          )}

          <div style={{ marginTop: "1.5rem" }}>
            <button
              className="btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
              disabled={!name.trim()}
              onClick={() => setStep(2)}
            >
              NEXT
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
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
            {/* max occupancy — 1/2/3 segmented tiles */}
            <div style={{ display: "flex" }}>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStallOcc(n)}
                  style={{
                    width: "2.4rem",
                    padding: "0.55rem 0",
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    background: stallOcc === n ? "var(--accent)" : "transparent",
                    color: stallOcc === n ? "var(--bg-base)" : "var(--text-primary)",
                    border: "1px solid var(--border)",
                    borderLeft: n === 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
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

          {/* carry-forward already knows the leads - no name entry needed */}
          {!copying && (
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
                One per line or comma-separated. Each name becomes a login for
                toggling this stall FREE/OCCUPIED — usernames are generated from
                the names (e.g. Sharanya N → sharanyan).
              </p>
            </div>
          )}
          {copying && (
            <p className="admin-hint" style={{ marginTop: "0.75rem" }}>
              Stall leads are carried forward from{" "}
              {sessions.find((s) => s.id === copyFrom)?.name ?? "the source session"} — no
              name entry needed. Use the same stall names as that session.
            </p>
          )}
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
                  <span className="admin-cell-mono">max {s.max_occupancy}</span>
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

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              className="btn-outline"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
              onClick={() => setStep(1)}
            >
              BACK
            </button>
            <button
              className="btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
              disabled={stalls.length === 0}
              onClick={() => setStep(3)}
            >
              NEXT
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <label htmlFor="bs-vol-count" className="admin-label">
            Group lead accounts
          </label>
          <input
            id="bs-vol-count"
            type="number"
            className="admin-input"
            min={1}
            max={26}
            value={volunteerCount}
            onChange={(e) => setVolunteerCount(e.target.value)}
            placeholder={String(Math.min(stalls.length, 26))}
          />
          <p className="admin-hint" style={{ marginTop: "0.5rem" }}>
            Group leads walk with student groups (lead-1, lead-2, …). Each gets
            one group (Group A, B, …) and a personal check-in QR link. Defaults
            to the stall count ({stalls.length}).
          </p>
          <p className="admin-hint" style={{ marginTop: "0.5rem" }}>
            {copying
              ? `Stall lead accounts: carried forward (${carriedLeads?.length ?? "…"}).`
              : `Stall lead accounts: ${stalls.reduce((sum, s) => sum + s.lead_names.length, 0)} (from the names in step 2).`}
          </p>

          {error && <p className="admin-error" style={{ marginTop: "1rem" }}>{error}</p>}

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              className="btn-outline"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
              onClick={() => setStep(2)}
              disabled={busy}
            >
              BACK
            </button>
            <button
              className="btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
              disabled={
                busy ||
                Number(volunteerCount || stalls.length) < 1 ||
                Number(volunteerCount || stalls.length) > 26
              }
              onClick={submit}
            >
              {busy ? "CREATING…" : "CREATE + DOWNLOAD CREDENTIALS"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
