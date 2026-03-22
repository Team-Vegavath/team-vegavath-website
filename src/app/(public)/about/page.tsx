import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import AboutHeroImage from "@/components/about/AboutHeroImage";
import { getActiveSponsors } from "@/lib/services/sponsors";

export const metadata: Metadata = {
  title: "About | Team Vegavath",
};

export const revalidate = 120;

const missionText =
  "To create a future-ready community where technology, innovation, and teamwork converge — shaping the next generation of leaders in mobility, robotics, and digital transformation.";

const domains = [
  { title: "Coding", emoji: "💻", description: "The backbone of everything we build. From embedded systems and automotive software to autonomous robotics code, internal tools, and full-stack websites — we code it all." },
  { title: "Automotives", emoji: "🏎️", description: "Where ideas turn into machines. We design, build, and fabricate vehicles — from simulations to hands-on assembly." },
  { title: "Sponsorship & Finance", emoji: "🤝", description: "Powering innovation through partnerships. This domain handles budgeting, sponsor relations, and industry collaborations." },
  { title: "Robotics", emoji: "🤖", description: "Designing intelligence in motion. We build robots combining mechanics, electronics, and software." },
  { title: "Operations", emoji: "⚙️", description: "The engine that keeps the club running — permissions, LORs, members, events, and internal workflows." },
  { title: "Social Media", emoji: "📣", description: "Telling our story to the world. Marketing, content creation, outreach, and showcasing everything Vegavath builds." },
] as const;

const visionDomains = [
  "Coding",
  "Automotives",
  "Sponsorship & Finance",
  "Robotics",
  "Operations",
  "Social Media",
] as const;

const timelineEntries = [
  {
    year: "2020",
    title: "Team Vegavath Founded",
    description: "Started with a vision to bridge academia and industry",
  },
  {
    year: "2021",
    title: "First Go-Kart Built",
    description:
      "Successfully designed and built our first high-performance go-kart",
  },
  {
    year: "2022",
    title: "Robotics Division Launch",
    description:
      "Expanded into autonomous systems and robotics development",
  },
  {
    year: "2023",
    title: "Multi-Domain Excellence",
    description:
      "Achieved recognition across all five technical domains",
  },
] as const;

const values = [
  {
    icon: "💡",
    title: "Innovation",
    description:
      "We challenge convention and build forward-looking solutions with curiosity at the center.",
  },
  {
    icon: "🏆",
    title: "Excellence",
    description:
      "We hold ourselves to high engineering and creative standards in every project we ship.",
  },
  {
    icon: "🤝",
    title: "Collaboration",
    description:
      "Our best ideas come from working across disciplines, learning openly, and moving as one team.",
  },
  {
    icon: "🚀",
    title: "Impact",
    description:
      "We build experiences that prepare students for real-world challenges in technology and mobility.",
  },
] as const;

export default async function AboutPage() {
  let sponsors = [] as Awaited<ReturnType<typeof getActiveSponsors>>;

  try {
    sponsors = await getActiveSponsors();
  } catch {
    sponsors = [];
  }

  const marqueeSponsors = sponsors.length > 0 ? [...sponsors, ...sponsors] : [];

  return (
    <main className="bg-[#121212] text-[#EBEBEB]" style={{ overflowX: "hidden" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "80rem", display: "flex", flexDirection: "column", gap: "5rem", padding: "3rem 1.25rem", boxSizing: "border-box" }}>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 28rem), 1fr))", gap: "2rem", alignItems: "center" }}>
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#EF5D08]">
              Who We Are
            </p>
            <h1 className="text-3xl font-black tracking-tight text-[#EBEBEB] sm:text-4xl">
              About Team Vegavath
            </h1>
            <p className="text-base leading-7 text-[#9a9a9a] sm:text-lg">
              Team Vegavath is the official student innovation club of PES
              University, Electronic City Campus (PESU ECC). Founded by our
              Mechanical Engineering seniors as a racing team, Vegavath has now
              evolved into a multi-domain student community that brings together
              passionate minds from Computer Science and Electronics backgrounds
              with a passion for automotives and robotics.
            </p>
          </div>

          <AboutHeroImage />
        </section>

        <section className="rounded-3xl border border-[#2a2a2a] bg-[#1a1a1a] text-center shadow-sm" style={{ padding: "2.5rem 1.5rem" }}>
          <h2 className="text-2xl font-bold text-[#EBEBEB] sm:text-3xl">
            Our Mission
          </h2>
          <p style={{ margin: "1rem auto 0", maxWidth: "48rem", fontSize: "1rem", lineHeight: 1.75, color: "#9a9a9a" }}>
            {missionText}
          </p>
        </section>

        <section className="space-y-8">
          <h2 className="text-2xl font-bold tracking-tight text-[#EBEBEB]" style={{ textAlign: "center" }}>
            What We Do
          </h2>

          <div className="domains-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            {domains.map((domain) => (
              <article
                key={domain.title}
                className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-sm transition-colors hover:border-[#EF5D08]"
                style={{ padding: "1.5rem" }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{domain.emoji}</div>
                <h3 className="text-lg font-bold text-[#EBEBEB]">{domain.title}</h3>
                <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", lineHeight: 1.6, color: "#9a9a9a" }}>{domain.description}</p>
              </article>
            ))}
          </div>
        </section>

        {sponsors.length > 0 ? (
          <section className="space-y-8 overflow-hidden">
            <h2 className="text-2xl font-bold tracking-tight text-[#EBEBEB]" style={{ textAlign: "center" }}>
              Our Sponsors
            </h2>

            <div className="overflow-hidden rounded-3xl border border-[#2a2a2a] bg-[#1a1a1a] py-6">
              <div
                className="flex w-max items-center gap-6 px-6"
                style={{ animation: "sponsor-marquee 24s linear infinite" }}
              >
                {marqueeSponsors.map((sponsor, index) => {
                  const content = (
                    <div className="flex min-w-[200px] items-center gap-4 rounded-2xl border border-[#2a2a2a] bg-[#222222] px-5 py-4 shadow-sm transition-colors hover:border-[#EF5D08]">
                      <Image
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        width={120}
                        height={60}
                        className="h-[60px] w-[120px] object-contain"
                      />
                      <p className="text-sm font-semibold text-[#EBEBEB]">
                        {sponsor.name}
                      </p>
                    </div>
                  );

                  return sponsor.website_url ? (
                    <a
                      key={`${sponsor.id}-${index}`}
                      href={sponsor.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      {content}
                    </a>
                  ) : (
                    <div key={`${sponsor.id}-${index}`}>{content}</div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 28rem), 1fr))", gap: "2rem" }}>
          <div className="space-y-6 rounded-3xl border border-[#2a2a2a] bg-[#1a1a1a]" style={{ padding: "1.75rem" }}>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-[#EBEBEB]">
                OUR JOURNEY &amp; WHAT WE DO
              </h2>
              <p className="text-base leading-7 text-[#9a9a9a]">
                Rooted in our racing heritage, Team Vegavath has grown into a
                collaborative student club building across mobility, robotics,
                software, design, and outreach. We turn ambitious ideas into
                prototypes, hackathons, and hands-on learning experiences.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#222222] p-5 shadow-sm">
                <p className="text-2xl font-black text-[#EF5D08]">10+</p>
                <p className="mt-1 text-sm font-medium text-[#9a9a9a]">Projects</p>
              </div>
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#222222] p-5 shadow-sm">
                <p className="text-2xl font-black text-[#EF5D08]">3+</p>
                <p className="mt-1 text-sm font-medium text-[#9a9a9a]">Awards</p>
              </div>
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#222222] p-5 shadow-sm">
                <p className="text-2xl font-black text-[#EF5D08]">85</p>
                <p className="mt-1 text-sm font-medium text-[#9a9a9a]">Active Members</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-3xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-sm" style={{ padding: "1.75rem" }}>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-[#EBEBEB]">OUR VISION</h2>
              <p className="text-base leading-7 text-[#9a9a9a]">{missionText}</p>
            </div>

            <div className="space-y-3">
              {visionDomains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center gap-4 rounded-2xl border border-[#2a2a2a] bg-[#222222] px-4 py-3 transition-colors hover:border-[#EF5D08]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EF5D08]/10 text-sm font-bold text-[#EF5D08]">
                    {domain.charAt(0)}
                  </div>
                  <p className="text-sm font-semibold text-[#EBEBEB] sm:text-base">
                    {domain}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-10">
          <h2 className="text-center text-2xl font-bold tracking-tight text-[#EBEBEB] sm:text-3xl">
            OUR JOURNEY
          </h2>

          <div className="relative">
            <div style={{ position: "absolute", left: "50%", top: 0, height: "100%", width: "2px", background: "#2a2a2a", transform: "translateX(-50%)" }} />

            <div className="space-y-8">
              {timelineEntries.map((entry, index) => (
                <div
                  key={entry.year}
                  style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}
                >
                  {index % 2 === 0 ? (
                    <>
                      <article style={{ borderRadius: "1rem", border: "1px solid #2a2a2a", background: "#1a1a1a", padding: "1.5rem", transition: "border-color 0.2s" }} className="hover:border-[#EF5D08]">
                        <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.24em", color: "#EF5D08" }}>{entry.year}</p>
                        <h3 style={{ marginTop: "0.5rem", fontSize: "1.25rem", fontWeight: 700, color: "#EBEBEB" }}>{entry.title}</h3>
                        <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", lineHeight: 1.6, color: "#9a9a9a" }}>{entry.description}</p>
                      </article>
                      <div />
                    </>
                  ) : (
                    <>
                      <div />
                      <article style={{ borderRadius: "1rem", border: "1px solid #2a2a2a", background: "#1a1a1a", padding: "1.5rem", transition: "border-color 0.2s" }} className="hover:border-[#EF5D08]">
                        <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.24em", color: "#EF5D08" }}>{entry.year}</p>
                        <h3 style={{ marginTop: "0.5rem", fontSize: "1.25rem", fontWeight: 700, color: "#EBEBEB" }}>{entry.title}</h3>
                        <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", lineHeight: 1.6, color: "#9a9a9a" }}>{entry.description}</p>
                      </article>
                    </>
                  )}
                  <div style={{ position: "absolute", left: "50%", top: "1.75rem", height: "0.75rem", width: "0.75rem", borderRadius: "50%", background: "#EF5D08", transform: "translateX(-50%)" }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <h2 className="text-center text-2xl font-bold tracking-tight text-[#EBEBEB] sm:text-3xl">
            OUR VALUES
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
            {values.map((value) => (
              <article
                key={value.title}
                className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] text-center shadow-sm transition-colors hover:border-[#EF5D08]"
                style={{ padding: "1.5rem" }}
              >
                <div className="text-3xl" aria-hidden="true">
                  {value.icon}
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#EBEBEB]">
                  {value.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#9a9a9a]">
                  {value.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "56rem", border: "2px dashed #EF5D08", borderRadius: "1.5rem", padding: "4rem 2rem", textAlign: "center", boxSizing: "border-box" }}>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "#EBEBEB", textAlign: "center" }}>Join Team Vegavath</h2>
            <p style={{ marginTop: "1rem", color: "#9a9a9a", fontSize: "1.1rem", textAlign: "center" }}>Be part of a community building the future of mobility and technology</p>
            <div style={{ marginTop: "2rem", textAlign: "center" }}>
              <Link href="/join" style={{ display: "inline-flex", alignItems: "center", background: "white", color: "#EF5D08", fontWeight: 700, fontSize: "1.1rem", borderRadius: "9999px", padding: "0.875rem 2.5rem", textDecoration: "none" }}>
                Apply Now 🏁
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
