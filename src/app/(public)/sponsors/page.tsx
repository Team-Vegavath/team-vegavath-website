import Image from "next/image";
import type { Metadata } from "next";
import { getActiveSponsors } from "@/lib/services/sponsors";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Sponsors",
  description:
    "Team Vegavath's past event partners include Xylem, Ather Energy, Paper Boat, Mahindra, BMW Motorrad, and SOLIDWORKS.",
  alternates: { canonical: "/sponsors" },
  openGraph: {
    title: "Sponsors | Team Vegavath",
    description:
      "Past event partners: Xylem, Ather Energy, Paper Boat, Mahindra, BMW Motorrad, SOLIDWORKS.",
  },
};

export const revalidate = 120;

export default async function SponsorsPage() {
  let sponsors = [] as Awaited<ReturnType<typeof getActiveSponsors>>;

  try {
    sponsors = await getActiveSponsors();
  } catch {
    sponsors = [];
  }

  const premium = sponsors.filter((s) => s.tier === "premium");
  const community = sponsors.filter((s) => s.tier === "community");

  return (
    <main style={{ background: "var(--bg-base)", color: "var(--text-primary)", overflowX: "hidden", minHeight: "100vh" }}>
      <section style={{ width: "100%", padding: "9rem 0 6rem" }}>
        <Container>
          <div style={{ display: "flex", flexDirection: "column", gap: "4.5rem" }}>
            <header>
              <p className="label-tech" style={{ color: "var(--accent)", marginBottom: "0.75rem" }}>
                The partners who power the build
              </p>
              <h1 className="heading" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                Sponsors
              </h1>
              <p style={{ marginTop: "1rem", fontSize: "0.85rem", lineHeight: 1.7, color: "var(--text-muted)" }}>
                Past event partners who have supported Team Vegavath activities.
              </p>
            </header>

            {premium.length > 0 && (
              <section style={{ width: "100%" }}>
                <p className="label-tech" style={{ color: "var(--accent)", marginBottom: "1.5rem" }}>
                  Premium partners
                </p>
                <div className="sponsor-grid">
                  {premium.map((sponsor) => (
                    <article
                      key={sponsor.id}
                      className="sponsor-card"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "2px solid var(--accent)", padding: "2rem 1.75rem" }}
                    >
                      <Image
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        width={200}
                        height={64}
                        className="sponsor-logo"
                        unoptimized // small logo, no WebP/multi-size benefit
                      />
                      <h2 className="heading" style={{ marginTop: "1.5rem", fontSize: "1.15rem", fontWeight: 600 }}>
                        {sponsor.name}
                      </h2>
                      {sponsor.description && (
                        <p style={{ marginTop: "0.6rem", fontSize: "0.9rem", lineHeight: 1.65, color: "var(--text-secondary)" }}>
                          {sponsor.description}
                        </p>
                      )}
                      {sponsor.website_url && (
                        <a
                          href={sponsor.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="heading"
                          style={{ marginTop: "1rem", display: "inline-block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", textDecoration: "none" }}
                        >
                          Visit website →
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {community.length > 0 && (
              <section style={{ width: "100%" }}>
                <p className="label-tech" style={{ marginBottom: "1.5rem" }}>
                  Community partners
                </p>
                <div className="sponsor-grid-dense">
                  {community.map((sponsor) => (
                    <article
                      key={sponsor.id}
                      className="sponsor-card"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", padding: "1.5rem" }}
                    >
                      <Image
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        width={160}
                        height={48}
                        className="sponsor-logo"
                        style={{ height: "48px", maxWidth: "160px" }}
                        unoptimized // small logo, no WebP/multi-size benefit
                      />
                      <h2 className="heading" style={{ marginTop: "1.1rem", fontSize: "0.98rem", fontWeight: 600 }}>
                        {sponsor.name}
                      </h2>
                      {sponsor.description && (
                        <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                          {sponsor.description}
                        </p>
                      )}
                      {sponsor.website_url && (
                        <a
                          href={sponsor.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="heading"
                          style={{ marginTop: "0.85rem", display: "inline-block", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", textDecoration: "none" }}
                        >
                          Visit website →
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section style={{ borderTop: "1px solid var(--border)", paddingTop: "3rem" }}>
              <h2 className="heading" style={{ fontSize: "clamp(1.25rem, 3vw, 1.6rem)", fontWeight: 700, textTransform: "uppercase" }}>
                Sponsor Vegavath
              </h2>
              <p style={{ marginTop: "0.6rem", maxWidth: "38rem", fontSize: "0.95rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
                Partner with us to reach passionate engineering students and back the teams building
                karts, robots, and campus-scale events at PESU ECC.
              </p>
              <a href="mailto:teamvegavathracing@pes.edu" className="btn-primary" style={{ marginTop: "1.75rem" }}>
                BECOME A SPONSOR
              </a>
            </section>
          </div>
        </Container>
      </section>
    </main>
  );
}
