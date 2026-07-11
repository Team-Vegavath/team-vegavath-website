"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const DOMAINS = [
  {
    abbr: "COD",
    name: "Coding",
    description:
      "Embedded systems, automotive software, robotics code, internal tools, full-stack web. We build everything the team runs on.",
  },
  {
    abbr: "AUT",
    name: "Automotives",
    description:
      "Chassis, drivetrain, suspension, electronics. We design and build the kart from the ground up and take it to the track.",
  },
  {
    abbr: "S&F",
    name: "Sponsorship & Finance",
    description:
      "The fuel behind everything. We build industry partnerships and manage the resources that keep the club running.",
  },
  {
    abbr: "ROB",
    name: "Robotics",
    description: "Autonomous systems, sensors, and control logic. We build machines that think and move.",
  },
  {
    abbr: "OPS",
    name: "Operations",
    description: "Logistics, planning, and execution. We make events happen from concept to cleanup.",
  },
  {
    abbr: "SOC",
    name: "Social Media",
    description: "The club's voice. Photography, content, and the story of everything we build.",
  },
] as const;

export function DomainGrid() {
  const [activeDomain, setActiveDomain] = useState<(typeof DOMAINS)[number] | null>(null);

  useEffect(() => {
    if (!activeDomain) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveDomain(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeDomain]);

  useEffect(() => {
    document.body.style.overflow = activeDomain ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeDomain]);

  return (
    <div>
      <div className="domain-grid">
        {DOMAINS.map((domain) => (
          <div
            key={domain.name}
            className="domain-tile"
            role="button"
            tabIndex={0}
            onClick={() => setActiveDomain(domain)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActiveDomain(domain);
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <span className="domain-letter" aria-hidden="true">
              {domain.abbr}
            </span>
            <span className="domain-name">{domain.name}</span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {activeDomain && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setActiveDomain(null)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 50,
                background: "rgba(0,0,0,0.72)",
                cursor: "pointer",
              }}
            />
            <motion.div
              key="card"
              role="dialog"
              aria-modal="true"
              aria-label={activeDomain.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                position: "fixed",
                zIndex: 51,
                top: "50%",
                left: "50%",
                /* x/y instead of style.transform: framer-motion owns the
                   transform while animating scale and would drop a raw
                   translate(-50%, -50%). */
                x: "-50%",
                y: "-50%",
                width: "min(480px, 90vw)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-strong)",
                padding: "2rem",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-0.5rem",
                  right: "1rem",
                  fontFamily: "var(--font-orbitron)",
                  fontSize: "clamp(3rem, 10vw, 5rem)",
                  fontWeight: 900,
                  color: "var(--accent)",
                  opacity: 0.1,
                  pointerEvents: "none",
                  userSelect: "none",
                  lineHeight: 1,
                }}
              >
                {activeDomain.abbr}
              </div>

              <button
                onClick={() => setActiveDomain(null)}
                aria-label="Close"
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: "1.25rem",
                  lineHeight: 1,
                  padding: "0.25rem",
                }}
              >
                ×
              </button>

              <h3
                style={{
                  fontFamily: "var(--font-chakra)",
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "1rem",
                }}
              >
                {activeDomain.name}
              </h3>

              <p
                style={{
                  fontFamily: "var(--font-space)",
                  fontSize: "0.95rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {activeDomain.description}
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
