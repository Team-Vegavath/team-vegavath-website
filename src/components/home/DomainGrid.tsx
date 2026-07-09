const DOMAINS = [
  {
    abbr: "COD",
    name: "Coding",
    description:
      "Embedded systems, automotive software, robotics code, internal tools, full-stack web. We build everything the team runs on.",
  },
  {
    abbr: "AUT",
    name: "Automotives",
    description:
      "Chassis, drivetrain, suspension, electronics. We design and build the kart from the ground up and take it to the track.",
  },
  {
    abbr: "S&F",
    name: "Sponsorship & Finance",
    description:
      "The fuel behind everything. We build industry partnerships and manage the resources that keep the club running.",
  },
  {
    abbr: "ROB",
    name: "Robotics",
    description: "Autonomous systems, sensors, and control logic. We build machines that think and move.",
  },
  {
    abbr: "OPS",
    name: "Operations",
    description: "Logistics, planning, and execution. We make events happen from concept to cleanup.",
  },
  {
    abbr: "SOC",
    name: "Social Media",
    description: "The club's voice. Photography, content, and the story of everything we build.",
  },
] as const;

export function DomainGrid() {
  return (
    <div className="domain-grid">
      {DOMAINS.map(({ abbr, name, description }) => (
        <div key={name} className="domain-tile">
          <span className="domain-letter" aria-hidden="true">
            {abbr}
          </span>
          <span className="domain-name">{name}</span>
          <span className="domain-desc">{description}</span>
        </div>
      ))}
    </div>
  );
}
