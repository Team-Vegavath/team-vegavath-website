const DOMAINS = [
  { abbr: "C", name: "Coding" },
  { abbr: "A", name: "Automotives" },
  { abbr: "SF", name: "Sponsorship & Finance" },
  { abbr: "R", name: "Robotics" },
  { abbr: "O", name: "Operations" },
  { abbr: "SM", name: "Social Media" },
] as const;

export function DomainGrid() {
  return (
    <div className="domain-grid">
      {DOMAINS.map(({ abbr, name }) => (
        <div key={name} className="domain-tile">
          <span className="domain-letter" aria-hidden="true">
            {abbr}
          </span>
          <span className="domain-name">{name}</span>
        </div>
      ))}
    </div>
  );
}
