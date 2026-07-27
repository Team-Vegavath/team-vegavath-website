import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import F1Paused from "@/components/f1/F1Paused";
import { F1Section } from "@/components/f1/F1Table";
import {
  constructorColor,
  driverImage,
  getF1DriverConstructors,
  getF1DriverInfo,
  getF1DriverSeasonStanding,
  getF1DriverSeasons,
} from "@/lib/services/f1";
import { getF1Enabled } from "@/lib/services/settings";

export const revalidate = 60;

type DriverPageProps = {
  params: Promise<{ driverId: string }>;
};

// S54: generateStaticParams REMOVED, and its removal is the fix for the empty
// calendar on prod. It prerendered the 22-driver grid at build, and each of those
// pages costs ~5 Jolpica calls (metadata + info + seasons + constructors +
// standing) -- ~110 requests inside a few seconds, on top of the ~70 the other
// /f1 pages fire. Measured: 14 concurrent requests to api.jolpi.ca returns 429
// on 9 of them. Whichever call loses that race returns null, and Next caches the
// failed response under its fetch revalidate window, so a 429 on
// /f1/current/races.json left the calendar empty for a full day while
// page-level revalidate=60 happily re-rendered against the poisoned entry.
// Driver pages now render on first request and are ISR-cached from there, which
// spreads the same requests across real traffic instead of one build burst.
// ponytail: /f1/seasons still fans out 60 concurrent calls in one Promise.all
// (SEASON_CAP 30 x 2) -- the next-largest burst, not touched this session.

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

      <header
        style={{
          marginBottom: "3rem",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        {/* S55: R2 now holds full-body shots for the current grid, so the S54
            helmet-silhouette placeholder is the fallback rather than the whole
            treatment. Historical and reserve drivers keep it. F1Driver has no
            constructorId -- the team colour comes off the standings row, and
            pre-1950s archive drivers with no standing fall through to
            constructorColor's token default. */}
        {driverImage(driver.driverId) ? (
          <div
            style={{
              width: "160px",
              height: "200px",
              flexShrink: 0,
              overflow: "hidden",
              // Team colour behind the shot: the source PNGs are cut-outs, so
              // without it a transparent edge sits on the page background.
              background: constructorColor(standing?.Constructors[0]?.constructorId),
            }}
          >
            {/* Plain <img>: same call the posts list card makes for R2 art. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={driverImage(driver.driverId)!}
              alt={`${driver.givenName} ${driver.familyName}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                // Crops from the top of a full-body suit shot: head and torso.
                objectPosition: "top center",
              }}
            />
          </div>
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: "104px",
              height: "104px",
              flexShrink: 0,
              background: constructorColor(standing?.Constructors[0]?.constructorId),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="56" height="56" viewBox="0 0 60 60" fill="none">
              <ellipse cx="30" cy="24" rx="18" ry="16" fill="var(--bg-base)" opacity="0.55" />
              <rect x="15" y="32" width="30" height="12" fill="var(--bg-base)" opacity="0.55" />
              <rect x="18" y="27" width="24" height="8" fill="var(--bg-base)" opacity="0.35" />
            </svg>
          </div>
        )}

        <div>
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
        </div>
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
