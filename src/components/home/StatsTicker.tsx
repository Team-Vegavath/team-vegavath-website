"use client";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NumberTicker } from "@/components/ui/number-ticker";

const STATS = [
  { value: "2", label: "MAJOR EVENTS" },
  { value: "47", label: "MEMBERS" },
  { value: "6", label: "DOMAINS" },
] as const;

export function StatsTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % STATS.length), 3000);
    return () => clearInterval(t);
  }, []);

  // index is always kept in [0, STATS.length) by the modulo in setInterval
  const stat = STATS[index] ?? STATS[0];

  return (
    <div style={{
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
      padding: "0.6rem 0",
      overflow: "hidden",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "0.75rem",
      height: "4rem",
    }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}
        >
          {/* S58: NumberTicker counts up on view. It sits INSIDE AnimatePresence,
              so the AnimatePresence key remounts it on every rotation and it
              re-counts each cycle -- deliberate for a ticker, and it keeps the
              value and the label swapping as one unit. Every STATS value is a
              plain integer string; a non-numeric one (e.g. "6+") would need to
              stay a plain span. */}
          <NumberTicker
            value={Number(stat.value)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              color: "var(--accent)",
              fontWeight: 700,
            }}
          />
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 1.5vw, 0.85rem)",
            color: "var(--text-secondary)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}>
            {stat.label}
          </span>
        </motion.div>
      </AnimatePresence>
      {/* Progress dots */}
      <div style={{ display: "flex", gap: "4px", marginLeft: "0.75rem" }}>
        {STATS.map((_, i) => (
          <div key={i} style={{
            width: "5px", height: "5px",
            background: i === index ? "var(--accent)" : "var(--text-muted)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>
    </div>
  );
}
