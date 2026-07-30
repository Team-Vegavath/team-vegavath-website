"use client";

import { useEffect, useRef, useState, type FC, type ReactNode } from "react";
import { motion, useSpring } from "framer-motion";

/* S61 -- Magic UI SmoothCursor, adapted. Upstream (confirmed via Context7,
 * magicuidesign/magicui) is a spring-driven arrowhead that rotates toward the
 * direction of travel and dips in scale while moving. Replaces RacingCursor's
 * two lerped circles.
 *
 * Adaptations:
 *  - upstream imports `motion/react`; this project has framer-motion ^12, which
 *    exports the same `motion` and `useSpring`. No new dependency.
 *  - upstream's SVG hardcodes a black fill and a white stroke, and wraps them in
 *    a ~40-line <filter> drop shadow. The fill and stroke are now var(--accent)
 *    over var(--bg-base), and the filter is deleted -- CLAUDE.md bans glows, and
 *    it was the majority of the file for an 8%-opacity shadow. That also removes
 *    the `style={{ scale: 0.5 }}` hack: the SVG is just rendered at half size.
 *  - `data-racing-cursor` is on the wrapper deliberately. globals.css already
 *    hides `[data-racing-cursor]` under `@media (pointer: coarse), (hover: none)`
 *    together with the toggle, so the CSS touch layer keeps working without a
 *    new rule. That sits on top of upstream's own JS pointer gate below.
 *  - zIndex is 2147483647, not upstream's 100: CursorToggle is z-99999, so at
 *    100 the cursor would disappear behind the toggle in the bottom-right.
 *  - cleanup restores `body.style.cursor = ""` rather than upstream's "auto", so
 *    the stylesheet's own value wins back instead of being pinned to auto.
 *
 * The `enabled` gate is NOT a prop -- CursorControls mounts and unmounts this
 * component, and the effect cleanup is what restores the real cursor. A prop
 * would need the same unmount to undo `cursor: none` anyway.
 */

type Position = { x: number; y: number };

export interface SmoothCursorProps {
  cursor?: ReactNode;
  springConfig?: {
    damping: number;
    stiffness: number;
    mass: number;
    restDelta: number;
  };
}

const DESKTOP_POINTER_QUERY = "(any-hover: hover) and (any-pointer: fine)";

function isTrackablePointer(pointerType: string) {
  return pointerType !== "touch";
}

const DefaultCursorSVG: FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width={25} height={27} viewBox="0 0 50 54" fill="none">
    <path
      d="M43.7146 40.6933L28.5431 6.34306C27.3556 3.65428 23.5772 3.69516 22.3668 6.32755L6.57226 40.6778C5.3134 43.4156 7.97238 46.298 10.803 45.2549L24.7662 40.109C25.0221 40.0147 25.2999 40.0156 25.5494 40.1082L39.4193 45.254C42.2261 46.2953 44.9254 43.4347 43.7146 40.6933Z"
      fill="var(--accent)"
      stroke="var(--bg-base)"
      strokeWidth={2.25825}
    />
  </svg>
);

export function SmoothCursor({
  cursor = <DefaultCursorSVG />,
  springConfig = { damping: 45, stiffness: 400, mass: 1, restDelta: 0.001 },
}: SmoothCursorProps) {
  const lastMousePos = useRef<Position>({ x: 0, y: 0 });
  const velocity = useRef<Position>({ x: 0, y: 0 });
  const lastUpdateTime = useRef(0);
  const previousAngle = useRef(0);
  const accumulatedRotation = useRef(0);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const cursorX = useSpring(0, springConfig);
  const cursorY = useSpring(0, springConfig);
  const rotation = useSpring(0, { ...springConfig, damping: 60, stiffness: 300 });
  const scale = useSpring(1, { ...springConfig, stiffness: 500, damping: 35 });

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_POINTER_QUERY);

    const updateEnabled = () => {
      const next = mediaQuery.matches;
      setIsEnabled(next);
      if (!next) setIsVisible(false);
    };

    updateEnabled();
    mediaQuery.addEventListener("change", updateEnabled);
    return () => mediaQuery.removeEventListener("change", updateEnabled);
  }, []);

  useEffect(() => {
    if (!isEnabled) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;

    const updateVelocity = (currentPos: Position) => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastUpdateTime.current;

      if (deltaTime > 0) {
        velocity.current = {
          x: (currentPos.x - lastMousePos.current.x) / deltaTime,
          y: (currentPos.y - lastMousePos.current.y) / deltaTime,
        };
      }

      lastUpdateTime.current = currentTime;
      lastMousePos.current = currentPos;
    };

    const smoothPointerMove = (e: PointerEvent) => {
      setIsVisible(true);

      const currentPos = { x: e.clientX, y: e.clientY };
      updateVelocity(currentPos);

      const speed = Math.sqrt(velocity.current.x ** 2 + velocity.current.y ** 2);

      cursorX.set(currentPos.x);
      cursorY.set(currentPos.y);

      if (speed > 0.1) {
        const currentAngle =
          Math.atan2(velocity.current.y, velocity.current.x) * (180 / Math.PI) + 90;

        let angleDiff = currentAngle - previousAngle.current;
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;
        accumulatedRotation.current += angleDiff;
        rotation.set(accumulatedRotation.current);
        previousAngle.current = currentAngle;

        scale.set(0.95);
        if (timeout !== null) clearTimeout(timeout);
        timeout = setTimeout(() => scale.set(1), 150);
      }
    };

    let rafId = 0;
    const throttledPointerMove = (e: PointerEvent) => {
      if (!isTrackablePointer(e.pointerType)) return;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        smoothPointerMove(e);
        rafId = 0;
      });
    };

    document.body.style.cursor = "none";
    window.addEventListener("pointermove", throttledPointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", throttledPointerMove);
      document.body.style.cursor = "";
      if (rafId) cancelAnimationFrame(rafId);
      if (timeout !== null) clearTimeout(timeout);
    };
  }, [cursorX, cursorY, rotation, scale, isEnabled]);

  if (!isEnabled) return null;

  return (
    <motion.div
      data-racing-cursor=""
      style={{
        position: "fixed",
        left: cursorX,
        top: cursorY,
        translateX: "-50%",
        translateY: "-50%",
        rotate: rotation,
        scale: scale,
        zIndex: 2147483647,
        pointerEvents: "none",
        willChange: "transform",
      }}
      initial={false}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.15 }}
    >
      {cursor}
    </motion.div>
  );
}
