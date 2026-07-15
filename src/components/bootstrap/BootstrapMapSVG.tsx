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
}

// Geometry traced from bootstrap_references/googlemaps.png + googleearth.png
// (S27). Campus drawn with its NE-SW axis nearly horizontal so the corridor
// (where all stalls sit) runs left-to-right; real north points up-right.
// Labels rotate(-10) to follow the drawn diagonal - the stall position data
// is nearly flat in y, so a steeper tilt would contradict the dots.
export default function BootstrapMapSVG({ stalls, onClose, inline = false }: Props) {
  const W = 1000, H = 700;

  const label = (x: number, y: number, text: string, size = 10, fill = "#444") => (
    <text x={x} y={y} fill={fill} fontFamily="var(--font-mono)" fontSize={size}
      textAnchor="middle" letterSpacing="2" transform={`rotate(-10 ${x} ${y})`}>
      {text}
    </text>
  );

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

      {/* Map - scrollable on very small screens */}
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: "320px", display: "block" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* subtle rooftop solar-panel grid, angled with the campus */}
            <pattern id="solar" width="26" height="20" patternUnits="userSpaceOnUse"
              patternTransform="rotate(-10)">
              <rect x="1" y="1" width="22" height="16" fill="none"
                stroke="#1e2a1e" strokeWidth="0.6" opacity="0.4" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width={W} height={H} fill="#0d0d0d" />

          {/* MECHANICAL BLOCK - large solar-roofed block, left ~35% of campus */}
          <polygon points="110,320 430,265 465,540 145,595"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          <polygon points="110,320 430,265 465,540 145,595" fill="url(#solar)" />
          {label(287, 440, "MECHANICAL BLOCK")}

          {/* MAIN ACADEMIC BLOCK - spine along the corridor + three wings
              pointing away from it (rough E shape from above) */}
          <polygon points="439,236 854,169 865,238 450,305"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          <polygon points="415,88 504,74 528,222 439,236"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          <polygon points="578,62 667,48 691,196 602,210"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          <polygon points="741,35 830,21 854,169 765,183"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          <polygon points="439,236 854,169 865,238 450,305" fill="url(#solar)" />
          <polygon points="415,88 504,74 528,222 439,236" fill="url(#solar)" />
          <polygon points="578,62 667,48 691,196 602,210" fill="url(#solar)" />
          <polygon points="741,35 830,21 854,169 765,183" fill="url(#solar)" />
          {label(650, 243, "MAIN ACADEMIC BLOCK")}

          {/* AMPHITHEATER - curved band on the main block's NE corner,
              opening toward the campus interior (SW) */}
          <path d="M 820,20 A 160 160 0 0 1 980,180 L 920,180 A 100 100 0 0 0 820,80 Z"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          <text x="908" y="93" fill="#444" fontFamily="var(--font-mono)" fontSize="9"
            textAnchor="middle" letterSpacing="2" transform="rotate(40 908 93)">
            AMPH
          </text>

          {/* PESU LIBRARY - standalone, in the open area between the blocks */}
          <polygon points="505,435 595,420 610,485 520,500"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          {label(557, 468, "LIBRARY", 9, "#555")}

          {/* KUKA INDIA - small separate building past the corridor's SE end */}
          <polygon points="790,400 880,385 895,455 805,470"
            fill="#161616" stroke="#2a2a2a" strokeWidth="1.5" />
          {label(843, 437, "KUKA", 9)}

          {/* BOOTSTRAP ZONE - the open corridor between the two blocks */}
          <polygon points="300,340 740,270 790,390 350,460"
            fill="rgba(239,93,8,0.07)"
            stroke="rgba(239,93,8,0.25)"
            strokeWidth="1.5"
            strokeDasharray="6,4"
          />
          <text x="430" y="325" fill="rgba(239,93,8,0.4)"
            fontFamily="var(--font-mono)" fontSize="11"
            textAnchor="middle" letterSpacing="3"
            transform="rotate(-10 430 325)">
            BOOTSTRAP ZONE
          </text>

          {/* PESU ECC Main Rd along the south edge */}
          <line x1="30" y1="650" x2="970" y2="612" stroke="#222"
            strokeWidth="1.5" strokeDasharray="10,8" />
          <text x="500" y="678" fill="#333" fontFamily="var(--font-mono)"
            fontSize="9" textAnchor="middle" letterSpacing="2">
            PESU ECC MAIN RD
          </text>

          {/* Compass - real north points up-right of the drawn campus */}
          <g transform="translate(70, 70)">
            <circle cx="0" cy="0" r="18" fill="#161616" stroke="#2a2a2a" strokeWidth="1" />
            <g transform="rotate(25)">
              <line x1="0" y1="6" x2="0" y2="-8" stroke="#555" strokeWidth="1" />
              <path d="M -3,-5 L 0,-11 L 3,-5 Z" fill="#555" />
            </g>
            <text x="0" y="32" fill="#555" fontFamily="var(--font-mono)"
              fontSize="9" textAnchor="middle">N</text>
          </g>

          {/* === STALL DOTS === */}
          {stalls.filter(s => s.map_x != null && s.map_y != null).map(s => {
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
                {/* Label */}
                <text x={cx} y={cy + 22}
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
