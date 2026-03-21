"use client";

import { useState, useEffect } from "react";

const DOMAINS = [
  { id: "coding", title: "Coding", description: "The backbone of everything we build. From embedded systems and automotive software to autonomous robotics code, internal tools, and full-stack websites — we code it all." },
  { id: "automotives", title: "Automotives", description: "Where ideas turn into machines. We design, build, and fabricate vehicles — from simulations to hands-on assembly." },
  { id: "sponsorship", title: "Sponsorship & Finance", description: "Powering innovation through partnerships. This domain handles budgeting, sponsor relations, and industry collaborations." },
  { id: "robotics", title: "Robotics", description: "Designing intelligence in motion. We build robots combining mechanics, electronics, and software." },
  { id: "operations", title: "Operations", description: "The engine that keeps the club running — permissions, LORs, members, events, and internal workflows." },
  { id: "socialmedia", title: "Social Media", description: "Telling our story to the world. Marketing, content creation, outreach, and showcasing everything Vegavath builds." },
];

export default function HeroDomains() {
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const activeDomain = DOMAINS.find((d) => d.id === active);

  const openModal = (id: string) => {
    setActive(id);
    setTimeout(() => setVisible(true), 10);
  };

  const closeModal = () => {
    setVisible(false);
    setTimeout(() => setActive(null), 250);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="mt-12 flex flex-wrap justify-center gap-4">
        {DOMAINS.map((domain) => (
          <button
            key={domain.id}
            onClick={() => active === domain.id ? closeModal() : openModal(domain.id)}
            className="rounded-full border border-[#EF5D08] bg-[#EF5D08] px-6 py-3 text-base font-semibold text-white transition-all hover:scale-105 hover:bg-[#d44f06]"
          >
            {domain.title}
          </button>
        ))}
      </div>

      {active && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backgroundColor: visible ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0)",
            backdropFilter: visible ? "blur(8px)" : "blur(0px)",
            transition: "background-color 250ms ease, backdrop-filter 250ms ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "32rem",
              backgroundColor: "white",
              borderRadius: "1rem",
              padding: "2.5rem",
              boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(16px)",
              transition: "opacity 250ms ease, transform 250ms ease",
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                fontSize: "1.5rem",
                lineHeight: 1,
                color: "#9ca3af",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              ×
            </button>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#111827", marginBottom: "1rem" }}>
              {activeDomain?.title}
            </h3>
            <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "#4b5563" }}>
              {activeDomain?.description}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
