"use client";

import { useEffect, type ReactNode } from "react";

/* S82: the slide-in edit panel, extracted from SponsorsTable (S62/D5) and
   AnnouncementsTable, which each carried an identical copy. Now used by those
   two plus TeamMembersTable and EventsTable. Only the "Edit" flow uses it;
   "Add" / "New" keeps its own full page.

   The caller owns `open` and which row is selected. This owns the mechanics:
   - Escape closes, and body scroll is locked while open.
   - The backdrop renders only while open: a fixed inset-0 element left mounted
     would swallow every click on the table behind it.
   - The <aside> stays mounted so the transform can transition both ways.
     `inert` when closed keeps the off-screen form out of the tab order and
     non-clickable -- cheaper and more correct than pointer-events juggling. */

type Props = {
  open: boolean;
  onClose: () => void;
  /** Small label above the title, and the panel's accessible name ("Edit sponsor"). */
  label: string;
  title: string;
  children: ReactNode;
};

export default function AdminEditPanel({ open, onClose, label, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="admin-panel-backdrop"
          aria-label="Close edit panel"
          onClick={onClose}
        />
      ) : null}

      <aside className="admin-panel" data-open={open} inert={!open} aria-label={label}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1.75rem" }}>
          <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <span className="admin-section-label">{label}</span>
              <h2 className="admin-page-title" style={{ marginTop: "0.35rem", fontSize: "1.1rem" }}>
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline mono"
              style={{ padding: "0.4rem 0.9rem", fontSize: "0.65rem", letterSpacing: "0.16em" }}
            >
              CLOSE
            </button>
          </header>

          {children}
        </div>
      </aside>
    </>
  );
}
