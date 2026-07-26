"use client";

import { useState } from "react";

import type { Milestone } from "@/lib/services/about";

type Draft = Omit<Milestone, "id">;

export default function MilestonesTable({
  initialData,
  isViewer = false,
}: {
  initialData: Milestone[];
  /** Read-only admin tier: hides add / edit / delete and the drag handle (S47). */
  isViewer?: boolean;
}) {
  const [items, setItems] = useState(initialData);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  // Drag handlers
  function onDragStart(e: React.DragEvent, i: number) {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setOverIdx(i);
  }
  async function onDrop(e: React.DragEvent, dropIdx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    if (!moved) return;
    reordered.splice(dropIdx, 0, moved);
    const updated = reordered.map((m, i) => ({ ...m, sort_order: i + 1 }));
    // Persist only rows whose sort_order actually changed, compared by id
    const prev = new Map(items.map((m) => [m.id, m.sort_order]));
    setItems(updated);
    setDragIdx(null);
    setOverIdx(null);
    await Promise.all(
      updated
        .filter((m) => prev.get(m.id) !== m.sort_order)
        .map((m) =>
          fetch(`/api/admin/milestones/${m.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date_label: m.date_label,
              title: m.title,
              description: m.description,
              sort_order: m.sort_order,
            }),
          }).catch(() => null)
        )
    );
  }

  // CRUD handlers
  async function handleSave(id: string, data: Draft) {
    const res = await fetch(`/api/admin/milestones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => null);
    if (!res?.ok) {
      alert("Save failed. Please retry.");
      return;
    }
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)));
    setEditing(null);
  }

  async function handleAdd(data: Draft) {
    const res = await fetch("/api/admin/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, sort_order: items.length + 1 }),
    }).catch(() => null);
    const payload = res?.ok ? await res.json().catch(() => null) : null;
    if (!payload?.milestone) {
      alert("Add failed. Please retry.");
      return;
    }
    setItems((prev) => [...prev, payload.milestone as Milestone]);
    setAdding(false);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete milestone "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/milestones?id=${id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!res?.ok) {
      alert("Delete failed. Please retry.");
      return;
    }
    setItems((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div>
      {/* Add button */}
      {!adding && !isViewer && (
        <button
          onClick={() => setAdding(true)}
          className="btn-primary"
          style={{ padding: "8px 18px", fontSize: "0.72rem", marginBottom: "2rem" }}
        >
          ADD MILESTONE
        </button>
      )}

      {/* Inline add form at top */}
      {adding && !isViewer && (
        <MilestoneForm
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
          style={{ marginBottom: "2rem" }}
        />
      )}

      {/* Timeline */}
      <div style={{ position: "relative", paddingLeft: "2.5rem" }}>
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: "8px",
            top: 0,
            bottom: 0,
            width: "1px",
            background: "var(--border-strong)",
          }}
        />

        {items.map((m, i) => (
          <div
            key={m.id}
            draggable={!isViewer}
            onDragStart={isViewer ? undefined : (e) => onDragStart(e, i)}
            onDragOver={isViewer ? undefined : (e) => onDragOver(e, i)}
            onDrop={isViewer ? undefined : (e) => onDrop(e, i)}
            onDragEnd={isViewer ? undefined : () => {
              setDragIdx(null);
              setOverIdx(null);
            }}
            style={{
              position: "relative",
              marginBottom: "2rem",
              opacity: overIdx === i && dragIdx !== i ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {/* Dot - drag handle */}
            <div
              style={{
                position: "absolute",
                left: "-2.5rem",
                top: "1rem",
                width: "12px",
                height: "12px",
                background: "var(--accent)",
                border: "2px solid var(--bg-base)",
                borderRadius: "50%",
                cursor: isViewer ? "default" : "grab",
                zIndex: 1,
              }}
            />

            {/* Card */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                padding: "1rem 1.25rem",
              }}
            >
              {editing === m.id && !isViewer ? (
                <MilestoneForm
                  initial={m}
                  onSave={(data) => handleSave(m.id, data)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <time
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.7rem",
                        letterSpacing: "0.15em",
                        color: "var(--accent)",
                        textTransform: "uppercase",
                      }}
                    >
                      {m.date_label}
                    </time>
                    <h3
                      style={{
                        fontFamily: "var(--font-chakra)",
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginTop: "0.25rem",
                      }}
                    >
                      {m.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: "var(--font-space)",
                        fontSize: "0.875rem",
                        color: "var(--text-secondary)",
                        marginTop: "0.4rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {m.description}
                    </p>
                  </div>
                  {!isViewer ? (
                    <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0, marginLeft: "1rem" }}>
                      <button
                        onClick={() => setEditing(m.id)}
                        className="admin-row-action"
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDelete(m.id, m.title)}
                        className="admin-row-action admin-row-action-danger"
                      >
                        DELETE
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ))}

        {items.length === 0 && !adding && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
            }}
          >
            NO MILESTONES YET.
          </p>
        )}
      </div>
    </div>
  );
}

// Shared form for add + edit
function MilestoneForm({
  initial,
  onSave,
  onCancel,
  style,
}: {
  initial?: Milestone;
  onSave: (data: Draft) => void;
  onCancel: () => void;
  style?: React.CSSProperties;
}) {
  const [dateLabel, setDateLabel] = useState(initial?.date_label ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const sortOrder = initial?.sort_order ?? 0;

  function save() {
    if (!dateLabel.trim() || !title.trim() || !description.trim()) {
      alert("Date label, title, and description are all required.");
      return;
    }
    onSave({ date_label: dateLabel, title, description, sort_order: sortOrder });
  }

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-strong)",
        padding: "1rem 1.25rem",
        ...style,
      }}
    >
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <div style={{ flex: "0 0 120px" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              color: "var(--text-muted)",
              letterSpacing: "0.12em",
              marginBottom: "4px",
            }}
          >
            DATE LABEL
          </div>
          <input
            value={dateLabel}
            onChange={(e) => setDateLabel(e.target.value)}
            placeholder="SEP 2025"
            style={{
              width: "100%",
              background: "none",
              border: "none",
              borderBottom: "1px solid var(--border-strong)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              padding: "4px 0",
              outline: "none",
            }}
          />
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              color: "var(--text-muted)",
              letterSpacing: "0.12em",
              marginBottom: "4px",
            }}
          >
            TITLE
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              borderBottom: "1px solid var(--border-strong)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-space)",
              fontSize: "0.9rem",
              padding: "4px 0",
              outline: "none",
            }}
          />
        </div>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.65rem",
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            marginBottom: "4px",
          }}
        >
          DESCRIPTION
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            borderBottom: "1px solid var(--border-strong)",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-space)",
            fontSize: "0.875rem",
            padding: "4px 0",
            resize: "vertical",
            outline: "none",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={save}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
            background: "var(--accent)",
            color: "var(--bg-base)",
            border: "none",
            padding: "6px 16px",
            cursor: "pointer",
          }}
        >
          SAVE
        </button>
        <button
          onClick={onCancel}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}
