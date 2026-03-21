import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getMembers } from "@/lib/services/team";
import type { TeamMember } from "@/types/member";

export const metadata: Metadata = {
  title: "The Crew | Team Vegavath",
};

export const revalidate = 120;

type MemberSectionProps = {
  title: string;
  subtitle: string;
  members: TeamMember[];
};

function MemberSection({ title, subtitle, members }: MemberSectionProps) {
  if (members.length === 0) return null;

  return (
    <section style={{ width: "100%" }}>
      <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 900, letterSpacing: "0.15em", color: "#EBEBEB", textTransform: "uppercase" }}>{title}</h2>
        <p style={{ marginTop: "0.5rem", fontSize: "0.95rem", color: "#9a9a9a" }}>{subtitle}</p>
        <div style={{ margin: "1rem auto 0", width: "3rem", height: "3px", background: "#EF5D08", borderRadius: "2px" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))", gap: "1.5rem", width: "100%" }}>
        {members.map((member) => (
          <article
            key={member.id}
            style={{ overflow: "hidden", borderRadius: "0.75rem", border: "1px solid #2a2a2a", background: "#1a1a1a", transition: "border-color 0.2s" }}
            className="hover:border-[#EF5D08]"
          >
            <div style={{ position: "relative", aspectRatio: "1/1", width: "100%", background: "#2a2a2a" }}>
              {member.photo_url ? (
                <Image
                  src={member.photo_url}
                  alt={member.name}
                  fill
                  style={{ objectFit: "cover" }}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div style={{ height: "100%", width: "100%", background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "3rem", opacity: 0.3 }}>👤</span>
                </div>
              )}
            </div>

            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#EBEBEB" }}>{member.name}</h3>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#EF5D08" }}>{member.role}</p>
              {member.quote ? (
                <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "#9a9a9a", marginTop: "0.25rem" }}>{member.quote}</p>
              ) : null}
              {member.linkedin_url ? (
                <a
                  href={member.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#07C5F0", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                >
                  LinkedIn →
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function CrewPage() {
  let members: TeamMember[] = [];

  try {
    members = await getMembers();
  } catch {
    members = [];
  }

  const coreMembers = members.filter((m) => m.tier === "core");
  const crewMembers = members.filter((m) => m.tier === "crew");
  const legacyMembers = members.filter((m) => m.tier === "legacy");

  return (
    <main style={{ background: "#121212", color: "#EBEBEB", minHeight: "100vh", overflowX: "hidden" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "80rem", padding: "6rem 1.5rem 4rem", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "6rem" }}>

        <header style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 4rem)", fontWeight: 900, letterSpacing: "0.2em", color: "#EBEBEB", textTransform: "uppercase", textAlign: "center" }}>
            Meet The Crew
          </h1>
          <p style={{ marginTop: "1rem", fontSize: "1.1rem", color: "#9a9a9a", textAlign: "center" }}>
            Our diverse team of passionate engineers, designers, and innovators
          </p>
        </header>

        <MemberSection
          title="Core"
          subtitle="The founding members leading Vegavath"
          members={coreMembers}
        />

        <MemberSection
          title="Crew"
          subtitle="The passionate builders across every domain"
          members={crewMembers}
        />

        <MemberSection
          title="Legacy Crew"
          subtitle="Those who built the foundation we stand on"
          members={legacyMembers}
        />

        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem", borderRadius: "1rem", border: "1px solid #2a2a2a", background: "#1a1a1a", padding: "2rem 1.5rem", alignItems: "center", textAlign: "center" }}>
          <div>
            <h2 style={{ fontSize: "clamp(1.25rem, 3vw, 1.75rem)", fontWeight: 900, color: "#EBEBEB", textAlign: "center" }}>Want to Join Our Crew?</h2>
            <p style={{ marginTop: "0.5rem", color: "#9a9a9a", textAlign: "center" }}>{"We're always looking for passionate individuals"}</p>
          </div>
          <Link
            href="/join"
            style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", border: "1.5px solid #EF5D08", background: "transparent", color: "#EF5D08", padding: "0.75rem 2rem", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", transition: "all 0.2s" }}
          >
            Apply Now 🏁
          </Link>
        </section>

      </div>
    </main>
  );
}