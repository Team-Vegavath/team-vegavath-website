import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { getActiveSponsors } from "@/lib/services/sponsors";

export const metadata: Metadata = {
  title: "About | Team Vegavath",
};

export const revalidate = 120;

const missionText =
  "To create a future-ready community where technology, innovation, and teamwork converge — shaping the next generation of leaders in mobility, robotics, and digital transformation.";

const domains = [
  "Automotive Engineering",
  "Robotics",
  "Design",
  "Media & Marketing",
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
    title: "Vegavath Technical Club Founded",
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
    <main className="bg-[#121212] text-[#EBEBEB]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-12 sm:px-6 lg:gap-24 lg:px-8 lg:py-16">
        <section className="grid gap-8 md:grid-cols-2 md:items-center">
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

          <div className="aspect-video rounded-3xl bg-[#2a2a2a]" />
        </section>

        <section className="rounded-3xl border border-[#2a2a2a] bg-[#1a1a1a] px-6 py-10 text-center shadow-sm sm:px-8">
          <h2 className="text-2xl font-bold text-[#EBEBEB] sm:text-3xl">
            Our Mission
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-[#9a9a9a] sm:text-lg">
            {missionText}
          </p>
        </section>

        <section className="space-y-8">
          <h2 className="text-2xl font-bold tracking-tight text-[#EBEBEB] sm:text-3xl">
            What We Do
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {domains.map((domain) => (
              <article
                key={domain}
                className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 shadow-sm transition-colors hover:border-[#EF5D08]"
              >
                <div className="h-16 w-16 rounded bg-[#2a2a2a]" />
                <h3 className="mt-5 text-lg font-bold text-[#EBEBEB]">{domain}</h3>
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full rounded bg-[#2a2a2a]" />
                  <div className="h-3 w-4/5 rounded bg-[#2a2a2a]" />
                </div>
              </article>
            ))}
          </div>
        </section>

        {sponsors.length > 0 ? (
          <section className="space-y-8 overflow-hidden">
            <h2 className="text-2xl font-bold tracking-tight text-[#EBEBEB] sm:text-3xl">
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

        <section className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6 rounded-3xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 sm:p-8">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-[#EBEBEB]">
                OUR JOURNEY &amp; WHAT WE DO
              </h2>
              <p className="text-base leading-7 text-[#9a9a9a]">
                Rooted in our racing heritage, Team Vegavath has grown into a
                collaborative student club building across mobility, robotics,
                software, design, and outreach. We turn ambitious ideas into
                prototypes, competitions, and hands-on learning experiences.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#222222] p-5 shadow-sm">
                <p className="text-2xl font-black text-[#EF5D08]">10+</p>
                <p className="mt-1 text-sm font-medium text-[#9a9a9a]">Projects</p>
              </div>
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#222222] p-5 shadow-sm">
                <p className="text-2xl font-black text-[#EF5D08]">3+</p>
                <p className="mt-1 text-sm font-medium text-[#9a9a9a]">Awards</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-3xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 shadow-sm sm:p-8">
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
            <div className="absolute left-4 top-0 h-full w-px bg-[#2a2a2a] md:left-1/2 md:-translate-x-1/2" />

            <div className="space-y-8">
              {timelineEntries.map((entry, index) => (
                <div
                  key={entry.year}
                  className={`relative grid gap-4 md:grid-cols-2 ${
                    index % 2 === 0 ? "" : "md:[&>div:first-child]:order-2"
                  }`}
                >
                  <div
                    className={`pl-12 md:pl-0 ${
                      index % 2 === 0 ? "md:pr-10" : "md:pl-10"
                    }`}
                  >
                    <article className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 shadow-sm transition-colors hover:border-[#EF5D08]">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#EF5D08]">
                        {entry.year}
                      </p>
                      <h3 className="mt-2 text-xl font-bold text-[#EBEBEB]">
                        {entry.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-[#9a9a9a] sm:text-base">
                        {entry.description}
                      </p>
                    </article>
                  </div>

                  <div className="hidden md:block" />

                  <div className="absolute left-4 top-8 h-3 w-3 -translate-x-1/2 rounded-full border-4 border-[#121212] bg-[#EF5D08] md:left-1/2" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <h2 className="text-center text-2xl font-bold tracking-tight text-[#EBEBEB] sm:text-3xl">
            OUR VALUES
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <article
                key={value.title}
                className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 text-center shadow-sm transition-colors hover:border-[#EF5D08]"
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

        <section className="rounded-3xl bg-[#121212] px-6 py-12 text-center text-[#EBEBEB] sm:px-8 border border-[#2a2a2a]">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            Join Vegavath Technical Club
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#9a9a9a] sm:text-lg">
            Bring your curiosity, build with a passionate team, and grow through
            real projects in mobility, robotics, and technology.
          </p>
          <Link
            href="/join"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[#EF5D08] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#d44f06]"
          >
            Join Now
          </Link>
        </section>
      </div>
    </main>
  );
}
