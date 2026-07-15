"use client";

import { useEffect, useRef } from "react";

/* ────────────────────────────────────────────────────────────
   404 F1 kart game — 2D canvas lane-dodger.
   Pure React + browser APIs; no dependencies. All game state
   lives in refs/closures so the loop never re-renders React.
   ──────────────────────────────────────────────────────────── */

/* Canvas 2D can't read CSS variables — these mirror the
   globals.css tokens (--bg-base, --border, --accent, --gold,
   --error, --text-*). Keep in sync by hand. */
const C = {
  bg: "#0a0a0a",
  lane: "#1e1e1e",
  laneDash: "#2a2a2a",
  accent: "#EF5D08",
  accentDark: "#d44f06",
  gold: "#F29C04",
  error: "#ef4444",
  text: "#F0F0F0",
  muted: "#555555",
  secondary: "#9a9a9a",
} as const;

/* ── F1 liveries ─────────────────────────────────────────── */

type Livery = {
  name: string;
  body: string; // engine cover + monocoque
  sidepod: string;
  nose: string;
  noseTip: string;
  rearWing: string;
  rearWingEnd: string;
  frontWing: string;
  cockpit: string;
  halo: string;
  stripe: string; // engine-cover flash + helmet
  hub: string;
};

const LIVERIES: Livery[] = [
  {
    name: "PAPAYA",
    body: "#FF8000", sidepod: "#101010", nose: "#FF8000", noseTip: "#101010",
    rearWing: "#FF8000", rearWingEnd: "#101010", frontWing: "#101010",
    cockpit: "#101010", halo: "#181818", stripe: "#FFFFFF", hub: "#333333",
  },
  {
    name: "MIDNIGHT",
    body: "#1E1D4C", sidepod: "#1E1D4C", nose: "#1E1D4C", noseTip: "#FFC906",
    rearWing: "#1E1D4C", rearWingEnd: "#FFC906", frontWing: "#FF1E00",
    cockpit: "#101010", halo: "#181818", stripe: "#FFC906", hub: "#333333",
  },
  {
    name: "SCUDERIA",
    body: "#DC0000", sidepod: "#DC0000", nose: "#DC0000", noseTip: "#FFFF00",
    rearWing: "#DC0000", rearWingEnd: "#101010", frontWing: "#DC0000",
    cockpit: "#FFFFFF", halo: "#181818", stripe: "#FFFF00", hub: "#333333",
  },
  {
    name: "PETRONAS",
    body: "#C0C0C0", sidepod: "#00D2BE", nose: "#C0C0C0", noseTip: "#00D2BE",
    rearWing: "#00D2BE", rearWingEnd: "#101010", frontWing: "#101010",
    cockpit: "#101010", halo: "#181818", stripe: "#00D2BE", hub: "#333333",
  },
  {
    name: "WILLIAMS",
    body: "#005AFF", sidepod: "#FFFFFF", nose: "#005AFF", noseTip: "#FFFFFF",
    rearWing: "#005AFF", rearWingEnd: "#FFFFFF", frontWing: "#005AFF",
    cockpit: "#101010", halo: "#181818", stripe: "#FF0000", hub: "#333333",
  },
];

/* Side-profile F1 car, nose pointing right (direction of travel —
   obstacles scroll right-to-left). viewBox 0 0 160 48; layered
   shapes: rear wing → floor → engine cover → sidepod → nose →
   wings → cockpit/halo → suspension → wheels. */
function carSvg(l: Livery): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 48">
<path d="M4 4 L7 4 L7 20 L4 20 Z" fill="${l.rearWingEnd}"/>
<path d="M6 6.5 C13 5.5 21 6.5 27 9 L27 12 C20 10 12 9.8 6 10 Z" fill="${l.rearWing}"/>
<path d="M6 13.5 C13 12.8 21 13.5 27 15.5 L27 18 C20 16.8 12 16.8 6 17 Z" fill="${l.rearWing}"/>
<path d="M16 18 C18 23 23 27 31 29" stroke="#232323" stroke-width="1.5" fill="none"/>
<path d="M13 39 L26 33.5 L26 41 L13 41 Z" fill="#191919"/>
<rect x="22" y="39" width="114" height="2" fill="#141414"/>
<path d="M24 40 C25.5 30 30 19.5 43 15 C53 11.6 63 11.5 71 14.5 L86 20 L86 40 Z" fill="${l.body}"/>
<path d="M29 35 C34 24 44 17 57 14.2 L63 15.4 C50 19 39 26 33 37 Z" fill="${l.stripe}" opacity="0.9"/>
<path d="M60 12.5 L68 13.5 L66 17.5 L58.5 15.5 Z" fill="#0a0a0a" opacity="0.75"/>
<path d="M45 23.5 L97 23.5 C101 27.5 102.5 33.5 100.5 40 L47 40 C43.5 34.5 43.5 28.5 45 23.5 Z" fill="${l.sidepod}"/>
<path d="M47 25 L59 25 L57 31.5 L47 30.5 Z" fill="#0a0a0a" opacity="0.5"/>
<path d="M45 37 L100 37 C100 38 100.8 39 100.5 40 L47 40 Z" fill="#0a0a0a" opacity="0.35"/>
<path d="M86 21.5 C104 20.5 128 24 150 28 L152 29 L152 33 C128 34.2 104 34.5 86 34.5 Z" fill="${l.nose}"/>
<path d="M138 26.8 L150 28 L152 29 L152 33 C147 33.6 142 33.8 138 33.8 Z" fill="${l.noseTip}"/>
<path d="M131 36.5 C139 35.5 149 35.5 158 36.8 L158 39 C149 40.2 139 40.2 131 39.5 Z" fill="${l.frontWing}"/>
<path d="M155 31 L158 31 L158 41 L155 41 Z" fill="${l.frontWing}"/>
<path d="M148 33 L150 33 L150 37 L148 37 Z" fill="#232323"/>
<path d="M68 16.5 C74 13 83 12.8 89 15 L95 19 L86 21.5 L70 19 Z" fill="${l.cockpit}"/>
<circle cx="81" cy="15.6" r="3.4" fill="${l.stripe}"/>
<path d="M72 15.5 C77 8.5 89 9 93 15.5" stroke="${l.halo}" stroke-width="2.4" fill="none"/>
<path d="M92.5 15 L93.5 19" stroke="${l.halo}" stroke-width="2"/>
<g stroke="#2e2e2e" stroke-width="1.4">
<path d="M34 35 L50 28"/><path d="M34 37 L50 34"/>
<path d="M121 34.5 L106 28"/><path d="M121 36 L104 33.5"/>
</g>
<circle cx="34" cy="35.5" r="10.5" fill="#1a1a1a"/>
<circle cx="34" cy="35.5" r="10.5" fill="none" stroke="#333333" stroke-width="1.7"/>
<circle cx="34" cy="35.5" r="4.2" fill="${l.hub}"/>
<circle cx="34" cy="35.5" r="1.6" fill="#5a5a5a"/>
<path d="M26.5 29 A10.5 10.5 0 0 1 41 28.5" stroke="#3d3d3d" stroke-width="1.2" fill="none"/>
<circle cx="121" cy="35" r="9.5" fill="#1a1a1a"/>
<circle cx="121" cy="35" r="9.5" fill="none" stroke="#333333" stroke-width="1.6"/>
<circle cx="121" cy="35" r="3.8" fill="${l.hub}"/>
<circle cx="121" cy="35" r="1.4" fill="#5a5a5a"/>
<path d="M114.5 29.5 A9.5 9.5 0 0 1 127.5 29" stroke="#3d3d3d" stroke-width="1.1" fill="none"/>
</svg>`;
}

function carDataUri(l: Livery): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(carSvg(l))}`;
}

/* ── Tuning constants ────────────────────────────────────── */

/* Canvas height scales with the viewport (45% of it), clamped so the game
   stays playable on short laptops and doesn't balloon on tall monitors.
   The real value is fixed once on mount inside the effect; the fallback
   only sizes the SSR/first-paint element. */
const FALLBACK_HEIGHT = 340;
const MIN_HEIGHT = 300;
const MAX_HEIGHT = 500;
const LANE_FRAC = [0.22, 0.5, 0.78] as const;
const GEARS = [3.5, 5.5, 8.0, 11.5] as const; // px/frame
const GEAR_TIMES = [0, 15, 35, 60] as const; // seconds
const SPAWN_INTERVAL = [90, 70, 55, 40] as const; // frames
const CAR_X = 110;
const CAR_W = 120;
const CAR_H = 36;
const HIT_W = 90;
const HIT_H = 28;
const OB_W = 40;
const OB_H = 24;
const OIL_H = 12; // stripe thickness
const OIL_KILL = 60; // vertical kill window either side of the centre line
const TOP_KMH = 380;
const HISCORE_KEY = "vg-404-hiscore";

type GameState = "idle" | "playing" | "dead";
type ObKind = "cone" | "double" | "oil";
type Obstacle = { x: number; kind: ObKind; lanes: number[] };
type Streak = { x: number; y: number; len: number };

function pickKind(gear: number): ObKind {
  const r = Math.random();
  if (gear === 0) return "cone";
  if (gear === 1) return r < 0.75 ? "cone" : "double";
  if (gear === 2) return r < 0.6 ? "cone" : r < 0.9 ? "double" : "oil";
  return r < 0.5 ? "cone" : r < 0.85 ? "double" : "oil";
}

export default function KartGame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* Every lane/HUD position derives from HEIGHT, so it must stay fixed
       for the life of the game loop — computed once on mount, not on
       resize (a mid-run height change would teleport the car and slick). */
    const HEIGHT = Math.min(
      MAX_HEIGHT,
      Math.max(MIN_HEIGHT, Math.floor(window.innerHeight * 0.45))
    );
    const OIL_Y = HEIGHT / 2; // oil stripe centre line
    canvas.style.height = `${HEIGHT}px`;

    /* next/font families are only reachable via their CSS variables —
       resolve the real family strings once so ctx.font can use them. */
    const rootStyles = getComputedStyle(document.documentElement);
    const chakraVar = rootStyles.getPropertyValue("--font-chakra").trim();
    const monoVar = rootStyles.getPropertyValue("--font-mono").trim();
    const HEAD = `${chakraVar ? `${chakraVar}, ` : ""}'Chakra Petch', Arial, sans-serif`;
    const MONO = `${monoVar ? `${monoVar}, ` : ""}'Space Mono', monospace`;
    const headFont = (px: number, weight = 600) => `${weight} ${px}px ${HEAD}`;
    const monoFont = (px: number) => `${px}px ${MONO}`;

    const carImgs = LIVERIES.map((livery) => {
      const img = new Image();
      img.src = carDataUri(livery);
      return img;
    });

    let W = 0;
    const laneY = (i: number) => HEIGHT * (LANE_FRAC[i] ?? 0.5);

    const g = {
      state: "idle" as GameState,
      livery: Math.floor(Math.random() * LIVERIES.length),
      lane: 1,
      carY: laneY(1),
      speed: GEARS[0] as number,
      frames: 0,
      tick: 0, // always-running counter for idle/dead animation
      spawnIn: SPAWN_INTERVAL[0] as number,
      distance: 0, // px travelled; 1000 px = 0.1 "km" on the readout
      obstacles: [] as Obstacle[],
      kmh: 0,
      flash: 0,
      hiscore: 0,
      newRecord: false,
    };
    try {
      g.hiscore = parseFloat(localStorage.getItem(HISCORE_KEY) ?? "0") || 0;
    } catch {
      // localStorage unavailable (private mode) — hiscore stays session-only
    }

    const streaks: Streak[] = Array.from({ length: 12 }, () => ({
      x: Math.random() * 1200,
      y: Math.random() * HEIGHT,
      len: 30,
    }));

    function fit() {
      if (!wrap || !canvas || !ctx) return;
      W = wrap.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.round(HEIGHT * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    /* ── state transitions ── */

    function reset() {
      g.lane = 1;
      g.carY = laneY(1);
      g.speed = GEARS[0];
      g.frames = 0;
      g.spawnIn = SPAWN_INTERVAL[0];
      g.distance = 0;
      g.obstacles = [];
      g.flash = 0;
      g.newRecord = false;
    }

    function start() {
      reset();
      g.state = "playing";
    }

    function restart() {
      g.livery = Math.floor(Math.random() * LIVERIES.length);
      start();
    }

    function die() {
      g.state = "dead";
      g.flash = 8;
      const km = g.distance / 1000;
      if (km > g.hiscore) {
        g.hiscore = km;
        g.newRecord = true;
        try {
          localStorage.setItem(HISCORE_KEY, km.toFixed(1));
        } catch {
          // ignore
        }
      }
    }

    /* ── simulation ── */

    function gearIndex(): number {
      const seconds = g.frames / 60;
      let gi = 0;
      for (let i = 0; i < GEAR_TIMES.length; i += 1) {
        if (seconds >= (GEAR_TIMES[i] ?? Infinity)) gi = i;
      }
      return gi;
    }

    function spawn(gear: number) {
      const kind = pickKind(gear);
      if (kind === "oil") {
        g.obstacles.push({ x: W + 80, kind, lanes: [0, 1, 2] });
      } else if (kind === "double") {
        const pair = Math.random() < 0.5 ? 0 : 1;
        g.obstacles.push({ x: W + 60, kind, lanes: [pair, pair + 1] });
      } else {
        g.obstacles.push({ x: W + 60, kind, lanes: [Math.floor(Math.random() * 3)] });
      }
    }

    function update() {
      g.tick += 1;

      // motion-blur streaks drift slowly even outside play
      const drift = g.state === "playing" ? g.speed * 1.5 : 0.6;
      for (const s of streaks) {
        s.x -= drift;
        if (s.x + s.len < 0) {
          s.x = W + Math.random() * 160;
          s.y = Math.random() * HEIGHT;
        }
      }

      if (g.state === "dead" && g.flash > 0) g.flash -= 1;
      if (g.state !== "playing") {
        g.kmh += (0 - g.kmh) * 0.05;
        return;
      }

      g.frames += 1;
      const gi = gearIndex();
      g.speed += ((GEARS[gi] ?? GEARS[0]) - g.speed) * 0.02;
      g.distance += g.speed;
      g.carY += (laneY(g.lane) - g.carY) * 0.18;
      g.kmh += ((g.speed / GEARS[3]) * TOP_KMH - g.kmh) * 0.06;
      for (const s of streaks) s.len = 20 + g.speed * 6;

      g.spawnIn -= 1;
      if (g.spawnIn <= 0) {
        spawn(gi);
        g.spawnIn = SPAWN_INTERVAL[gi] ?? 90;
      }

      for (const o of g.obstacles) o.x -= g.speed;
      g.obstacles = g.obstacles.filter((o) => o.x > -120);

      // AABB collision: car 90×28 centred on (CAR_X, carY);
      // each occupied lane is a 40×24 box (oil is a centre-line stripe).
      const carLeft = CAR_X - HIT_W / 2;
      const carRight = CAR_X + HIT_W / 2;
      const carTop = g.carY - HIT_H / 2;
      const carBottom = g.carY + HIT_H / 2;
      for (const o of g.obstacles) {
        if (o.kind === "oil") {
          // stripe covers [o.x, W] on the centre line; generous window — it signals run-end
          if (o.x <= carRight && Math.abs(g.carY - OIL_Y) < OIL_KILL) {
            die();
            break;
          }
          continue;
        }
        if (o.x > carRight || o.x + OB_W < carLeft) continue;
        let hit = false;
        for (const laneIdx of o.lanes) {
          const oy = laneY(laneIdx);
          if (oy - OB_H / 2 < carBottom && oy + OB_H / 2 > carTop) {
            hit = true;
            break;
          }
        }
        if (hit) {
          die();
          break;
        }
      }
    }

    /* ── rendering ── */

    function drawCone(x: number, laneIdx: number) {
      if (!ctx) return;
      const cy = laneY(laneIdx);
      const cx = x + OB_W / 2;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 11, 14, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 12);
      ctx.lineTo(cx + 9, cy + 9);
      ctx.lineTo(cx - 9, cy + 9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e8e8e8";
      ctx.beginPath();
      ctx.moveTo(cx - 4.5, cy - 3);
      ctx.lineTo(cx + 4.5, cy - 3);
      ctx.lineTo(cx + 6, cy + 1);
      ctx.lineTo(cx - 6, cy + 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = C.accentDark;
      ctx.fillRect(cx - 12, cy + 8, 24, 3);
    }

    function drawOil(x: number) {
      if (!ctx) return;
      // thin stripe on the centre line, stretching from its leading edge to
      // the right canvas edge — dodgeable by holding the top or bottom lane
      const stripeW = W - x;
      if (stripeW <= 0) return;
      const top = OIL_Y - OIL_H / 2;
      // translucent iridescent sheen — purple → teal → amber → purple —
      // so it reads as spilled oil rather than a solid wall
      const grad = ctx.createLinearGradient(x, 0, W, 0);
      grad.addColorStop(0, "rgba(80,0,120,0.55)");
      grad.addColorStop(0.3, "rgba(0,180,120,0.45)");
      grad.addColorStop(0.6, "rgba(180,80,0,0.5)");
      grad.addColorStop(1, "rgba(80,0,120,0.4)");
      ctx.fillStyle = grad;
      ctx.fillRect(x, top, stripeW, OIL_H);
      // bright edge along the top so it still reads as a hazard at speed
      ctx.strokeStyle = "rgba(255,220,0,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, top + 0.5);
      ctx.lineTo(W, top + 0.5);
      ctx.stroke();
    }

    function drawCar(x: number, y: number, w: number, h: number, liveryIdx: number) {
      if (!ctx) return;
      const img = carImgs[liveryIdx];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, w, h);
      } else {
        // pre-load fallback: silhouette block so the lane never looks empty
        ctx.fillStyle = C.lane;
        ctx.fillRect(x, y + h * 0.3, w, h * 0.45);
      }
    }

    function drawHUD() {
      if (!ctx) return;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillStyle = C.muted;
      ctx.font = monoFont(10);
      ctx.fillText("GEAR", 14, 24);
      ctx.fillStyle = C.accent;
      ctx.font = monoFont(15);
      ctx.fillText(String(gearIndex() + 1), 50, 25);
      const km = g.distance / 1000;
      ctx.textAlign = "right";
      ctx.fillStyle = C.text;
      ctx.font = monoFont(12);
      ctx.fillText(`${km.toFixed(1).padStart(5, "0")} KM`, W - 14, 24);
    }

    function drawSpeedo() {
      if (!ctx) return;
      // 80×80 gauge anchored at (W-90, H-90): 240° sweep opening downward
      const cx = W - 50;
      const cy = HEIGHT - 50;
      const r = 30;
      const a0 = (150 * Math.PI) / 180;
      const sweep = (240 * Math.PI) / 180;
      ctx.lineWidth = 6;
      ctx.strokeStyle = C.lane;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a0 + sweep);
      ctx.stroke();
      const f = Math.min(1, Math.max(0, g.kmh / TOP_KMH));
      if (f > 0.005) {
        ctx.strokeStyle = f < 0.45 ? C.accent : f < 0.75 ? C.gold : C.error;
        ctx.beginPath();
        ctx.arc(cx, cy, r, a0, a0 + sweep * f);
        ctx.stroke();
      }
      const needle = a0 + sweep * f;
      ctx.strokeStyle = C.text;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(needle) * (r - 4), cy + Math.sin(needle) * (r - 4));
      ctx.stroke();
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = C.text;
      ctx.font = monoFont(11);
      ctx.fillText(String(Math.round(g.kmh)), cx, cy + 18);
      ctx.fillStyle = C.muted;
      ctx.font = monoFont(8);
      ctx.fillText("KM/H", cx, cy + 29);
    }

    function drawLiveryRow(y: number) {
      if (!ctx) return;
      const pw = 56;
      const ph = pw * (48 / 160);
      const gap = 14;
      const total = LIVERIES.length * pw + (LIVERIES.length - 1) * gap;
      const scale = Math.min(1, (W - 32) / total);
      let x = W / 2 - (total * scale) / 2;
      for (let i = 0; i < LIVERIES.length; i += 1) {
        drawCar(x, y, pw * scale, ph * scale, i);
        x += (pw + gap) * scale;
      }
    }

    function drawIdle() {
      if (!ctx) return;
      ctx.fillStyle = "rgba(10,10,10,0.78)";
      ctx.fillRect(0, 0, W, HEIGHT);
      ctx.textAlign = "center";
      ctx.fillStyle = C.accent;
      ctx.font = headFont(30, 700);
      ctx.fillText("F1 CHALLENGE", W / 2, HEIGHT * 0.28);
      ctx.fillStyle = C.secondary;
      ctx.font = monoFont(11);
      ctx.fillText("AVOID THE OBSTACLES", W / 2, HEIGHT * 0.28 + 26);
      ctx.fillStyle = C.muted;
      ctx.font = monoFont(9);
      ctx.fillText("↑↓ KEYS OR SWIPE TO STEER", W / 2, HEIGHT * 0.28 + 44);
      const blink = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(g.tick * 0.06));
      ctx.globalAlpha = blink;
      ctx.fillStyle = C.text;
      ctx.font = monoFont(11);
      ctx.fillText("PRESS ANY KEY OR TAP TO START", W / 2, HEIGHT * 0.58);
      ctx.globalAlpha = 1;
      if (g.hiscore > 0) {
        ctx.fillStyle = C.muted;
        ctx.font = monoFont(9);
        ctx.fillText(`BEST ${g.hiscore.toFixed(1)} KM`, W / 2, HEIGHT * 0.58 + 20);
      }
      drawLiveryRow(HEIGHT * 0.74);
    }

    function drawDead() {
      if (!ctx) return;
      ctx.fillStyle = "rgba(10,10,10,0.72)";
      ctx.fillRect(0, 0, W, HEIGHT);
      if (g.flash > 0) {
        ctx.fillStyle = "rgba(239,68,68,0.4)";
        ctx.fillRect(0, 0, W, HEIGHT);
      }
      const km = g.distance / 1000;
      ctx.textAlign = "center";
      ctx.fillStyle = C.text;
      ctx.font = headFont(34, 700);
      ctx.fillText("RACE OVER", W / 2, HEIGHT * 0.38);
      ctx.fillStyle = C.secondary;
      ctx.font = monoFont(13);
      ctx.fillText(`${km.toFixed(1)} KM`, W / 2, HEIGHT * 0.38 + 30);
      if (g.newRecord) {
        ctx.fillStyle = C.gold;
        ctx.font = monoFont(11);
        ctx.fillText("NEW RECORD", W / 2, HEIGHT * 0.38 + 54);
      } else if (g.hiscore > 0) {
        ctx.fillStyle = C.muted;
        ctx.font = monoFont(10);
        ctx.fillText(`BEST ${g.hiscore.toFixed(1)} KM`, W / 2, HEIGHT * 0.38 + 54);
      }
      const blink = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(g.tick * 0.06));
      ctx.globalAlpha = blink;
      ctx.fillStyle = C.muted;
      ctx.font = monoFont(10);
      ctx.fillText("PRESS SPACE / TAP TO RESTART", W / 2, HEIGHT * 0.72);
      ctx.globalAlpha = 1;
    }

    function render() {
      if (!ctx) return;
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, HEIGHT);

      ctx.fillStyle = "rgba(239,93,8,0.08)";
      for (const s of streaks) ctx.fillRect(s.x, s.y, s.len, 2);

      ctx.strokeStyle = C.lane;
      ctx.lineWidth = 1;
      ctx.setLineDash([12, 8]);
      for (const frac of [0.35, 0.65]) {
        ctx.beginPath();
        ctx.moveTo(0, HEIGHT * frac);
        ctx.lineTo(W, HEIGHT * frac);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      for (const o of g.obstacles) {
        if (o.kind === "oil") drawOil(o.x);
        else for (const laneIdx of o.lanes) drawCone(o.x, laneIdx);
      }

      drawCar(CAR_X - CAR_W / 2, g.carY - CAR_H / 2, CAR_W, CAR_H, g.livery);

      if (g.state !== "idle") {
        drawHUD();
        drawSpeedo();
      }
      if (g.state === "idle") drawIdle();
      if (g.state === "dead") drawDead();
    }

    /* ── input ── */

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const scrollKeys = ["ArrowUp", "ArrowDown", "Space"];
      if (g.state === "idle") {
        if (scrollKeys.includes(e.code)) e.preventDefault();
        start();
        return;
      }
      if (g.state === "dead") {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          restart();
        }
        return;
      }
      if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        g.lane = Math.max(0, g.lane - 1);
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        g.lane = Math.min(2, g.lane + 1);
      }
    }

    let touchStartY: number | null = null;
    let lastTouchTick = -100;

    function onTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0]?.clientY ?? null;
      if (g.state === "idle") {
        lastTouchTick = g.tick;
        start();
      }
    }

    function onTouchEnd(e: TouchEvent) {
      const endY = e.changedTouches[0]?.clientY ?? null;
      lastTouchTick = g.tick;
      if (touchStartY === null || endY === null) return;
      const deltaY = endY - touchStartY;
      touchStartY = null;
      if (g.state === "playing") {
        if (deltaY < -30) g.lane = Math.max(0, g.lane - 1);
        else if (deltaY > 30) g.lane = Math.min(2, g.lane + 1);
      } else if (g.state === "dead" && Math.abs(deltaY) < 30) {
        restart();
      }
    }

    // mouse fallback; skipped right after a touch so a tap doesn't fire twice
    function onClick() {
      if (g.tick - lastTouchTick < 30) return;
      if (g.state === "idle") start();
      else if (g.state === "dead") restart();
    }

    window.addEventListener("keydown", onKey);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    canvas.addEventListener("click", onClick);

    /* ── loop ──
       Fixed 60 Hz timestep: all tuning is in px/frame and frames, so
       stepping the simulation at a fixed rate keeps game speed identical
       on 60/120/144 Hz displays; rendering still runs every rAF. */
    let last = performance.now();
    let acc = 0;
    const STEP = 1000 / 60;

    function loop(now: number) {
      rafRef.current = requestAnimationFrame(loop);
      acc += Math.min(now - last, 100); // clamp tab-switch gaps
      last = now;
      while (acc >= STEP) {
        update();
        acc -= STEP;
      }
      render();
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{ width: "100%", maxWidth: "56rem", margin: "0 auto", padding: "0 1.5rem", boxSizing: "border-box" }}
    >
      <canvas
        ref={canvasRef}
        aria-label="404 kart game: dodge the obstacles"
        style={{
          display: "block",
          width: "100%",
          height: `${FALLBACK_HEIGHT}px`,
          border: "1px solid var(--border)",
          background: "var(--bg-base)",
          touchAction: "none",
          cursor: "pointer",
        }}
      />
    </div>
  );
}
