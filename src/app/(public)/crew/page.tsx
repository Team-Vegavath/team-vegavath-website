import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getMembers } from "@/lib/services/team";
import type { TeamMember } from "@/types/member";

export const metadata: Metadata = {
  title: "The Crew | Team Vegavath",
};

export const revalidate = 120;

function PhotoOrInitial({ member }: { member: TeamMember }) {
  if (member.photo_url) {
    return (
      <Image
        src={member.photo_url}
        alt={member.name}
        fill
        style={{ objectFit: "cover" }}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
    );
  }
  return (
    <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="heading" style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--border-strong)" }} aria-hidden="true">
        {member.name.charAt(0)}
      </span>
    </div>
  );
}

function MemberInfo({ member, compact }: { member: TeamMember; compact?: boolean }) {
  return (
    <div style={{ padding: compact ? "1rem" : "1.25rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
      <h3 className="heading" style={{ fontSize: compact ? "0.95rem" : "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>
        {member.name}
      </h3>
      <p style={{ fontSize: compact ? "0.78rem" : "0.85rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
        {member.role}
      </p>
      {!compact && member.quote ? (
        <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-secondary)", marginTop: "0.35rem", fontStyle: "italic" }}>
          {member.quote}
        </p>
      ) : null}
      <div style={{ marginTop: "auto", paddingTop: "0.6rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        {member.domain ? <span className="label-tech">{member.domain}</span> : <span />}
        {member.linkedin_url ? (
          <a
            href={member.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mono"
            style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "var(--text-secondary)", textDecoration: "none" }}
          >
            LINKEDIN →
          </a>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2 className="heading" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-primary)" }}>
        {title}
      </h2>
      <p style={{ marginTop: "0.4rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>{subtitle}</p>
    </div>
  );
}

export default async function CrewPage() {
  let members: TeamMember[] = [];

  try {
    members = await getMembers();
  } catch {
    members = [];
  }

  const active = members.filter((m) => m.is_active !== false);
  const coreMembers = active.filter((m) => m.tier === "core");
  const crewMembers = active.filter((m) => m.tier === "crew");
  const legacyMembers = active.filter((m) => m.tier === "legacy");

  return (
    <main style={{ background: "var(--bg-base)", color: "var(--text-primary)", minHeight: "100vh", overflowX: "hidden" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "80rem", padding: "9rem 1.5rem 5rem", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "5rem" }}>
        <header>
          <p className="label-tech" style={{ color: "var(--accent)", marginBottom: "0.75rem" }}>
            Core · Crew · Legacy
          </p>
          <h1 className="heading" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}>
            The Crew
          </h1>
        </header>

        {coreMembers.length > 0 ? (
          <section>
            <SectionHeading title="Core" subtitle="Leads running the club day to day" />
            <div className="crew-core-grid">
              {coreMembers.map((member) => (
                <article key={member.id} className="crew-core-card">
                  <div className="crew-photo">
                    <PhotoOrInitial member={member} />
                  </div>
                  <MemberInfo member={member} />
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {crewMembers.length > 0 ? (
          <section>
            <SectionHeading title="Crew" subtitle="Builders across every domain" />
            <div className="crew-grid">
              {crewMembers.map((member) => (
                <article key={member.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
                  <div className="crew-photo" style={{ borderRight: "none", borderBottom: "1px solid var(--border)" }}>
                    <PhotoOrInitial member={member} />
                  </div>
                  <MemberInfo member={member} compact />
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {legacyMembers.length > 0 ? (
          <section>
            <SectionHeading title="Legacy" subtitle="The seniors who built the foundation" />
            <div className="crew-grid">
              {legacyMembers.map((member) => (
                <article key={member.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
                  <div className="crew-photo" style={{ borderRight: "none", borderBottom: "1px solid var(--border)" }}>
                    <PhotoOrInitial member={member} />
                  </div>
                  <MemberInfo member={member} compact />
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section style={{ borderTop: "1px solid var(--border)", paddingTop: "3rem", display: "flex", flexDirection: "column", gap: "1.25rem", alignItems: "flex-start" }}>
          <div>
            <h2 className="heading" style={{ fontSize: "clamp(1.25rem, 3vw, 1.6rem)", fontWeight: 700, textTransform: "uppercase" }}>
              Want in?
            </h2>
            <p style={{ marginTop: "0.5rem", color: "var(--text-secondary)" }}>
              Recruitment opens each semester across all six domains.
            </p>
          </div>
          <Link href="/join" className="btn-primary">
            APPLY NOW
          </Link>
        </section>
      </div>
    </main>
  );
}
