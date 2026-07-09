"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteEventButtonProps {
  id: string;
  title: string;
}

/**
 * Danger-zone actions for the event EDIT page only; list rows use the
 * lightweight <InlineDelete /> instead.
 */
export default function DeleteEventButton({ id, title }: DeleteEventButtonProps) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleArchive() {
    if (!confirm(`Archive "${title}"? It will be hidden from the public site but can be restored.`)) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
      if (res.ok) router.push("/admin/events");
      else alert("Failed to archive event");
    } catch {
      alert("Failed to archive event");
    } finally {
      setArchiving(false);
    }
  }

  async function handlePermanentDelete() {
    const confirm1 = confirm(`Permanently delete "${title}"? This CANNOT be undone.`);
    if (!confirm1) return;
    const confirm2 = confirm(`Are you absolutely sure? "${title}" will be gone forever.`);
    if (!confirm2) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/events?id=${id}&permanent=true`, { method: "DELETE" });
      if (res.ok) router.push("/admin/events");
      else alert("Failed to delete event");
    } catch {
      alert("Failed to delete event");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={handleArchive}
        disabled={archiving || deleting}
        className="admin-btn-danger-outline"
      >
        {archiving ? "ARCHIVING…" : "ARCHIVE EVENT"}
      </button>
      <button
        type="button"
        onClick={handlePermanentDelete}
        disabled={archiving || deleting}
        className="admin-btn-danger"
      >
        {deleting ? "DELETING…" : "PERMANENTLY DELETE"}
      </button>
    </div>
  );
}
