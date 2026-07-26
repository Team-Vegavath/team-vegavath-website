import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import F1Paused from "@/components/f1/F1Paused";
import { F1Section } from "@/components/f1/F1Table";
import {
  getF1DriverConstructors,
  getF1DriverInfo,
  getF1DriverSeasonStanding,
  getF1DriverSeasons,
  getF1DriverStandings,
} from "@/lib/services/f1";
import { getF1Enabled } from "@/lib/services/settings";

export const revalidate = 60;

type DriverPageProps = {
  params: Promise<{ driverId: string }>;
};

// Only the current grid is pre-rendered. The full archive is ~880 drivers, which
// would dominate build time; everything else renders on first request.
export async function generateStaticParams() {
  const standings = await getF1DriverStandings().catch(() => null);
  return (standings?.standings ?? []).map((row) => ({
    driverId: row.Driver.driverId,
  }));
}

export async function generateMetadata({
  params,
}: DriverPageProps): Promise<Metadata> {
  const { driverId } = await params;
  const driver = await getF1DriverInfo(driverId).catch(() => null);
  return {
    title: driver ? `${driver.givenName} ${driver.familyName}` : "F1 Driver",
    ...(driver
      ? {
          description: `Formula 1 career record for ${driver.givenName} ${driver.familyName}: seasons raced, constructors and championship standings.`,
        }
      : {}),
    alternates: { canonical: `/f1/drivers/${driverId}` },
  };
}

function formatDob(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function F1DriverPage({ params }: DriverPageProps) {
  const f1Enabled = await getF1Enabled().catch(() => false);
  if (!f1Enabled) return <F1Paused />;

  const { driverId } = await params;
  const driver = await getF1DriverInfo(driverId);

  if (!driver) {
    notFound();
  }

  const [seasons, constructors] = await Promise.all([
    getF1DriverSeasons(driverId),
    getF1DriverConstructors(driverId),
  ]);

  // Latest season they appear in, used for the standings row. Falls back to
  // nothing if the seasons list came back empty.
  const latestSeason = seasons.length > 0 ? seasons[seasons.length - 1]?.season : undefined;
  const standing = latestSeason
    ? await getF1DriverSeasonStanding(latestSeason, driverId)
    : null;

  const firstSeason = seasons[0]?.season;
  const seasonsActive =
    firstSeason && latestSeason
      ? firstSeason === latestSeason
        ? firstSeason
        : `${firstSeason} - ${latestSeason}`
      : "-";

  return (
    <>
      <Link
        href="/f1/drivers"
        className="mono"
        style={{
          display: "inline-block",
          marginBottom: "2.5rem",
          fontSize: "0.72rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          textDecoration: "none",
        }}
      >
        ← Drivers
      </Link>

      <header style={{ marginBottom: "3rem" }}>
        {driver.code ? (
          <p className="label-tech" style={{ color: "var(--accent)" }}>
            {driver.code}
            {driver.permanentNumber ? ` · No. ${driver.permanentNumber}` : ""}
          </p>
        ) : null}
        <h1
          className="heading"
          style={{
            marginTop: "0.6rem",
            fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          {driver.givenName} {driver.familyName}
        </h1>
      </header>

      <F1Section title="Profile">
        <div className="f1-facts">
          <div className="f1-fact">
            <span className="f1-fact-label">Nationality</span>
            <span className="f1-fact-value">{driver.nationality}</span>
          </div>
          <div className="f1-fact">
            <span className="f1-fact-label">Date of Birth</span>
            <span className="f1-fact-value">{formatDob(driver.dateOfBirth)}</span>
          </div>
          <div className="f1-fact">
            <span className="f1-fact-label">Seasons Active</span>
            <span className="f1-fact-value">{seasonsActive}</span>
          </div>
          <div className="f1-fact">
            <span className="f1-fact-label">Season Count</span>
            <span className="f1-fact-value">{seasons.length || "-"}</span>
          </div>
        </div>
      </F1Section>

      {standing && latestSeason ? (
        <F1Section title={`${latestSeason} Championship`}>
          <div className="f1-facts">
            <div className="f1-fact">
              <span className="f1-fact-label">Position</span>
              <span className="f1-fact-value">{standing.positionText}</span>
            </div>
            <div className="f1-fact">
              <span className="f1-fact-label">Points</span>
              <span className="f1-fact-value">{standing.points}</span>
            </div>
            <div className="f1-fact">
              <span className="f1-fact-label">Wins</span>
              <span className="f1-fact-value">{standing.wins}</span>
            </div>
            <div className="f1-fact">
              <span className="f1-fact-label">Team</span>
              <span className="f1-fact-value">
                {standing.Constructors.map((c) => c.name).join(", ") || "-"}
              </span>
            </div>
          </div>
        </F1Section>
      ) : null}

      <F1Section title="Teams" subtitle="Every constructor they have raced for">
        {constructors.length > 0 ? (
          <div className="f1-facts">
            {constructors.map((constructor) => (
              <div className="f1-fact" key={constructor.constructorId}>
                <span className="f1-fact-label">{constructor.nationality}</span>
                <span className="f1-fact-value">{constructor.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p
            className="mono"
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Team history unavailable
          </p>
        )}
      </F1Section>

      <F1Section title="Reference">
        <a
          href={driver.url}
          target="_blank"
          rel="noreferrer"
          className="mono"
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.1em",
            color: "var(--accent)",
            textDecoration: "none",
          }}
        >
          Wikipedia entry ↗
        </a>
      </F1Section>
    </>
  );
}
