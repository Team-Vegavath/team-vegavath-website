"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import FileUploadField from "@/components/admin/FileUploadField";
import { uploadToR2 } from "@/lib/utils";

type UploadStatus = "queued" | "uploading" | "done" | "error";

const STATUS_COLOR: Record<UploadStatus, string> = {
  queued: "var(--text-muted)",
  uploading: "var(--accent)",
  done: "var(--gold)",
  error: "var(--error)",
};

export default function GalleryUploadForm() {
  const router = useRouter();

  const [eventLabel, setEventLabel] = useState("");
  const [eventId, setEventId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Batch snapshot + per-file statuses: rendered instead of the picker while
  // an upload runs, so mid-upload file removals can't desync the status list.
  const [batch, setBatch] = useState<{ name: string }[] | null>(null);
  const [statuses, setStatuses] = useState<UploadStatus[]>([]);
  const [summary, setSummary] = useState<{ done: number; failed: number } | null>(null);

  const [videoUrl, setVideoUrl] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const [videoEventLabel, setVideoEventLabel] = useState("");

  const resetImageForm = () => {
    setEventLabel("");
    setEventId("");
    setFiles([]);
    setCaptions([]);
    setBatch(null);
    setStatuses([]);
    setSummary(null);
  };

  const handleFilesChange = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setCaptions((previous) =>
      Array.from({ length: selectedFiles.length }, (_, index) => previous[index] ?? ""),
    );
  };

  const updateCaptionAtIndex = (index: number, value: string) => {
    setCaptions((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const setStatusAtIndex = (index: number, status: UploadStatus) => {
    setStatuses((previous) => {
      const next = [...previous];
      next[index] = status;
      return next;
    });
  };

  const handleImageUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (files.length === 0) {
      setError("Please select at least one image.");
      return;
    }

    // Event label is optional: unlabelled uploads go into a "General" bucket
    // (event_id stays null unless pasted -- no lookup from the label).
    const trimmedEventLabel = eventLabel.trim() || "General";
    const eventSlug = trimmedEventLabel
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const batchFiles = [...files];
    const batchCaptions = [...captions];

    setUploading(true);
    setSummary(null);
    setBatch(batchFiles.map((file) => ({ name: file.name })));
    setStatuses(batchFiles.map(() => "queued"));

    // New items sort after existing ones: the gallery lists display_order ASC,
    // so start the batch at current max + 1 (best effort -- falls back to 0).
    let baseOrder = 0;
    try {
      const listResponse = await fetch("/api/admin/gallery");
      if (listResponse.ok) {
        const items = (await listResponse.json()) as { display_order?: number }[];
        baseOrder = items.reduce(
          (max, item) => Math.max(max, (item.display_order ?? 0) + 1),
          0,
        );
      }
    } catch {
      // keep baseOrder = 0
    }

    let done = 0;
    let failed = 0;

    for (let index = 0; index < batchFiles.length; index += 1) {
      const file = batchFiles[index];
      if (!file) {
        continue;
      }

      setStatusAtIndex(index, "uploading");

      // Per-file try/catch: one bad file logs and moves on -- partial success
      // is expected behaviour for a bulk upload.
      try {
        const filename = file.name.toLowerCase().replace(/\s+/g, "-");
        // Timestamp prefix: R2 serves immutable cache headers; re-uploading a
        // same-named file must never reuse the old object key.
        const uploadPath = `gallery/${eventSlug}/${Date.now()}-${filename}`;

        const r2Url = await uploadToR2(file, uploadPath);

        const createResponse = await fetch("/api/admin/gallery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_id: eventId.trim() || null,
            event_label: trimmedEventLabel,
            type: "image",
            url: r2Url,
            thumbnail_url: r2Url,
            caption: batchCaptions[index] || "",
            display_order: baseOrder + index,
          }),
        });

        if (!createResponse.ok) {
          const createError = (await createResponse.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(createError?.error ?? "Failed to create gallery item.");
        }

        done += 1;
        setStatusAtIndex(index, "done");
      } catch (caughtError) {
        failed += 1;
        setStatusAtIndex(index, "error");
        console.error(`[gallery upload] ${file.name}:`, caughtError);
      }
    }

    setSummary({ done, failed });
    setUploading(false);
    router.refresh();
  };

  const handleVideoSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!videoEventLabel.trim() || !videoUrl.trim()) {
      setError("Please provide an event label and a YouTube embed URL.");
      return;
    }

    try {
      const response = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: null,
          event_label: videoEventLabel.trim(),
          type: "video",
          url: videoUrl.trim(),
          thumbnail_url: null,
          caption: videoCaption.trim(),
          display_order: 0,
        }),
      });

      if (!response.ok) {
        const responseError = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(responseError?.error ?? "Failed to add video.");
      }

      setVideoEventLabel("");
      setVideoUrl("");
      setVideoCaption("");
      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to add video.";
      setError(message);
    }
  };

  const showBatchList = batch !== null;

  return (
    <section className="admin-form">
      <form onSubmit={handleImageUpload} style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
        <span className="admin-section-label admin-form-section">Upload Images</span>

        <div>
          <label htmlFor="eventLabel" className="admin-label">
            Link to Event (optional)
          </label>
          <input
            id="eventLabel"
            type="text"
            value={eventLabel}
            onChange={(event) => setEventLabel(event.target.value)}
            className="admin-input"
            placeholder="Ignition 1.0"
            disabled={uploading}
          />
          <p className="admin-hint">Leave empty to file the batch under &quot;General&quot;</p>
        </div>

        <div>
          <label htmlFor="eventId" className="admin-label">
            Event ID (optional)
          </label>
          <input
            id="eventId"
            type="text"
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            className="admin-input"
            placeholder="Paste event ID"
            disabled={uploading}
          />
          <p className="admin-hint">Paste event ID from events table for filtering</p>
        </div>

        {!showBatchList && (
          <div>
            <span className="admin-label">Images</span>
            <FileUploadField
              id="galleryFiles"
              accept="image/*"
              multiple
              files={files}
              onFilesChange={handleFilesChange}
              hint="JPG or PNG · multiple files supported"
              uploading={uploading}
            />
            {files.length > 0 && (
              <p className="mono" style={{ marginTop: "0.5rem", fontSize: "0.65rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                {files.length} {files.length === 1 ? "FILE" : "FILES"} SELECTED
              </p>
            )}
          </div>
        )}

        {!showBatchList && files.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`}>
                <label htmlFor={`caption-${index}`} className="admin-label">
                  Caption · {file.name}
                </label>
                <input
                  id={`caption-${index}`}
                  type="text"
                  value={captions[index] ?? ""}
                  onChange={(event) => updateCaptionAtIndex(index, event.target.value)}
                  className="admin-input"
                  placeholder="Caption (optional)"
                />
              </div>
            ))}
          </div>
        )}

        {showBatchList && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {batch.map((file, index) => {
              const status = statuses[index] ?? "queued";
              return (
                <li
                  key={`${file.name}-${index}`}
                  className="mono"
                  style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.7rem", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)", paddingBottom: "0.35rem" }}
                >
                  {/* minWidth 0: flex children refuse to shrink below content width,
                      so long filenames would force the page wide on phones */}
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                    {file.name}
                  </span>
                  <span style={{ flexShrink: 0, textTransform: "uppercase", color: STATUS_COLOR[status] }}>
                    {status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {summary && (
          <p className="mono" style={{ fontSize: "0.75rem", letterSpacing: "0.16em", textTransform: "uppercase", color: summary.failed > 0 ? "var(--error)" : "var(--gold)" }}>
            {summary.done} UPLOADED · {summary.failed} FAILED
          </p>
        )}

        <div className="admin-form-actions">
          {summary ? (
            <button type="button" onClick={resetImageForm} className="btn-outline">
              DONE
            </button>
          ) : (
            <button type="submit" disabled={uploading} className="btn-primary" style={{ opacity: uploading ? 0.6 : 1 }}>
              {uploading ? "UPLOADING..." : "UPLOAD"}
            </button>
          )}
        </div>
      </form>

      <form onSubmit={handleVideoSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.4rem", marginTop: "1.4rem" }}>
        <span className="admin-section-label admin-form-section">Add YouTube Video</span>

        <div>
          <label htmlFor="videoEventLabel" className="admin-label">
            Event Label
          </label>
          <input
            id="videoEventLabel"
            type="text"
            value={videoEventLabel}
            onChange={(event) => setVideoEventLabel(event.target.value)}
            className="admin-input"
          />
        </div>

        <div>
          <label htmlFor="videoUrl" className="admin-label">
            YouTube Embed URL
          </label>
          <input
            id="videoUrl"
            type="url"
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            className="admin-input"
            placeholder="https://www.youtube.com/embed/VIDEO_ID"
          />
          <p className="admin-hint">Format: https://www.youtube.com/embed/VIDEO_ID</p>
        </div>

        <div>
          <label htmlFor="videoCaption" className="admin-label">
            Caption
          </label>
          <input
            id="videoCaption"
            type="text"
            value={videoCaption}
            onChange={(event) => setVideoCaption(event.target.value)}
            className="admin-input"
          />
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="btn-primary">
            ADD VIDEO
          </button>
        </div>
      </form>

      {error && (
        <p className="admin-error" style={{ marginTop: "1.4rem" }}>
          {error}
        </p>
      )}
    </section>
  );
}
