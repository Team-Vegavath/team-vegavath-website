interface AdminStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

// S65 inlined borderLeftColor here. S67 replaced it with a data attribute: the
// accent state is now a border colour AND an inset glow, and an inline style
// cannot express the second one. `|| undefined` so the attribute is absent
// rather than data-accent="false", which would still match [data-accent].
export default function AdminStatCard({ label, value, sub, accent = false }: AdminStatCardProps) {
  return (
    <div className="admin-stat-card" data-accent={accent || undefined}>
      <span className="admin-stat-label">{label}</span>
      <span className="admin-stat-value">{value}</span>
      {sub ? <span className="admin-stat-sub">{sub}</span> : null}
    </div>
  );
}
