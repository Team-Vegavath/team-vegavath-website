"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* One-click photo upload for the /admin/team list: uploads to R2 under a
   timestamped key (R2 objects are immutable — never overwrite), then
   PATCHes just { id, photo_url }. Skips the full edit form entirely. */

interface Props {
  memberId: string;
  currentPhotoUrl: string | null;
}

export default function QuickPhotoUpload({ memberId, currentPhotoUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "path",
        `team/${memberId}-${Date.now()}.${file.name.split(".").pop()}`
      );
      const up = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!up.ok) throw new Error("Upload failed");
      const { url } = (await up.json()) as { url: string };

      const save = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberId, photo_url: url }),
      });
      if (!save.ok) throw new Error("Save failed");

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title={currentPhotoUrl ? "Replace photo" : "Add photo"}
        style={{
          background: "none",
          border: "none",
          cursor: uploading ? "wait" : "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          letterSpacing: "0.08em",
          color: uploading
            ? "var(--text-muted)"
            : currentPhotoUrl
              ? "var(--text-muted)"
              : "var(--accent)",
          textTransform: "uppercase",
          padding: 0,
        }}
      >
        {uploading ? "..." : currentPhotoUrl ? "PHOTO" : "ADD PHOTO"}
      </button>
      {error && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.65rem",
            color: "var(--error)",
          }}
        >
          {error}
        </span>
      )}
    </span>
  );
}
