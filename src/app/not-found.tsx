import Link from "next/link";
import type { Metadata } from "next";

import KartGameWrapper from "@/components/home/KartGameWrapper";

export const metadata: Metadata = {
  title: "404",
};

export default function NotFound() {
  return (
    <main
      className="pattern-speed-lines"
      style={{
        position: "relative",
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        padding: "2rem 1.5rem",
        overflowX: "hidden",
      }}
    >
      {/* Watermark error code. h1 = Orbitron via the global type roles;
          this and the home hero are the only sanctioned Orbitron uses. */}
      <h1
        aria-hidden="true"
        style={{
          /* Pinned to the first viewport (not inset: 0): the page now grows
             past 100svh for the game, and inset: 0 would drag the watermark
             down to the middle of the whole scrollable area. */
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "clamp(80px, 20vw, 160px)",
          lineHeight: 1,
          color: "var(--text-muted)",
          opacity: 0.2,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        404
      </h1>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem", paddingTop: "28vh" }}>
        <span className="sr-only">Error 404</span>
        <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-primary)" }}>
          Page Not Found
        </h2>
        <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
          This page doesn&apos;t exist or has been moved.
        </p>
        <div style={{ marginTop: "1.25rem", display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/" className="btn-primary">
            ← GO HOME
          </Link>
          <Link href="/events" className="btn-outline">
            VIEW EVENTS
          </Link>
        </div>
        <p className="mono" style={{ marginTop: "2rem", fontSize: "0.7rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          VEGAVATH · PESU ECC
        </p>
      </div>

      <div style={{ position: "relative", width: "100%", marginTop: "4rem", paddingBottom: "3rem" }}>
        <p className="mono" style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--text-muted)", textAlign: "center", marginBottom: "1rem", textTransform: "uppercase" }}>
          While you&apos;re here
        </p>
        <KartGameWrapper />
      </div>
    </main>
  );
}
