"use client";

import { useState } from "react";

/**
 * S73K: "Export to Google Sheets" as a sibling of an existing CSV download.
 *
 * One component for both surfaces (applications, volunteer pool) rather than a
 * copy per page -- the endpoint is the only thing that differs. The CSV link
 * beside it stays a plain <a download> and is completely independent: this
 * button failing, or the integration being unconfigured, changes nothing about
 * it.
 *
 * A POST, so it cannot be a link: creating a Drive file is not a navigation.
 */
export default function GoogleSheetsExportButton({ endpoint }: { endpoint: string }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const controlStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    background: "transparent",
    border: "1px solid var(--border)",
    padding: "6px 14px",
    textDecoration: "none",
    cursor: busy ? "not-allowed" : "pointer",
  };

  async function run() {
    setBusy(true);
    setError("");
    setUrl("");
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Export failed");
        return;
      }
      setUrl(data?.url ?? "");
    } catch {
      setError("Export failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => void run()} disabled={busy} style={controlStyle}>
        {busy ? "EXPORTING..." : "EXPORT TO GOOGLE SHEETS"}
      </button>
      {url && (
        // target=_blank so the admin does not lose the page they exported from.
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...controlStyle, color: "var(--accent)", cursor: "pointer" }}
        >
          OPEN SHEET
        </a>
      )}
      {error && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            color: "var(--error)",
            maxWidth: "32rem",
            lineHeight: 1.5,
          }}
        >
          {error}
        </span>
      )}
    </span>
  );
}
