"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InlineDeleteProps {
  /** Full DELETE endpoint including query string, e.g. `/api/admin/team?id=123`. */
  endpoint: string;
  confirmMessage: string;
  /** Visible label: "DELETE", or "ARCHIVE" where the API soft-deletes. */
  label?: string;
}

/**
 * Plain text delete trigger for table rows (list pages). The full-size
 * danger-zone delete buttons live on the edit pages only.
 */
export default function InlineDelete({ endpoint, confirmMessage, label = "DELETE" }: InlineDeleteProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!confirm(confirmMessage)) return;

    setBusy(true);

    try {
      const res = await fetch(endpoint, { method: "DELETE" });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      router.refresh();
    } catch {
      alert("Action failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="admin-row-action admin-row-action-danger"
    >
      {busy ? "…" : label}
    </button>
  );
}
