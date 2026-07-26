"use client";
import dynamic from "next/dynamic";

/* Same pattern as KartModelWrapper: not-found.tsx is a server component
   (it exports metadata), and `ssr: false` is only allowed in client
   components -- so the dynamic import lives in this thin wrapper. */
const KartGame = dynamic(() => import("@/components/home/KartGame"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto" style={{ height: "340px", width: "100%", maxWidth: "56rem", padding: "0 1.5rem", boxSizing: "border-box" }}>
      <div style={{ height: "100%", border: "1px solid var(--border)", background: "var(--bg-base)" }} />
    </div>
  ),
});

export default function KartGameWrapper() {
  return <KartGame />;
}
