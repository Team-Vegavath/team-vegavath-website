"use client";

import Link from "next/link";
import { useState } from "react";

import InlineDelete from "@/components/admin/InlineDelete";
import QuickPhotoUpload from "@/components/admin/QuickPhotoUpload";
import type { TeamMember } from "@/types/member";

interface Props {
  initialData: TeamMember[];
  /** Read-only admin tier: hides the toggle, drag handle and row actions. */
  isViewer?: boolean;
}

/**
 * Client table for /admin/team. Extracted from the page (S47) because both the
 * active toggle and the drag reorder need local optimistic state -- the server
 * table only updated after a full reload, which read as a broken toggle.
 *
 * Drag reorder is HTML5 DnD (same pattern as MilestonesTable) and is confined
 * to a single tier: rows arrive sorted by (tier, display_order), so each tier
 * is a contiguous block and a same-tier move is a plain splice.
 */
export default function TeamMembersTable({ initialData, isViewer = false }: Props) {
  const [items, setItems] = useState(initialData);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggleActive(member: TeamMember) {
    const next = !member.is_active;
    // Optimistic: flip immediately, revert if the PATCH fails.
    setItems((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, is_active: next } : m))
    );
    setPendingId(member.id);

    const res = await fetch("/api/admin/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: member.id, is_active: next }),
    }).catch(() => null);

    setPendingId(null);

    if (!res?.ok) {
      setItems((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, is_active: !next } : m))
      );
      alert("Could not change active state. Please retry.");
    }
  }

  function onDragStart(e: React.DragEvent, i: number) {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setOverIdx(i);
  }

  function clearDrag() {
    setDragIdx(null);
    setOverIdx(null);
  }

  async function onDrop(e: React.DragEvent, dropIdx: number) {
    e.preventDefault();
    const source = dragIdx === null ? null : items[dragIdx];
    const target = items[dropIdx];
    clearDrag();

    if (!source || !target) return;
    if (dragIdx === dropIdx) return;
    // Reorder is within a tier only -- a cross-tier drop is ignored.
    if (source.tier !== target.tier) return;

    const tier = source.tier;
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx as number, 1);
    if (!moved) return;
    reordered.splice(dropIdx, 0, moved);

    // Renumber this tier only; other tiers keep their stored order.
    let n = 0;
    const updated = reordered.map((m) =>
      m.tier === tier ? { ...m, display_order: ++n } : m
    );
    setItems(updated);

    const ids = updated.filter((m) => m.tier === tier).map((m) => m.id);
    const res = await fetch("/api/admin/team/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, ids }),
    }).catch(() => null);

    if (!res?.ok) {
      setItems(items);
      alert("Could not save the new order. Please retry.");
    }
  }

  return (
    <section className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {!isViewer ? <th aria-label="Reorder" /> : null}
            <th>Photo</th>
            <th>Name</th>
            <th>Role</th>
            <th>Tier</th>
            <th>Domain</th>
            <th>Active</th>
            <th>Order</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((member, i) => (
              <tr
                key={member.id}
                data-tier={member.tier}
                draggable={!isViewer}
                onDragStart={isViewer ? undefined : (e) => onDragStart(e, i)}
                onDragOver={isViewer ? undefined : (e) => onDragOver(e, i)}
                onDrop={isViewer ? undefined : (e) => onDrop(e, i)}
                onDragEnd={isViewer ? undefined : clearDrag}
                style={{
                  opacity:
                    overIdx === i && dragIdx !== i && dragIdx !== null ? 0.5 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {!isViewer ? (
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span
                      aria-hidden="true"
                      title="Drag to reorder within this tier"
                      style={{
                        display: "inline-block",
                        color: "var(--text-muted)",
                        cursor: "grab",
                        letterSpacing: "-2px",
                        userSelect: "none",
                      }}
                    >
                      ⠿
                    </span>
                  </td>
                ) : null}
                <td style={{ whiteSpace: "nowrap" }}>
                  {member.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.photo_url} alt={member.name} className="admin-thumb" />
                  ) : (
                    <span className="admin-thumb-empty" aria-hidden="true" />
                  )}
                </td>
                <td className="admin-td-primary" style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{member.name}</td>
                <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{member.role}</td>
                <td className="admin-cell-mono" style={{ whiteSpace: "nowrap", textTransform: "uppercase" }}>{member.tier}</td>
                <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{member.domain ?? "-"}</td>
                {/* S66: the badge is the affordance for both tiers -- a viewer
                    reads it, an admin clicks it. The button is stripped to a
                    bare wrapper (same inline reset SponsorsTable uses) so the
                    badge's own border is the only frame in the cell. */}
                <td style={{ whiteSpace: "nowrap" }}>
                  {isViewer ? (
                    <span className={`status-badge status-${member.is_active ? "active" : "inactive"}`}>
                      {member.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleActive(member)}
                      disabled={pendingId === member.id}
                      aria-pressed={member.is_active}
                      aria-label={`${member.is_active ? "Deactivate" : "Activate"} ${member.name}`}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: pendingId === member.id ? "wait" : "pointer",
                        font: "inherit",
                      }}
                    >
                      <span className={`status-badge status-${member.is_active ? "active" : "inactive"}`}>
                        {member.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </button>
                  )}
                </td>
                <td className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>{member.display_order}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {isViewer ? (
                    <span className="admin-cell-mono" style={{ color: "var(--text-muted)" }}>-</span>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <QuickPhotoUpload memberId={member.id} currentPhotoUrl={member.photo_url} />
                      <Link href={`/admin/team/${member.id}/edit`} className="admin-row-action">
                        EDIT
                      </Link>
                      <InlineDelete
                        endpoint={`/api/admin/team?id=${member.id}`}
                        confirmMessage={`Permanently delete "${member.name}"? This cannot be undone.`}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={isViewer ? 8 : 9} className="admin-empty">
                No members yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
