"use client";
import dynamic from "next/dynamic";

const KartModelSection = dynamic(() => import("@/components/home/KartModelSection"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "28rem", width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)" }} />
  ),
});

export default function KartModelWrapper() {
  return <KartModelSection />;
}
