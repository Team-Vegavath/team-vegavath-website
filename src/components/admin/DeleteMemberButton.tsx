"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteMemberButtonProps {
  id: string;
  name: string;
}

/** Danger-zone delete for the member EDIT page; list rows use <InlineDelete />. */
export default function DeleteMemberButton({ id, name }: DeleteMemberButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/team?id=${id}`, { method: "DELETE" });

      if (res.ok) {
        router.push("/admin/team");
      } else {
        alert("Failed to delete member");
      }
    } catch {
      alert("Failed to delete member");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button type="button" onClick={handleDelete} disabled={deleting} className="admin-btn-danger">
      {deleting ? "DELETING…" : "DELETE MEMBER"}
    </button>
  );
}
