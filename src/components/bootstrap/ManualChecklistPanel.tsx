"use client";

import type { GroupStallChecklistRow } from "@/lib/services/bootstrap";
import { BS } from "./StallCard";

/**
 * S73G: the manual checklist toggle list, shared by the lead dashboard and the
 * admin panel. Purely presentational -- both consumers own their own fetching,
 * because their endpoints differ (cookie-resolved group vs explicit group id),
 * but the control itself is written once.
 *
 * Type-only import of the row shape, so no service value crosses into the
 * client bundle.
 */
export default function ManualChecklistPanel({
  title,
  subtitle,
  stalls,
  loading,
  busyStallId,
  error,
  onToggle,
  onClose,
}: {
  title: string;
  subtitle: string;
  stalls: GroupStallChecklistRow[];
  loading: boolean;
  busyStallId: string | null;
  error: string | null;
  onToggle: (stallId: string, visited: boolean) => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(10,10,10,0.97)",
        padding: "24px 16px",
        overflowY: "auto",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="mx-auto" style={{ maxWidth: "32rem" }}>
        <div
          style={{
            fontFamily: "var(--font-chakra), sans-serif",
            fontWeight: 700,
            fontSize: "1.35rem",
            textTransform: "uppercase",
            color: BS.text,
          }}
        >
          {title}
        </div>
        {/* The label that keeps this from becoming the default way people record
            visits. The stall volunteer's occupy/release flow stays the source of
            truth for live occupancy; this only patches what it missed. */}
        <p
          style={{
            marginTop: "8px",
            marginBottom: 0,
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            letterSpacing: "0.06em",
            lineHeight: 1.7,
            color: BS.muted,
          }}
        >
          {subtitle}
        </p>

        {error && (
          <div
            style={{
              marginTop: "16px",
              background: BS.elevated,
              border: `1px solid ${BS.danger}`,
              color: BS.danger,
              padding: "12px 14px",
              fontFamily: "var(--font-chakra), sans-serif",
              fontSize: "0.85rem",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: "16px", border: `1px solid ${BS.border}` }}>
          {loading ? (
            <p style={{ padding: "16px", color: BS.muted, margin: 0 }}>Loading...</p>
          ) : stalls.length === 0 ? (
            <p style={{ padding: "16px", color: BS.muted, margin: 0 }}>
              This session has no stalls.
            </p>
          ) : (
            stalls.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  background: BS.surface,
                  borderTop: i === 0 ? "none" : `1px solid ${BS.border}`,
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    flexShrink: 0,
                    background: s.visited ? BS.free : "transparent",
                    border: `1px solid ${s.visited ? BS.free : BS.borderStrong}`,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontFamily: "var(--font-chakra), sans-serif",
                    fontSize: "0.95rem",
                    color: s.visited ? BS.text : BS.muted,
                  }}
                >
                  {s.stall_name}
                  {/* An open visit cannot be cleared through this path, so say so
                      before the tap rather than only in the error afterwards. */}
                  {s.is_open && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: "0.65rem",
                        letterSpacing: "0.08em",
                        color: BS.occupied,
                      }}
                    >
                      HERE NOW
                    </span>
                  )}
                </span>
                <button
                  onClick={() => onToggle(s.id, !s.visited)}
                  disabled={busyStallId === s.id}
                  style={{
                    minHeight: "44px",
                    minWidth: "5.5rem",
                    padding: "0 12px",
                    background: "transparent",
                    border: `1px solid ${s.visited ? BS.danger : BS.free}`,
                    color: s.visited ? BS.danger : BS.free,
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    cursor: busyStallId === s.id ? "default" : "pointer",
                    opacity: busyStallId === s.id ? 0.5 : 1,
                  }}
                >
                  {busyStallId === s.id ? "..." : s.visited ? "UNMARK" : "MARK DONE"}
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            width: "100%",
            minHeight: "48px",
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            letterSpacing: "0.1em",
            cursor: "pointer",
          }}
        >
          TAP ANYWHERE TO CLOSE
        </button>
      </div>
    </div>
  );
}
