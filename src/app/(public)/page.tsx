import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getUpcomingEvents, getPastEvents } from "@/lib/services/events";
import { getActiveSponsors } from "@/lib/services/sponsors";
import HeroDomains from "@/components/home/HeroDomains";
import KartModelWrapper from "@/components/home/KartModelWrapper";

export const metadata: Metadata = {
  title: "Team Vegavath | Innovation in Automotive, Robotics & Technology",
};

export const revalidate = 60;

const domains = [
  {
    name: "Automotive",
    description: "High-performance systems for race-ready electric karts.",
  },
  {
    name: "Robotics",
    description: "Autonomous workflows, sensing, and control integration.",
  },
  {
    name: "Design",
    description: "Human-centric product, CAD, and rapid prototyping.",
  },
  {
    name: "Media",
    description: "Storytelling, documentation, and creative production.",
  },
  {
    name: "Marketing",
    description: "Partnership growth and strategic team outreach.",
  },
];

function formatEventDate(date: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

type EventPreview = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  cover_image_url: string | null;
};

export default async function HomePage() {
  const [upcomingEvents, pastEvents, sponsors] = await Promise.all([
    (async (): Promise<EventPreview[]> => {
      try {
        return await getUpcomingEvents(3);
      } catch {
        return [];
      }
    })(),
    (async (): Promise<EventPreview[]> => {
      try {
        return await getPastEvents(3);
      } catch {
        return [];
      }
    })(),
    (async () => {
      try {
        return await getActiveSponsors();
      } catch {
        return [];
      }
    })(),
  ]);

  return (
    <div className="w-full bg-[#121212] text-[#EBEBEB]">
      <section className="relative flex min-h-screen items-center justify-center bg-[#121212] px-6 py-16">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-[#EF5D08]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#EF5D08]/10 blur-3xl" />

        <div className="relative z-10 text-center" style={{ maxWidth: "56rem", margin: "0 auto" }}>
          <h1 className="font-black uppercase leading-none tracking-wide text-white" style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}>
            WELCOME TO{" "}
            <span style={{ backgroundImage: "linear-gradient(to right, #EF5D08, #F29C04)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              VEGAVATH
            </span>
          </h1>

          <p className="mt-6 font-light text-gray-300" style={{ fontSize: "clamp(1.2rem, 2.5vw, 2rem)" }}>
            Life At{" "}
            <span style={{ color: "#EF5D08", fontWeight: 600 }}>Full Throttle</span>
          </p>

          <HeroDomains />

          <div style={{ marginTop: "3rem", display: "flex", justifyContent: "center", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/about" className="font-semibold text-[#9a9a9a] transition-colors hover:text-[#EBEBEB]" style={{ fontSize: "1rem" }}>
              Explore Vegavath →
            </Link>
            <Link href="/join">
              <button style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #EF5D08, #d44f06, #c44000)",
                color: "white",
                fontWeight: "700",
                fontSize: "0.9rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 0 40px rgba(239,93,8,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column" as const,
              }}>
                Start<br />Engine
              </button>
            </Link>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#121212]" />
      </section>

      <section className="w-full bg-[#121212] px-6 py-20">
        <div className="w-full max-w-6xl" style={{ margin: "0 auto" }}>
          <h2 className="mb-8 text-center text-2xl font-bold text-[#EBEBEB]">Our Build</h2>
          <KartModelWrapper />
        </div>
      </section>

      <section className="w-full bg-[#1a1a1a] px-6 py-20">
        <div className="w-full max-w-7xl" style={{ margin: "0 auto" }}>
          <h2 className="mb-12 text-center text-3xl font-black text-[#EBEBEB]">Our Domains</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {domains.map((domain) => (
              <div
                key={domain.name}
                className="rounded-xl border border-[#2a2a2a] bg-[#121212] p-6 transition-colors hover:border-[#EF5D08]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#EF5D08] text-sm font-bold text-white">
                  {domain.name[0]}
                </div>
                <h3 className="text-lg font-bold text-[#EBEBEB]">{domain.name}</h3>
                <p className="mt-2 text-sm text-[#9a9a9a]">{domain.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-[#121212] px-6 py-20">
        <div className="w-full max-w-7xl" style={{ margin: "0 auto" }}>
          <h2 className="mb-8 text-center text-3xl font-black text-[#EBEBEB]">Upcoming Events</h2>
          {upcomingEvents.length === 0 ? (
            <p className="text-center text-[#9a9a9a]">No upcoming events. Check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {upcomingEvents.slice(0, 3).map((event) => (
                <article
                  key={event.id}
                  className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-colors hover:border-[#EF5D08]"
                >
                  <div className="relative aspect-video w-full bg-[#121212]">
                    {event.cover_image_url ? (
                      <Image
                        src={event.cover_image_url}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-[#EBEBEB]">{event.title}</h3>
                    <p className="mt-1 text-sm text-[#9a9a9a]">{formatEventDate(event.event_date)}</p>
                    <Link
                      href={`/events/${event.slug}`}
                      className="mt-4 inline-flex rounded-lg bg-[#EF5D08] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d44f06]"
                    >
                      View Details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="mt-8 text-center">
            <Link href="/events" className="text-sm font-semibold text-[#EF5D08] hover:text-[#F29C04]">
              View All Events
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full bg-[#1a1a1a] px-6 py-20">
        <div className="w-full max-w-7xl" style={{ margin: "0 auto" }}>
          <h2 className="mb-8 text-center text-3xl font-black text-[#EBEBEB]">Past Events</h2>
          {pastEvents.length === 0 ? (
            <p className="text-center text-[#9a9a9a]">No past events available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {pastEvents.slice(0, 3).map((event) => (
                <article
                  key={event.id}
                  className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-colors hover:border-[#EF5D08]"
                >
                  <div className="relative aspect-video w-full bg-[#121212]">
                    {event.cover_image_url ? (
                      <Image
                        src={event.cover_image_url}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-[#EBEBEB]">{event.title}</h3>
                    <p className="mt-1 text-sm text-[#9a9a9a]">{formatEventDate(event.event_date)}</p>
                    <Link
                      href={`/events/${event.slug}`}
                      className="mt-4 inline-flex rounded-lg bg-[#EF5D08] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d44f06]"
                    >
                      View Details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="mt-8 text-center">
            <Link href="/events" className="text-sm font-semibold text-[#EF5D08] hover:text-[#F29C04]">
              View All Events
            </Link>
          </div>
        </div>
      </section>

      {sponsors.length > 0 ? (
        <section className="w-full bg-[#121212] px-6 py-16">
          <div className="w-full max-w-6xl" style={{ margin: "0 auto" }}>
            <h2 className="mb-8 text-center text-3xl font-black text-[#EBEBEB]">Our Partners</h2>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {sponsors.map((sponsor) => (
                <Link
                  key={sponsor.id}
                  href={sponsor.website_url ?? "#"}
                  target={sponsor.website_url ? "_blank" : undefined}
                  rel={sponsor.website_url ? "noreferrer" : undefined}
                  className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4"
                >
                  <Image
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    width={120}
                    height={60}
                    className="h-[60px] w-[120px] object-contain opacity-70 transition-opacity hover:opacity-100"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="w-full bg-[#EF5D08] px-6 py-24 text-white">
        <div className="max-w-4xl text-center" style={{ margin: "0 auto" }}>
          <h2 className="text-4xl font-black">Join Team Vegavath</h2>
          <p className="mt-4 text-white/80">
            Be part of a community building the future of mobility and technology
          </p>
          <div className="mt-8">
            <Link
              href="/join"
              className="inline-flex rounded-lg bg-white px-8 py-3 font-bold text-[#EF5D08] transition-colors hover:bg-[#EBEBEB]"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}