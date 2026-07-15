"use client";

import { useState } from "react";

import type { BootstrapSession, VolunteerCredential } from "@/lib/services/bootstrap";

interface StallDraft {
  stall_name: string;
  max_occupancy: number;
}

function downloadCredentialsCsv(credentials: VolunteerCredential[]) {
  const csv = [
    "display_name,username,password",
    ...credentials.map((c) => `${c.display_name},${c.username},${c.password}`),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bootstrap-credentials.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BootstrapCreateSession({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [stalls, setStalls] = useState<StallDraft[]>([]);
  const [stallName, setStallName] = useState("");
  const [stallOcc, setStallOcc] = useState(1);
  const [volunteerCount, setVolunteerCount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    session: BootstrapSession;
    credentials: VolunteerCredential[];
  } | null>(null);

  function addStall() {
    if (!stallName.trim()) return;
    setStalls([...stalls, { stall_name: stallName.trim(), max_occupancy: stallOcc }]);
    setStallName("");
    setStallOcc(1);
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
        body: JSON.stringify({ name, stalls, volunteer_count: count }),
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

  if (result) {
    return (
      <div style={{ maxWidth: "42rem" }}>
        <header className="admin-page-header">
          <h1 className="admin-page-title">Credentials</h1>
        </header>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          Passwords are shown once and never stored in plain text. Download the CSV
          now — if it is lost, regenerate credentials from the live dashboard.
        </p>
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
              {result.credentials.map((c) => (
                <tr key={c.username}>
                  <td className="admin-td-primary">{c.display_name}</td>
                  <td className="admin-cell-mono">{c.username}</td>
                  <td className="admin-cell-mono">{c.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
          <button
            className="btn-primary"
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
            onClick={() => downloadCredentialsCsv(result.credentials)}
          >
            DOWNLOAD CSV
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
          <p className="admin-hint" style={{ marginTop: "0.5rem" }}>
            Max occupancy = how many volunteers can claim the stall at once.
          </p>

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
                  <span style={{ flex: 1, fontSize: "0.85rem" }}>{s.stall_name}</span>
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
            Volunteer accounts
          </label>
          <input
            id="bs-vol-count"
            type="number"
            className="admin-input"
            min={1}
            max={100}
            value={volunteerCount}
            onChange={(e) => setVolunteerCount(e.target.value)}
            placeholder={String(stalls.length)}
          />
          <p className="admin-hint" style={{ marginTop: "0.5rem" }}>
            Defaults to the stall count ({stalls.length}). Credentials are generated
            per session — one CSV download, shown once.
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
              disabled={busy || Number(volunteerCount || stalls.length) < 1}
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
