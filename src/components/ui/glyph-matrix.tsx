"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/* S60 -- Magic UI Glyph Matrix, adapted. Upstream source fetched from
 * magicuidesign/magicui (apps/www/registry/magicui/glyph-matrix.tsx); Context7
 * only carries its registry entry, which does confirm two useful things: no
 * `motion` dependency and no registered keyframes. It is a <canvas> driven by
 * requestAnimationFrame, not a DOM grid.
 *
 * THE COLOR PROP IS THE TRAP. Upstream takes `color` (a hardcoded grey) and
 * resolves it by painting one pixel on a probe canvas and reading it back. That
 * cannot work with a design token: canvas `fillStyle` does not resolve CSS
 * custom properties, and an unparseable value is silently IGNORED, leaving the
 * previous fillStyle in place. Passing color="var(--accent)" would render the
 * hardcoded grey default and look like the token was wrong.
 *
 * So the prop is gone. The canvas sets `color: var(--accent)` in CSS and the
 * effect reads getComputedStyle().color, which browsers always return as
 * rgb()/rgba() -- already the numbers the per-cell alpha needs. That deletes
 * the entire probe canvas and its useEffect, keeps every color in globals.css,
 * and lets a caller re-tint by setting `color` in `style`.
 *
 * Other adaptations:
 *  - no cn() (clsx/tailwind-merge still absent, S59); className passes through,
 *  - noUncheckedIndexedAccess is on, so cells[i] / alphas[i] / glyphs[i] are all
 *    `T | undefined` upstream and do not compile here. Each read carries a
 *    fallback rather than a non-null assertion,
 *  - the rAF loop is left as upstream wrote it: it wakes every frame but only
 *    repaints every `interval` ms. Worth knowing that a repaint redraws EVERY
 *    cell, so cost scales with panel area / cellSize^2. On the admin login
 *    right panel that is a few thousand fillText calls per repaint. Acceptable
 *    there (tasks.md D2 scoped this to the login page as "low traffic, safe")
 *    and it is why globals.css hides that panel below 768px entirely.
 */

type GlyphMatrixProps = {
  glyphs?: string;
  cellSize?: number;
  mutationRate?: number;
  interval?: number;
  fadeBottom?: number;
  className?: string;
  style?: CSSProperties;
};

export function GlyphMatrix({
  glyphs = "01·•+*/\\<>=",
  cellSize = 14,
  mutationRate = 0.04,
  interval = 90,
  fadeBottom = 0.6,
  className,
  style,
}: GlyphMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resolve the inherited CSS color once. Always "rgb(r, g, b)" or
    // "rgba(r, g, b, a)"; the fallback is a mid grey if a browser ever
    // returns something else.
    const parsed = getComputedStyle(canvas)
      .color.match(/[\d.]+/g)
      ?.map(Number);
    const r = parsed?.[0] ?? 107;
    const g = parsed?.[1] ?? 114;
    const b = parsed?.[2] ?? 128;
    const colorAlpha = parsed?.[3] ?? 1;

    let cols = 0;
    let rows = 0;
    let cells: string[] = [];
    let alphas: number[] = [];
    let raf = 0;
    let last = 0;
    let stopped = false;

    const randomGlyph = () => glyphs[Math.floor(Math.random() * glyphs.length)] ?? "0";

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth: w, clientHeight: h } = canvas;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(w / cellSize);
      rows = Math.ceil(h / cellSize);

      cells = new Array(cols * rows).fill(0).map(randomGlyph);
      alphas = new Array(cols * rows).fill(0).map(() => 0.05 + Math.random() * 0.35);
    };

    const draw = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${cellSize - 2}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textBaseline = "top";

      for (let y = 0; y < rows; y++) {
        const fade = fadeBottom > 0 ? 1 - (y / rows) * fadeBottom : 1;
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(alphas[i] ?? 0) * fade * colorAlpha})`;
          ctx.fillText(cells[i] ?? "", x * cellSize, y * cellSize);
        }
      }
    };

    const tick = (t: number) => {
      if (stopped) return;

      if (t - last >= interval) {
        last = t;
        const total = cols * rows;
        const mutations = Math.max(1, Math.floor(total * mutationRate));

        for (let n = 0; n < mutations; n++) {
          const i = Math.floor(Math.random() * total);
          cells[i] = randomGlyph();
          alphas[i] = 0.05 + Math.random() * 0.45;
        }

        draw();
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    draw();
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [glyphs, cellSize, mutationRate, interval, fadeBottom]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: "none",
        color: "var(--accent)",
        ...style,
      }}
    />
  );
}
