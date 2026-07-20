"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { BS } from "./StallCard";

// Read the R2 public base from env (same var as src/lib/r2.ts); the club logo
// sits at /icons/logo.png, matching Navbar/Footer. NEXT_PUBLIC_* is inlined
// into the client bundle at build time.
const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
const R2_LOGO = `${R2_BASE}/icons/logo.png`;

interface Props {
  checkinUrl: string;
}

// S36: replaces the raw check-in URL on the lead dashboard with a copy button
// and a full-screen QR overlay students can scan.
export default function CheckinQROverlay({ checkinUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(checkinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked (insecure context) - the QR overlay is the fallback
    }
  }

  return (
    <>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={copyLink}
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            letterSpacing: "0.1em",
            padding: "9px 14px",
            background: copied ? BS.free : "transparent",
            color: copied ? "#000" : BS.muted,
            border: `1px solid ${copied ? BS.free : BS.border}`,
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {copied ? "COPIED!" : "COPY LINK"}
        </button>
        <button
          onClick={() => setOpen(true)}
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            letterSpacing: "0.1em",
            padding: "9px 14px",
            background: "transparent",
            color: BS.accent,
            border: `1px solid ${BS.accent}`,
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          SHOW QR
        </button>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(10,10,10,0.97)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            padding: "24px",
          }}
        >
          {/* stop taps on the card from closing the overlay */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#f0f0f0",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <QRCodeSVG
              value={checkinUrl}
              size={280}
              bgColor="#f0f0f0"
              fgColor="#0a0a0a"
              imageSettings={
                R2_BASE
                  ? { src: R2_LOGO, height: 48, width: 48, excavate: true }
                  : undefined
              }
            />
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "11px",
                color: "#333",
                letterSpacing: "0.1em",
                textAlign: "center",
                maxWidth: "280px",
                wordBreak: "break-all",
              }}
            >
              {checkinUrl}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "13px",
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              letterSpacing: "0.1em",
            }}
          >
            TAP ANYWHERE TO CLOSE
          </button>
        </div>
      )}
    </>
  );
}
