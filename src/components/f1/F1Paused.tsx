// Rendered by every /f1 page when site_settings.f1_enabled is not 'true'.
// Reaching this component means no Jolpica request was made at all -- the
// kill switch is checked before any fetch, which is the whole point of it.
export default function F1Paused() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        alignItems: "flex-start",
        padding: "4rem 0",
      }}
    >
      <div style={{ width: "48px", height: "4px", background: "var(--accent)" }} />
      <h1
        className="heading"
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        F1 Data Paused
      </h1>
      <p
        className="mono"
        style={{
          fontSize: "0.8rem",
          lineHeight: 1.9,
          letterSpacing: "0.1em",
          color: "var(--text-muted)",
          maxWidth: "34rem",
        }}
      >
        LIVE STANDINGS AND RESULTS ARE TEMPORARILY OFF.
        <br />
        WE PAUSE THE FEED DURING RACE WEEKENDS TO KEEP THE SITE FAST.
        <br />
        CHECK BACK AFTER THE CHEQUERED FLAG.
      </p>
    </div>
  );
}
