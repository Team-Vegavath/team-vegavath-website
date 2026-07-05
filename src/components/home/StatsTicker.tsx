const STATS = [
  "200+ FOOTFALL",
  "2 MAJOR EVENTS",
  "85 MEMBERS",
  "6 DOMAINS",
] as const;

export function StatsTicker() {
  return (
    <div className="stats-ticker">
      {STATS.map((stat, index) => (
        <span key={stat} style={{ display: "inline-flex", alignItems: "center", gap: "1.75rem" }}>
          {stat}
          {index < STATS.length - 1 ? <span className="sep" aria-hidden="true">·</span> : null}
        </span>
      ))}
    </div>
  );
}
