"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";

const EXPECTED_HEADER = [
  "name",
  "role",
  "tier",
  "domain",
  "quote",
  "linkedin_url",
  "github_url",
  "display_order",
];

const TEMPLATE_CSV =
  "name,role,tier,domain,quote,linkedin_url,github_url,display_order\n" +
  // "Programming" per the team_members CHECK constraint — "Coding" is only
  // valid for the applications table.
  "Example Name,Member,crew,Programming,,https://linkedin.com/in/example,https://github.com/example,0";

type Status = "idle" | "previewing" | "importing" | "done" | "error";

interface ImportResult {
  inserted: number;
  skipped: number;
  validationErrors: string[];
}

// Display-only mirror of the API's parser so the preview matches what the
// server will actually import (quoted commas and newlines included).
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;

  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(field.trim());
      field = "";
    } else if (ch === "\n") {
      fields.push(field.trim());
      if (fields.some((f) => f !== "")) rows.push(fields);
      fields = [];
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field.trim());
  if (fields.some((f) => f !== "")) rows.push(fields);
  return rows;
}

function truncate(value: string): string {
  return value.length > 30 ? `${value.slice(0, 30)}…` : value;
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vegavath-team-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const monoLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono), monospace",
  fontSize: "0.7rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

export default function BulkImportTeam() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  function reset() {
    setCsvText("");
    setRows([]);
    setResult(null);
    setErrorMsg("");
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function acceptFile(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseCSV(text);

    if (parsed.length < 2) {
      setErrorMsg("File must have a header row and at least one data row.");
      setStatus("error");
      return;
    }

    const header = (parsed[0] ?? []).map((h) => h.toLowerCase());
    if (EXPECTED_HEADER.some((col, i) => header[i] !== col)) {
      setErrorMsg(`Header row must be exactly: ${EXPECTED_HEADER.join(",")}`);
      setStatus("error");
      return;
    }

    setCsvText(text);
    setRows(parsed);
    setStatus("previewing");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void acceptFile(event.dataTransfer.files);
  }

  async function handleImport() {
    setStatus("importing");
    try {
      const res = await fetch("/api/admin/import/team", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: csvText,
      });
      const data = await res.json();

      if (!res.ok) {
        const details = Array.isArray(data.details) ? ` — ${data.details.join(" · ")}` : "";
        setErrorMsg(`${data.error ?? "Import failed"}${details}`);
        setStatus("error");
        return;
      }

      setResult(data as ImportResult);
      setStatus("done");
    } catch {
      setErrorMsg("Network error — import may not have completed.");
      setStatus("error");
    }
  }

  function handleDone() {
    router.push("/admin/team");
    router.refresh();
  }

  const dataRows = rows.slice(1);

  return (
    <section style={{ border: "1px solid var(--border)", padding: "1.5rem", background: "var(--bg-card)" }}>
      <p className="admin-section-label" style={{ marginBottom: "1rem" }}>
        Bulk import
      </p>

      {status === "idle" ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void acceptFile(event.target.files)}
            style={{ display: "none" }}
          />
          <div
            className="admin-upload-zone"
            data-drag={dragging}
            role="button"
            tabIndex={0}
            aria-label="Upload CSV file"
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
          >
            DRAG CSV OR CLICK TO UPLOAD
            <span
              style={{
                display: "block",
                marginTop: "0.4rem",
                fontSize: "0.58rem",
                color: "var(--text-muted)",
                textTransform: "none",
                letterSpacing: "0.08em",
              }}
            >
              name,role,tier,domain,quote,linkedin_url,github_url,display_order
            </span>
          </div>
          <div style={{ marginTop: "0.9rem", display: "flex", gap: "1.5rem", alignItems: "center" }}>
            <button type="button" className="admin-back-link" onClick={downloadTemplate} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
              DOWNLOAD TEMPLATE
            </button>
            <span style={{ ...monoLabel, color: "var(--text-muted)", textTransform: "none", letterSpacing: "0.06em" }}>
              tier: core/crew/legacy · photos are added later via each member&apos;s edit form
            </span>
          </div>
        </>
      ) : null}

      {status === "previewing" ? (
        <>
          <div className="admin-table-wrap" style={{ marginBottom: "0.9rem" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  {EXPECTED_HEADER.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    {EXPECTED_HEADER.map((_, j) => (
                      <td key={j} className="admin-cell-mono" style={{ whiteSpace: "nowrap" }}>
                        {truncate(row[j] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ ...monoLabel, color: "var(--text-muted)", marginBottom: "1.1rem" }}>
            {dataRows.length} rows total{dataRows.length > 10 ? " · showing first 10" : ""}
          </p>
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
            <button type="button" className="btn-primary" onClick={() => void handleImport()} style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}>
              IMPORT {dataRows.length} MEMBERS
            </button>
            <button type="button" className="admin-back-link" onClick={reset} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
              CANCEL
            </button>
          </div>
        </>
      ) : null}

      {status === "importing" ? (
        <p style={{ ...monoLabel, color: "var(--text-secondary)" }}>IMPORTING...</p>
      ) : null}

      {status === "done" && result ? (
        <>
          <p style={{ ...monoLabel, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
            {result.inserted} MEMBERS IMPORTED · {result.skipped} SKIPPED
          </p>
          {result.validationErrors.length > 0 ? (
            <ul style={{ listStyle: "none", margin: "0 0 1rem", padding: 0 }}>
              {result.validationErrors.map((err, i) => (
                <li key={i} style={{ ...monoLabel, textTransform: "none", color: "var(--error)", marginBottom: "0.3rem" }}>
                  {err}
                </li>
              ))}
            </ul>
          ) : null}
          <button type="button" className="btn-primary" onClick={handleDone} style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}>
            DONE
          </button>
        </>
      ) : null}

      {status === "error" ? (
        <>
          <p style={{ ...monoLabel, textTransform: "none", color: "var(--error)", marginBottom: "1rem" }}>
            {errorMsg}
          </p>
          <button type="button" className="btn-outline" onClick={reset} style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}>
            TRY AGAIN
          </button>
        </>
      ) : null}
    </section>
  );
}
