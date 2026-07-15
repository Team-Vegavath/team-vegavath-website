import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Back Soon | Team Vegavath",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <main
      style={{
        minHeight: "100svh",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "4px",
          background: "var(--accent)",
        }}
      />
      <h1
        style={{
          fontFamily: "var(--font-chakra)",
          fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textAlign: "center",
        }}
      >
        BACK SOON
      </h1>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.8rem",
          letterSpacing: "0.12em",
          color: "var(--text-muted)",
          textAlign: "center",
          maxWidth: "360px",
        }}
      >
        WE ARE UNDER SCHEDULED MAINTENANCE.
        <br />
        CHECK BACK IN A LITTLE WHILE.
      </p>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          color: "var(--text-muted)",
        }}
      >
        TEAM VEGAVATH
      </p>
    </main>
  );
}
