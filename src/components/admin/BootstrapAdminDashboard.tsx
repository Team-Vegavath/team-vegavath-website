"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BootstrapMapSVG from "@/components/bootstrap/BootstrapMapSVG";
import StallCard, { BS, StallGrid, bootstrapBtnStyle } from "@/components/bootstrap/StallCard";
import type {
  BootstrapSession,
  BootstrapStall,
  BootstrapVolunteer,
  VolunteerCredential,
} from "@/lib/services/bootstrap";

const POLL_MS = 4000;

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

const mapHintStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono), monospace",
  fontSize: "0.65rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
};

// Own draft state per row so typing X/Y survives the 4s poll re-render.
function StallPositionRow({
  stall,
  onSave,
}: {
  stall: BootstrapStall;
  onSave: (stallId: string, x: number, y: number) => Promise<boolean>;
}) {
  const [x, setX] = useState(stall.map_x != null ? String(stall.map_x) : "");
  const [y, setY] = useState(stall.map_y != null ? String(stall.map_y) : "");
  const [saved, setSaved] = useState(false);

  async function save() {
    const numX = Number(x);
    const numY = Number(y);
    if (!Number.isFinite(numX) || !Number.isFinite(numY)) return;
    if (await onSave(stall.id, numX, numY)) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
      <div style={{ minWidth: "10rem", ...mapHintStyle, color: "var(--text-primary)" }}>
        {stall.stall_name}
      </div>
      <div>
        <div style={mapHintStyle}>Distance from left edge %</div>
        <input
          type="number"
          min={0}
          max={100}
          className="admin-input"
          value={x}
          onChange={(e) => setX(e.target.value)}
          style={{ width: "6rem", fontSize: "0.75rem", marginTop: "0.25rem" }}
        />
      </div>
      <div>
        <div style={mapHintStyle}>Distance from top edge %</div>
        <input
          type="number"
          min={0}
          max={100}
          className="admin-input"
          value={y}
          onChange={(e) => setY(e.target.value)}
          style={{ width: "6rem", fontSize: "0.75rem", marginTop: "0.25rem" }}
        />
      </div>
      <button
        style={{ ...bootstrapBtnStyle, width: "auto" }}
        onClick={save}
      >
        {saved ? "Saved" : "Set position"}
      </button>
    </div>
  );
}

export default function BootstrapAdminDashboard({
  session,
  initialStalls,
  initialVolunteers,
}: {
  session: BootstrapSession;
  initialStalls: BootstrapStall[];
  initialVolunteers: BootstrapVolunteer[];
}) {
  const router = useRouter();
  const [stalls, setStalls] = useState(initialStalls);
  const [volunteers, setVolunteers] = useState(initialVolunteers);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<BootstrapStall["status"]>("free");
  const [overrideClaimedBy, setOverrideClaimedBy] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function saveStallPosition(stallId: string, x: number, y: number): Promise<boolean> {
    const res = await fetch(`/api/admin/bootstrap/stalls/${stallId}/position`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ map_x: x, map_y: y }),
    }).catch(() => null);
    return res?.ok ?? false;
  }

  async function unlock(volunteerId: string) {
    await fetch(`/api/admin/bootstrap/volunteers/${volunteerId}/unlock`, {
      method: "PATCH",
    }).catch(() => {});
    poll();
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

  async function regenerate() {
    if (
      !window.confirm(
        "Regenerate credentials? Every volunteer gets a new password and is signed out. The old CSV becomes useless."
      )
    )
      return;
    const res = await fetch(`/api/admin/bootstrap/sessions/${session.id}/regenerate`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      downloadCredentialsCsv(data.credentials);
      poll();
    }
  }

  // natural sort: vol-2 before vol-10 (plain string ORDER BY puts 10 first)
  const sortedVolunteers = [...volunteers].sort((a, b) => {
    const numA = parseInt(a.username.replace(/\D+/g, ""), 10) || 0;
    const numB = parseInt(b.username.replace(/\D+/g, ""), 10) || 0;
    return numA - numB;
  });

  async function suggest(volunteerId: string, stallId: string | null) {
    await fetch(`/api/admin/bootstrap/volunteers/${volunteerId}/suggest`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stall_id: stallId }),
    }).catch(() => {});
    poll();
  }

  // groups stuck in the queue past 15 min - derived from polled data, no extra API
  const longWaiters = stalls.filter(
    (s) =>
      s.status === "queued" &&
      s.queued_by &&
      s.queued_at &&
      Date.now() - new Date(s.queued_at).getTime() > 15 * 60 * 1000
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
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            className="btn-outline"
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
            onClick={regenerate}
          >
            REGENERATE CREDENTIALS
          </button>
          <button
            className="admin-btn-danger-outline"
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem", cursor: "pointer" }}
            onClick={deactivate}
          >
            DEACTIVATE SESSION
          </button>
        </div>
      </header>

      {/* Long-wait alerts - refresh with the 4s poll */}
      {longWaiters.map((s) => {
        const mins = Math.floor((Date.now() - new Date(s.queued_at!).getTime()) / 60000);
        return (
          <div
            key={s.id}
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
              {s.queued_by} waiting at {s.stall_name} for {mins} min
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
            }
          />
        ))}
      </StallGrid>

      {/* Volunteer accounts */}
      <section className="admin-table-wrap" style={{ marginTop: "2.5rem" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Volunteer</th>
              <th>Username</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedVolunteers.map((v) => (
              <tr key={v.id}>
                <td className="admin-td-primary">{v.display_name}</td>
                <td className="admin-cell-mono">{v.username}</td>
                <td>
                  {/* square badge - admin pages keep the main site's sharp corners */}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.4rem 0.8rem",
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: v.is_active ? "var(--success)" : "var(--text-muted)",
                      background: v.is_active
                        ? "color-mix(in srgb, var(--success) 12%, transparent)"
                        : "color-mix(in srgb, var(--text-muted) 12%, transparent)",
                    }}
                  >
                    {v.is_active ? "ACTIVE" : "LOGGED OUT"}
                  </span>
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
                    {/* value pinned to "" so the select re-arms after each pick */}
                    <select
                      value=""
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
                      <option value="">SUGGEST STALL...</option>
                      <option value="clear">-- CLEAR --</option>
                      {stalls.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.stall_name}
                        </option>
                      ))}
                    </select>
                    {v.is_active && (
                      <button
                        className="btn-outline"
                        style={{
                          minHeight: "44px",
                          padding: "0.5rem 1.25rem",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                        onClick={() => unlock(v.id)}
                      >
                        UNLOCK
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            {/* live preview of the hardcoded SVG map so admin can eyeball
                percentages while setting positions */}
            <div style={{ position: "relative", height: "300px", overflow: "hidden" }}>
              <BootstrapMapSVG stalls={stalls} onClose={() => {}} inline />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {stalls.map((stall) => (
                <StallPositionRow key={stall.id} stall={stall} onSave={saveStallPosition} />
              ))}
            </div>
          </div>
        </details>
      )}
    </>
  );
}
