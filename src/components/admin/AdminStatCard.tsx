interface AdminStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

// S65. borderLeftColor is inline because it is the one per-instance value here;
// a second CSS class for a single property would not pay for itself.
export default function AdminStatCard({ label, value, sub, accent = false }: AdminStatCardProps) {
  return (
    <div
      className="admin-stat-card"
      style={{ borderLeftColor: accent ? "var(--accent)" : "var(--border-strong)" }}
    >
      <span className="admin-stat-label">{label}</span>
      <span className="admin-stat-value">{value}</span>
      {sub ? <span className="admin-stat-sub">{sub}</span> : null}
    </div>
  );
}
