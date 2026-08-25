"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { SITE_URL, QR_ROUTES } from "@/types/routes";

// Same R2 logo the check-in QR embeds (CheckinQROverlay). NEXT_PUBLIC_* is inlined
// at build time; imageSettings falls back to undefined when it is unset, exactly as
// that component does, so a missing env var yields a plain QR rather than a broken
// image in the middle of one.
const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
const R2_LOGO = `${R2_BASE}/icons/logo.png`;

/**
 * S72C (Section I): QR codes for the site's public route pages.
 *
 * A dropdown over the shared QR_ROUTES list and nothing else. No free-text
 * field on purpose: the product rule is "route pages only, no in-page fragments,
 * no internal-only content", and a fixed dropdown makes that structural. There is
 * no input to validate, so no validation exists to drift out of sync with what
 * counts as internal.
 *
 * Read-only - it renders a QR from a constant and writes nothing, so viewers get
 * it like every other read surface in the panel.
 */
export default function QRGenerator() {
  const [path, setPath] = useState(QR_ROUTES[0]?.path ?? "/");
  const [copied, setCopied] = useState(false);

  const url = new URL(path, SITE_URL).toString();

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked (insecure context) - the URL is printed below anyway
    }
  }

  return (
    <div style={{ maxWidth: "40rem" }}>
      <label
        htmlFor="qr-route"
        style={{
          display: "block",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "0.7rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: "0.5rem",
        }}
      >
        Page
      </label>
      <select
        id="qr-route"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        style={{
          width: "100%",
          minHeight: "44px",
          padding: "0 10px",
          background: "var(--bg-base)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "0.85rem",
          cursor: "pointer",
        }}
      >
        {QR_ROUTES.map((r) => (
          <option key={r.path} value={r.path}>
            {r.path}
          </option>
        ))}
      </select>

      <div
        style={{
          marginTop: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "1.5rem",
        }}
      >
        {/* light plate behind the code: a QR needs a light quiet zone to scan
            reliably, and the admin panel is dark */}
        <div style={{ background: "#f0f0f0", padding: "20px", flexShrink: 0 }}>
          <QRCodeSVG
            value={url}
            size={240}
            bgColor="#f0f0f0"
            fgColor="#0a0a0a"
            imageSettings={
              R2_BASE ? { src: R2_LOGO, height: 42, width: 42, excavate: true } : undefined
            }
          />
        </div>

        <div style={{ minWidth: "12rem" }}>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              wordBreak: "break-all",
              lineHeight: 1.7,
            }}
          >
            {url}
          </div>
          <button
            className="btn-outline"
            onClick={copyUrl}
            style={{
              marginTop: "1rem",
              minHeight: "44px",
              padding: "0.5rem 1.25rem",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            {copied ? "COPIED!" : "COPY URL"}
          </button>
          <p
            style={{
              marginTop: "1rem",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.7rem",
              lineHeight: 1.8,
              color: "var(--text-muted)",
            }}
          >
            Right-click the code to save it. Print at 2cm or larger so phone
            cameras can lock on.
          </p>
        </div>
      </div>
    </div>
  );
}
