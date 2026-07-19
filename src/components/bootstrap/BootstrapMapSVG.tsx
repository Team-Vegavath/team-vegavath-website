"use client";
import { BS } from "./StallCard";

interface MapStall {
  id: string;
  stall_name: string;
  status: "free" | "occupied" | "queued";
  map_x: number | null;
  map_y: number | null;
}

interface Props {
  stalls: MapStall[];
  onClose: () => void;
  // inline: render inside a position:relative wrapper (admin preview) instead
  // of a full-viewport takeover - position:fixed escapes any wrapper, so the
  // preview mode has to swap to absolute and drop the header
  inline?: boolean;
  // S33 pin-drop mode: while editingStallId is set, a click on the map
  // reports the position (as % of the SVG box) instead of doing nothing
  editingStallId?: string | null;
  onPositionSet?: (stallId: string, x: number, y: number) => void;
}

// Geometry measured from bootstrap_references/college1.png (S31): the image
// is pre-rotated so the Bootstrap road runs horizontal, and the viewBox
// matches its 1024x419 pixel size exactly - stall map_x/map_y percentages
// (extracted from the same image's annotation blobs) land on the drawing
// with zero conversion error. Only the 6 ground-truthed structures are drawn.
export default function BootstrapMapSVG({
  stalls,
  onClose,
  inline = false,
  editingStallId = null,
  onPositionSet,
}: Props) {
  const W = 1024, H = 419;

  const editingStall = editingStallId
    ? stalls.find((s) => s.id === editingStallId) ?? null
    : null;

  // % of the rendered element - the svg's height is intrinsic (width 100%,
  // viewBox ratio), so element box === viewBox and no letterbox offset creeps in
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!editingStallId || !onPositionSet) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
    const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));
    onPositionSet(editingStallId, x, y);
  }

  const label = (x: number, y: number, text: string, size = 10, fill = "#444") => (
    <text x={x} y={y} fill={fill} fontFamily="var(--font-mono)" fontSize={size}
      textAnchor="middle" letterSpacing="2">
      {text}
    </text>
  );

  const positioned = stalls.filter(s => s.map_x != null && s.map_y != null);

  return (
    <div style={{
      position: inline ? "absolute" : "fixed", inset: 0, zIndex: inline ? 1 : 100,
      background: BS.bg,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      {!inline && (
        <div style={{
          padding: "16px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: `1px solid ${BS.border}`,
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "var(--font-chakra)", fontSize: "18px",
            color: BS.text, letterSpacing: "0.06em" }}>STALL MAP</span>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: BS.muted,
            fontSize: "26px", cursor: "pointer", lineHeight: 1,
          }}>x</button>
        </div>
      )}

      {/* Pin-drop banner - only while a stall is being placed */}
      {editingStall && (
        <div
          style={{
            padding: "8px 20px",
            background: `${BS.accent}1f`,
            borderBottom: `1px solid ${BS.accent}`,
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: BS.accent,
            flexShrink: 0,
          }}
        >
          Click to place: {editingStall.stall_name}
        </div>
      )}

      {/* Map - scrollable on very small screens */}
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{
            width: "100%",
            minWidth: "320px",
            display: "block",
            cursor: editingStallId ? "crosshair" : "default",
          }}
          onClick={handleSvgClick}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background */}
          <rect width={W} height={H} fill="#0d0d0d" />

          {/* PARKING APRON - west open ground, go-kart showcase lives here */}
          <polygon points="60,45 185,48 228,200 292,330 130,340 88,175"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          {label(165, 195, "PARKING", 9)}

          {/* CLASSROOM WING 1 (Mech sessions) - west solar-roofed wing */}
          <polygon points="428,65 588,58 592,198 432,203"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          {label(510, 135, "CLASSROOM", 9)}

          {/* CLASSROOM WING 2 (Main sessions) - east solar-roofed wing */}
          <polygon points="592,32 744,26 748,138 596,144"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          {label(668, 90, "CLASSROOM", 9)}

          {/* CLUB ROOM - section of the mechanical block, engines stall */}
          <polygon points="515,325 610,318 615,402 520,408"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          {label(565, 368, "CLUB ROOM", 8)}

          {/* AVIONS - separate building past the corridor's east end
              (S32: was mislabeled KUKA; the KUKA stall sits in the corridor) */}
          <polygon points="858,272 1015,247 1022,355 868,378"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          {label(940, 318, "AVIONS", 9)}

          {/* BOOTSTRAP ZONE - the road corridor between the blocks; the notch
              at x 855-995 skirts the main block's protruding east end */}
          <polygon points="250,220 590,205 625,150 855,125 865,178 985,170 995,118 1024,114 1024,240 1015,247 858,272 840,242 395,268 255,335"
            fill="rgba(239,93,8,0.08)"
            stroke="rgba(239,93,8,0.3)"
            strokeWidth="1.5"
            strokeDasharray="6,4"
          />
          <text x="360" y="248" fill="rgba(239,93,8,0.4)"
            fontFamily="var(--font-mono)" fontSize="11"
            textAnchor="middle" letterSpacing="3">
            BOOTSTRAP ZONE
          </text>

          {/* === STALL DOTS === */}
          {positioned.map((s, i) => {
            const cx = (s.map_x! / 100) * W;
            const cy = (s.map_y! / 100) * H;
            const color = s.status === "free" ? BS.free
              : s.status === "occupied" ? BS.occupied
              : BS.queued;
            return (
              <g key={s.id}>
                {/* Glow ring */}
                <circle cx={cx} cy={cy} r="12"
                  fill={color} opacity="0.18" />
                {/* Dot */}
                <circle cx={cx} cy={cy} r="7"
                  fill={color}
                  stroke="rgba(255,255,255,0.7)" strokeWidth="1.5"
                />
                {/* Label - alternate above/below so the tightly packed
                    corridor stalls don't overwrite each other */}
                <text x={cx} y={i % 2 === 0 ? cy + 22 : cy - 15}
                  fill={BS.text} fontFamily="var(--font-mono)"
                  fontSize="9" textAnchor="middle"
                  style={{ textShadow: "0 1px 3px #000" }}>
                  {s.stall_name.length > 12
                    ? s.stall_name.slice(0, 11) + "…"
                    : s.stall_name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        padding: "10px 20px",
        borderTop: `1px solid ${BS.border}`,
        display: "flex", gap: "20px", flexShrink: 0,
      }}>
        {([["free", BS.free, "FREE"], ["occupied", BS.occupied, "OCCUPIED"],
           ["queued", BS.queued, "QUEUED"]] as const).map(([, color, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%",
              background: color }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px",
              color: BS.muted }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
