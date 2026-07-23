"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Stage } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";

const KART_URL = "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/models/vegavath-gokart.glb";

function KartModel() {
  const { scene } = useGLTF(KART_URL);
  return <primitive object={scene} position={[0, 1.5, 0]} />;
}

function LoadingBox() {
  return (
    <mesh>
      <boxGeometry args={[2.8, 0.6, 1.4]} />
      <meshStandardMaterial color="#1d1d1d" />
    </mesh>
  );
}

export default function KartModelSection() {
  /* On touch devices OrbitControls swallows every touch, so the page can't
     be scrolled past the canvas. Gate interaction behind a tap-to-activate
     overlay; while inactive, the canvas ignores pointers and scroll passes
     through. Desktop behavior is unchanged. */
  const [isTouch, setIsTouch] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount detection for touch capability
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  function activateInteraction() {
    setInteracting(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setInteracting(false), 4000);
  }

  return (
    <div style={{ width: "100%", overflow: "hidden", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div
        style={{ height: "28rem", width: "100%", position: "relative", overflow: "hidden" }}
        // Each touch on the active canvas extends the 4 s auto-reset window
        onPointerDown={isTouch ? activateInteraction : undefined}
      >
        <Canvas
          frameloop="demand"
          style={{
            background: "var(--bg-card)",
            pointerEvents: interacting || !isTouch ? "auto" : "none",
          }}
        >
          <Suspense fallback={<LoadingBox />}>
            <Stage
              environment="city"
              intensity={0.6}
              adjustCamera={2}
              preset="rembrandt"
            >
              <KartModel />
            </Stage>
            <OrbitControls
              enableZoom={true}
              enablePan={false}
              autoRotate={true}
              autoRotateSpeed={0.6}
              zoomSpeed={0.4}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 2}
            />
          </Suspense>
        </Canvas>
        {isTouch && !interacting && (
          <div
            onClick={activateInteraction}
            style={{
              position: "absolute", inset: 0, zIndex: 10,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "0.5rem",
              background: "rgba(10,10,10,0.45)",
              cursor: "pointer",
              backdropFilter: "blur(2px)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="10" stroke="var(--accent)" strokeWidth="1.5"
                strokeDasharray="4 3" opacity="0.6" />
              <circle cx="14" cy="14" r="5" stroke="var(--accent)" strokeWidth="1.5" />
              <circle cx="14" cy="14" r="2" fill="var(--accent)" />
            </svg>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "0.65rem",
              letterSpacing: "0.18em", color: "var(--text-primary)", textTransform: "uppercase",
            }}>
              Tap to interact
            </span>
          </div>
        )}
      </div>
      <p className="mono" style={{ padding: "0.65rem 1rem", borderTop: "1px solid var(--border)", fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        Drag to rotate · scroll to zoom
      </p>
    </div>
  );
}
