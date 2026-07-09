"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ToggleEventStatusButtonProps {
  id: string;
  currentStatus: string;
}

export default function ToggleEventStatusButton({
  id,
  currentStatus,
}: ToggleEventStatusButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleStatus() {
    let newStatus = "past";

    if (currentStatus === "archived") {
      newStatus = "past";
    } else if (currentStatus === "past") {
      newStatus = "upcoming";
    } else if (currentStatus === "upcoming") {
      newStatus = "past";
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
    } catch {
      alert("Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleStatus}
      disabled={loading}
      className="btn-outline"
      style={{ padding: "0.5rem 1.1rem", fontSize: "0.72rem" }}
    >
      {loading
        ? "Updating..."
        : currentStatus === "archived"
          ? "Unarchive → Past"
          : currentStatus === "upcoming"
            ? "Mark as Past"
            : "Mark as Upcoming"}
    </button>
  );
}