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
      <section className="relative flex min-h-screen items-center justify-center bg-[#121212] px-6 py-16" style={{ justifyContent: "center" }}>
        {/* Ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 rounded-full bg-[#EF5D08]/10 blur-3xl" style={{ width: "min(80vw, 384px)", height: "min(80vw, 384px)" }} />
        <div className="pointer-events-none absolute left-1/2 bottom-1/4 -translate-x-1/2 rounded-full bg-[#EF5D08]/10 blur-3xl" style={{ width: "min(80vw, 384px)", height: "min(80vw, 384px)" }} />

        <div className="relative z-10 text-center" style={{ maxWidth: "56rem", margin: "0 auto", textAlign: "center" }}>
          <h1 className="font-black uppercase leading-none tracking-wide text-white" style={{ fontSize: "clamp(3rem, 8vw, 7rem)", textAlign: "center" }}>
            WELCOME TO{" "}
            <span style={{ backgroundImage: "linear-gradient(to right, #EF5D08, #F29C04)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              VEGAVATH
            </span>
          </h1>

          <p className="mt-6 font-light text-gray-300" style={{ fontSize: "clamp(1.2rem, 2.5vw, 2rem)" }}>
            Life At{" "}
            <span style={{ color: "#EF5D08", fontWeight: 600 }}>Full Throttle</span>
          </p>

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

      <section className="w-full bg-[#121212] px-6 py-24 md:py-28" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="w-full max-w-6xl center-wrap" style={{ margin: "0 auto", paddingLeft: "0.75rem", paddingRight: "0.75rem" }}>
          <h2 className="mb-12 text-center text-4xl font-black text-[#EBEBEB] text-mid" style={{ textAlign: "center" }}>Our Build</h2>
          <KartModelWrapper />
          <div className="flex-mid" style={{ marginTop: "3.5rem", display: "flex", justifyContent: "center", textAlign: "center" }}>
            <HeroDomains />
          </div>
        </div>
      </section>

      <section className="w-full bg-[#121212] px-6 pb-24 pt-28 md:pb-28 md:pt-32" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "4rem" }}>
        <div className="w-full max-w-7xl center-wrap" style={{ margin: "0 auto", paddingLeft: "1rem", paddingRight: "1rem" }}>
          <h2 className="mb-10 text-center font-black text-[#EBEBEB] text-mid" style={{ fontSize: "2.5rem", textAlign: "center" }}>Upcoming Events</h2>
          {upcomingEvents.length === 0 ? (
            <p className="text-center text-[#9a9a9a]" style={{ textAlign: "center" }}>No upcoming events. Check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 center-wrap" style={{ paddingLeft: "0.75rem", paddingRight: "0.75rem" }}>
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
                    <h3 className="font-bold text-[#EBEBEB]" style={{ fontSize: "1.25rem" }}>{event.title}</h3>
                    <p className="mt-1 text-[#9a9a9a]" style={{ fontSize: "1rem" }}>{formatEventDate(event.event_date)}</p>
                    <Link
                      href={`/events/${event.slug}`}
                      className="mt-4 inline-flex border-[#EF5D08] text-[#EF5D08] transition-colors hover:border-[#d44f06] hover:text-[#d44f06]"
                      style={{
                        alignItems: "center",
                        borderRadius: "9999px",
                        border: "1.5px solid #EF5D08",
                        background: "transparent",
                        padding: "0.5rem 1.25rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      View Details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="mt-10 text-center" style={{ textAlign: "center" }}>
            <Link
              href="/events"
              className="inline-flex border-[#EF5D08] text-[#EF5D08] transition-colors hover:border-[#d44f06] hover:text-[#d44f06]"
              style={{
                alignItems: "center",
                borderRadius: "9999px",
                border: "1.5px solid #EF5D08",
                background: "transparent",
                padding: "0.6rem 1.5rem",
                fontSize: "0.9rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View All Events
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full bg-[#1a1a1a] px-6 py-24 md:py-28" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "3rem" }}>
        <div className="w-full max-w-7xl center-wrap" style={{ margin: "0 auto" }}>
          <h2 className="mb-10 text-center font-black text-[#EBEBEB] text-mid" style={{ fontSize: "2.5rem", textAlign: "center" }}>Past Events</h2>
          {pastEvents.length === 0 ? (
            <p className="text-center text-[#9a9a9a]" style={{ textAlign: "center" }}>No past events available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 center-wrap" style={{ paddingLeft: "0.75rem", paddingRight: "0.75rem" }}>
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
                    <h3 className="font-bold text-[#EBEBEB]" style={{ fontSize: "1.25rem" }}>{event.title}</h3>
                    <p className="mt-1 text-[#9a9a9a]" style={{ fontSize: "1rem" }}>{formatEventDate(event.event_date)}</p>
                    <Link
                      href={`/events/${event.slug}`}
                      className="mt-4 inline-flex border-[#EF5D08] text-[#EF5D08] transition-colors hover:border-[#d44f06] hover:text-[#d44f06]"
                      style={{
                        alignItems: "center",
                        borderRadius: "9999px",
                        border: "1.5px solid #EF5D08",
                        background: "transparent",
                        padding: "0.5rem 1.25rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      View Details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="mt-10 text-center" style={{ textAlign: "center" }}>
            <Link
              href="/events"
              className="inline-flex border-[#EF5D08] text-[#EF5D08] transition-colors hover:border-[#d44f06] hover:text-[#d44f06]"
              style={{
                alignItems: "center",
                borderRadius: "9999px",
                border: "1.5px solid #EF5D08",
                background: "transparent",
                padding: "0.6rem 1.5rem",
                fontSize: "0.9rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View All Events
            </Link>
          </div>
        </div>
      </section>

      {sponsors.length > 0 ? (
        <section className="w-full bg-[#121212] px-6 py-24 md:py-28" style={{ overflow: "hidden", marginTop: "3rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="w-full max-w-6xl center-wrap" style={{ margin: "0 auto", paddingLeft: "1rem", paddingRight: "1rem" }}>
            <h2 className="mb-12 text-center text-4xl font-black text-[#EBEBEB] text-mid" style={{ textAlign: "center" }}>Our Partners</h2>
            <div style={{ overflow: "hidden", borderRadius: "1.5rem", border: "1px solid #2a2a2a", background: "#1a1a1a", padding: "2rem 0", margin: "0 auto" }}>
              <div style={{ display: "flex", width: "max-content", alignItems: "center", gap: "2.5rem", paddingLeft: "2.5rem", animation: "sponsor-marquee 24s linear infinite" }}>
                {[...sponsors, ...sponsors].map((sponsor, index) => (
                  <a
                    key={`${sponsor.id}-${index}`}
                    href={sponsor.website_url ?? "#"}
                    target={sponsor.website_url ? "_blank" : undefined}
                    rel={sponsor.website_url ? "noreferrer" : undefined}
                    style={{ display: "flex", alignItems: "center", gap: "1.25rem", minWidth: "260px", background: "#222222", border: "1px solid #2a2a2a", borderRadius: "1.25rem", padding: "1.25rem 1.75rem", textDecoration: "none", transition: "border-color 0.2s" }}
                  >
                    <Image
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      width={160}
                      height={80}
                      style={{ height: "80px", width: "160px", objectFit: "contain", opacity: 0.85 }}
                    />
                    <p style={{ fontSize: "1rem", fontWeight: 600, color: "#EBEBEB", whiteSpace: "nowrap" }}>{sponsor.name}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="w-full px-6 py-28 md:py-32" style={{ marginTop: "3rem", background: "#0e0e0e", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
        <div style={{ margin: "0 auto", maxWidth: "56rem", border: "2px dashed #EF5D08", borderRadius: "1.5rem", padding: "4rem 2rem", textAlign: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h2 className="text-mid" style={{ fontSize: "2.5rem", fontWeight: 900, color: "#EBEBEB", textAlign: "center" }}>Join Team Vegavath</h2>
            <p style={{ marginTop: "1rem", color: "#9a9a9a", fontSize: "1.1rem" }}>
              Be part of a community building the future of mobility and technology
            </p>
          </div>
          <div className="mt-8">
            <Link
              href="/join"
              style={{ display: "inline-flex", alignItems: "center", background: "white", color: "#EF5D08", fontWeight: 700, fontSize: "1.1rem", borderRadius: "9999px", padding: "0.875rem 2.5rem", textDecoration: "none", transition: "background 0.2s" }}
            >
              Apply Now 🏁
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}