"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Stage } from "@react-three/drei";
import { Suspense } from "react";

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
  return (
    <div style={{ width: "100%", overflow: "hidden", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div style={{ height: "28rem", width: "100%" }}>
        <Canvas style={{ background: "#161616" }}>
          <Suspense fallback={<LoadingBox />}>
            <Stage
              environment="city"
              intensity={0.6}
              adjustCamera={4}
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
      </div>
      <p className="mono" style={{ padding: "0.65rem 1rem", borderTop: "1px solid var(--border)", fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        Drag to rotate — scroll to zoom
      </p>
    </div>
  );
}
