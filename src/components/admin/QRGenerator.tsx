"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { SITE_URL, QR_ROUTES } from "@/types/routes";

// Same R2 logo the check-in QR embeds (CheckinQROverlay). NEXT_PUBLIC_* is inlined
// at build time; imageSettings falls back to undefined when it is unset, exactly as
// that component does, so a missing env var yields a plain QR rather than a broken
// image in the middle of one.
const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
const R2_LOGO = `${R2_BASE}/icons/logo.png`;

/** Export size for the PNG. The source is vector, so this is a free choice --
 *  1024 is large enough to paste into a slide without softening. */
const PNG_SIZE = 1024;

/** S76F: `/bootstrap/feedback` -> `qr-bootstrap-feedback`, `/` -> `qr-home`.
 *  Derived from the selected route so a folder of saved codes is self-labelling. */
function filenameFor(path: string): string {
  return `qr-${path.replace(/^\/+|\/+$/g, "").replace(/\//g, "-") || "home"}`;
}

/** Shared by the three action buttons so they stay visually identical. 44px min
 *  height is the existing touch target -- this page is used on a phone. */
const actionButton: React.CSSProperties = {
  minHeight: "44px",
  padding: "0.5rem 1.25rem",
  fontSize: "0.75rem",
  cursor: "pointer",
};

/** Same temporary-anchor pattern as downloadTemplate() in BulkImportTeam.tsx. */
function saveBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

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
  const [logoSrc, setLogoSrc] = useState(R2_LOGO);
  const plateRef = useRef<HTMLDivElement>(null);

  const url = new URL(path, SITE_URL).toString();

  // S76F: inline the logo as a data URI so a downloaded file is self-contained.
  // An <img> rendering an SVG does not load EXTERNAL references, so a PNG
  // exported from a logo-by-URL QR would silently lose its centre, and a printed
  // SVG would need network access to show it. If R2 blocks the read we keep the
  // plain URL: excavate leaves a blank centre and the code still scans, which is
  // the right way to degrade.
  useEffect(() => {
    if (!R2_BASE) return;
    let cancelled = false;

    fetch(R2_LOGO)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }),
      )
      .then((dataUri) => {
        if (!cancelled) setLogoSrc(dataUri);
      })
      .catch(() => {
        // keep R2_LOGO
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked (insecure context) - the URL is printed below anyway
    }
  }

  /** The rendered <svg> is the source of truth for both formats -- reading it
   *  back beats re-deriving the code, so a download can never drift from what is
   *  on screen. XMLSerializer emits the xmlns a standalone file needs; outerHTML
   *  does not guarantee it. */
  function serializeQR(): string | null {
    const svg = plateRef.current?.querySelector("svg");
    return svg ? new XMLSerializer().serializeToString(svg) : null;
  }

  function downloadSVG() {
    const markup = serializeQR();
    if (!markup) return;
    saveBlob(
      new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
      `${filenameFor(path)}.svg`,
    );
  }

  // SVG -> <img> -> offscreen canvas -> PNG. qrcode.react gives us no canvas
  // here, and mounting a second hidden QRCodeCanvas purely to export would be
  // worse: its renderer draws the R2 logo through a cross-origin <img>, which
  // taints the canvas and makes toBlob throw. Rasterising the already-inlined
  // SVG has no cross-origin surface at all.
  function downloadPNG() {
    const markup = serializeQR();
    if (!markup) return;

    const svgUrl = URL.createObjectURL(
      new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
    );
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = PNG_SIZE;
      canvas.height = PNG_SIZE;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Reproduce the light quiet zone the on-screen plate has (20px around a
        // 240px code). A QR without it scans badly against a dark slide.
        const pad = Math.round(PNG_SIZE * (20 / 280));
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(0, 0, PNG_SIZE, PNG_SIZE);
        ctx.drawImage(img, pad, pad, PNG_SIZE - pad * 2, PNG_SIZE - pad * 2);
        canvas.toBlob((blob) => {
          if (blob) saveBlob(blob, `${filenameFor(path)}.png`);
        }, "image/png");
      }

      URL.revokeObjectURL(svgUrl);
    };

    img.onerror = () => URL.revokeObjectURL(svgUrl);
    img.src = svgUrl;
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
        <div ref={plateRef} style={{ background: "#f0f0f0", padding: "20px", flexShrink: 0 }}>
          <QRCodeSVG
            value={url}
            size={240}
            bgColor="#f0f0f0"
            fgColor="#0a0a0a"
            imageSettings={
              R2_BASE ? { src: logoSrc, height: 42, width: 42, excavate: true } : undefined
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
          <div
            style={{
              marginTop: "1rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <button className="btn-outline" onClick={copyUrl} style={actionButton}>
              {copied ? "COPIED!" : "COPY URL"}
            </button>
            <button className="btn-outline" onClick={downloadSVG} style={actionButton}>
              DOWNLOAD SVG
            </button>
            <button className="btn-outline" onClick={downloadPNG} style={actionButton}>
              DOWNLOAD PNG
            </button>
          </div>
          <p
            style={{
              marginTop: "1rem",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.7rem",
              lineHeight: 1.8,
              color: "var(--text-muted)",
            }}
          >
            For printing, use SVG: it is vector, so it stays sharp at any size.
            PNG is a {PNG_SIZE}px image, fine for a slide or a chat message.
            Print at 2cm or larger so phone cameras can lock on. On desktop you
            can still right-click the code to save it.
          </p>
        </div>
      </div>
    </div>
  );
}
