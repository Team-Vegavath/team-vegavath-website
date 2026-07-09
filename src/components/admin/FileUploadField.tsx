"use client";

import { useRef, useState, type DragEvent } from "react";

interface FileUploadFieldProps {
  id: string;
  accept: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  multiple?: boolean;
  /** Existing image URL in edit mode; shown as a small preview until a replacement is picked. */
  currentUrl?: string | null;
  /** Accepted-types / usage hint shown inside the zone. */
  hint?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploadField({
  id,
  accept,
  files,
  onFilesChange,
  multiple = false,
  currentUrl,
  hint,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function acceptFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const picked = Array.from(list);
    onFilesChange(multiple ? [...files, ...picked] : picked.slice(0, 1));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    acceptFiles(event.dataTransfer.files);
  }

  function removeAt(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => acceptFiles(event.target.files)}
        style={{ display: "none" }}
      />

      <div style={{ display: "flex", gap: "0.9rem", alignItems: "stretch" }}>
        {currentUrl && files.length === 0 ? (
          <div className="admin-current-thumb" title="Current image">
            {/* Plain img: R2 URLs + tiny thumbs; next/image adds nothing here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUrl} alt="Current file" />
            <span>
              CURRENT ·<br />
              REPLACE
            </span>
          </div>
        ) : null}

        <div
          className="admin-upload-zone"
          data-drag={dragging}
          role="button"
          tabIndex={0}
          aria-label="Upload file"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{ flex: 1 }}
        >
          DRAG FILE OR CLICK TO UPLOAD
          {hint ? (
            <span style={{ display: "block", marginTop: "0.4rem", fontSize: "0.58rem", color: "var(--text-muted)", textTransform: "none", letterSpacing: "0.08em" }}>
              {hint}
            </span>
          ) : null}
        </div>
      </div>

      {files.length > 0 ? (
        <ul style={{ listStyle: "none", margin: "0.4rem 0 0", padding: 0 }}>
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="admin-file-row">
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
                <span style={{ color: "var(--text-muted)" }}>{formatSize(file.size)}</span>
                <button
                  type="button"
                  className="admin-file-remove"
                  onClick={() => removeAt(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
