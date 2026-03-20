"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteEventButtonProps {
  id: string;
  title: string;
}

export default function DeleteEventButton({ id, title }: DeleteEventButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Archive "${title}"? It will no longer appear on the site.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else alert("Failed to archive event");
    } catch {
      alert("Failed to archive event");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
    >
      {deleting ? "Archiving..." : "Archive"}
    </button>
  );
}
