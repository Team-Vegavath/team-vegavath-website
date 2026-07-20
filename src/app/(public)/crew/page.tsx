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
        // Crew photos are always R2-hosted (upload route sets photo_url to
        // `${R2_PUBLIC_URL}/...`), so Cloudflare already CDN-delivers them.
        // Skip Vercel's optimizer to spend 0 transformation credits here.
        unoptimized
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

/* Club LinkedIn (same URL as Footer). Every card links here; a member's own
   linkedin_url (settable via admin MemberForm) overrides it when present. */
const CLUB_LINKEDIN_URL = "https://www.linkedin.com/company/team-vegavath-pesu";

function LinkedInLink({ member }: { member: TeamMember }) {
  return (
    <a
      href={member.linkedin_url || CLUB_LINKEDIN_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${member.name} on LinkedIn`}
      style={{ color: "var(--text-muted)", display: "inline-flex" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    </a>
  );
}

function GitHubLink({ member }: { member: TeamMember }) {
  if (!member.github_url) return null;
  return (
    <a
      href={member.github_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${member.name} on GitHub`}
      style={{ color: "var(--text-muted)", display: "inline-flex" }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    </a>
  );
}

function MemberInfo({ member, compact }: { member: TeamMember; compact?: boolean }) {
  return (
    <div style={{ padding: compact ? "1rem" : "1.25rem 1.4rem", display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
      <h3 className="heading" style={{ fontSize: compact ? "0.95rem" : "1.35rem", fontWeight: 600, color: "var(--text-primary)" }}>
        {member.name}
      </h3>
      <p style={{ fontSize: compact ? "0.78rem" : "0.85rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
        {member.role}
      </p>
      {member.quote ? (
        <p
          style={{
            fontSize: compact ? "0.78rem" : "0.85rem",
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            marginTop: "0.35rem",
            fontStyle: "italic",
            ...(compact
              ? { overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }
              : {}),
          }}
        >
          {member.quote}
        </p>
      ) : null}
      <div style={{ marginTop: "auto", paddingTop: "0.6rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        {member.domain ? <span className="label-tech">{member.domain}</span> : <span />}
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem" }}>
          <GitHubLink member={member} />
          <LinkedInLink member={member} />
        </span>
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle, muted }: { title: string; subtitle: string; muted?: boolean }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2 className="heading" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-primary)", ...(muted ? { opacity: 0.6 } : {}) }}>
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
            <SectionHeading title="Legacy" subtitle="The seniors and past members who built the foundation." muted />
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
              Recruitment opens each year across all six domains.
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
