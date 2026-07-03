"use client";
import dynamic from "next/dynamic";

const KartModelSection = dynamic(() => import("@/components/home/KartModelSection"), {
  ssr: false,
  loading: () => <div style={{ height: "24rem", width: "100%", background: "#1a1a1a", borderRadius: "0.5rem" }} />,
});

export default function KartModelWrapper() {
  return (
    <>
      <KartModelSection />
    </>
  );
}