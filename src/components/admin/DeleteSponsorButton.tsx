"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteSponsorButtonProps = {
  id: string;
  name: string;
};

/** Danger-zone delete for the sponsor EDIT page; list rows use <InlineDelete />. */
export default function DeleteSponsorButton({ id, name }: DeleteSponsorButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = confirm(`Delete sponsor "${name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/sponsors?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete sponsor");
      }

      router.push("/admin/sponsors");
    } catch (error) {
      console.error(error);
      alert("Failed to delete sponsor");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button type="button" onClick={handleDelete} disabled={deleting} className="admin-btn-danger">
      {deleting ? "DELETING…" : "DELETE SPONSOR"}
    </button>
  );
}
