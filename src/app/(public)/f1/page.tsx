import type { Metadata } from "next";
import Link from "next/link";

import F1Paused from "@/components/f1/F1Paused";
import { F1Empty, F1Section, F1Table } from "@/components/f1/F1Table";
import {
  constructorColor,
  constructorLogo,
  getF1ConstructorStandings,
  getF1CurrentSchedule,
  getF1DriverStandings,
  getF1LastRaceResult,
  getF1NextRace,
} from "@/lib/services/f1";
import { getF1Enabled } from "@/lib/services/settings";

export const metadata: Metadata = {
  title: "F1",
  description:
    "Formula 1 stats and data -- driver standings, constructor standings, race calendar and results.",
  alternates: { canonical: "/f1" },
  openGraph: {
    title: "F1 Stats | Team Vegavath",
    description:
      "Current season driver and constructor standings, race calendar, and results.",
  },
};

// Page-level revalidate is 60, not 3600, so the admin kill switch takes effect
// within a minute. Egress is still bounded by the per-fetch revalidate windows
// inside services/f1.ts (6h standings, 1h next race, 24h reference data): a
// re-render inside those windows re-uses the cached Jolpica payload.
export const revalidate = 60;

// S55: team cell -- logo where R2 has one, name where it does not. One component
// for all three tables that carry a Team column. Takes an array because driver
// standings can list two constructors for a mid-season switch; the other two
// tables pass a single-element array.
//
// Plain <img> and not next/image on purpose: the logos have mixed aspect ratios
// and are sized by height with width:auto, which next/image cannot do without
// intrinsic dimensions. Same call the posts list card makes for R2 thumbnails.
function TeamCell({
  constructors,
  height,
}: {
  constructors: { constructorId: string; name: string }[];
  height: number;
}) {
  if (constructors.length === 0) return <>--</>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
      {constructors.map((c) => {
        const logo = constructorLogo(c.constructorId);
        return logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={c.constructorId}
            src={logo}
            alt={c.name}
            style={{
              height: `${height}px`,
              width: "auto",
              objectFit: "contain",
              verticalAlign: "middle",
            }}
          />
        ) : (
          <span key={c.constructorId}>{c.name}</span>
        );
      })}
    </span>
  );
}

function formatRaceDate(date: string, time?: string): string {
  const iso = time ? `${date}T${time}` : date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function F1Page({
  searchParams,
}: {
  // S56: reading searchParams opts this page into dynamic rendering, so the
  // revalidate above no longer gates anything -- the kill switch now takes
  // effect on the next request instead of within a minute, which is strictly
  // better. Jolpica egress is unchanged: it is bounded by the per-fetch
  // revalidate windows in services/f1.ts, not by the page.
  searchParams: Promise<{ constructor?: string }>;
}) {
  const { constructor: activeConstructor } = await searchParams;

  // Kill switch first: if this is off, not a single Jolpica request is made.
  const f1Enabled = await getF1Enabled().catch(() => false);
  if (!f1Enabled) return <F1Paused />;

  const [drivers, constructors, schedule, lastRace, nextRace] = await Promise.all([
    getF1DriverStandings(),
    getF1ConstructorStandings(),
    getF1CurrentSchedule(),
    getF1LastRaceResult(),
    getF1NextRace(),
  ]);

  const season =
    drivers?.season ?? schedule[0]?.season ?? new Date().getFullYear().toString();

  // The filter only narrows the driver standings table. Constructor standings,
  // the last race and the calendar are unaffected on purpose -- filtering those
  // to one team leaves a one-row table and a calendar that says nothing.
  const driverRows = activeConstructor
    ? (drivers?.standings ?? []).filter((row) =>
        row.Constructors.some((c) => c.constructorId === activeConstructor)
      )
    : (drivers?.standings ?? []);

  return (
    <>
      <header style={{ marginBottom: "3.5rem" }}>
        <h1
          className="heading"
          style={{
            fontFamily: "var(--font-orbitron), sans-serif",
            fontSize: "clamp(2.5rem, 8vw, 5rem)",
            fontWeight: 700,
            letterSpacing: "0.04em",
            lineHeight: 1,
          }}
        >
          F1
        </h1>
        <p
          className="mono"
          style={{
            marginTop: "0.9rem",
            fontSize: "0.75rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {season} Formula 1 World Championship
        </p>
      </header>

      {/* NEXT RACE */}
      <F1Section title="Next Race">
        {nextRace ? (
          <div className="f1-facts">
            <div className="f1-fact">
              <span className="f1-fact-label">Round {nextRace.round}</span>
              <span className="f1-fact-value">{nextRace.raceName}</span>
            </div>
            <div className="f1-fact">
              <span className="f1-fact-label">Circuit</span>
              <span className="f1-fact-value">{nextRace.Circuit.circuitName}</span>
            </div>
            <div className="f1-fact">
              <span className="f1-fact-label">Location</span>
              <span className="f1-fact-value">
                {nextRace.Circuit.Location.locality},{" "}
                {nextRace.Circuit.Location.country}
              </span>
            </div>
            <div className="f1-fact">
              <span className="f1-fact-label">Race Day</span>
              <span className="f1-fact-value">
                {formatRaceDate(nextRace.date, nextRace.time)}
              </span>
            </div>
          </div>
        ) : (
          <p
            className="mono"
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Season Complete
          </p>
        )}
      </F1Section>

      {/* CONSTRUCTOR FILTER -- narrows the driver standings table only.
          Plain links, not client state: the filter is a URL the user can share
          and the page is already a server component. */}
      {constructors && constructors.standings.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "1.25rem",
            alignItems: "center",
          }}
        >
          <Link
            href="/f1#standings"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              padding: "0.35rem 0.75rem",
              border: `1px solid ${!activeConstructor ? "var(--accent)" : "var(--border)"}`,
              color: !activeConstructor ? "var(--accent)" : "var(--text-muted)",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
            }}
          >
            All
          </Link>
          {constructors.standings.map((standing) => {
            const cId = standing.Constructor.constructorId;
            const logo = constructorLogo(cId);
            const isActive = activeConstructor === cId;
            return (
              <Link
                key={cId}
                href={isActive ? "/f1#standings" : `/f1?constructor=${cId}#standings`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.35rem 0.6rem",
                  border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                  background: isActive
                    ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                    : "transparent",
                  textDecoration: "none",
                }}
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo}
                    alt=""
                    style={{
                      height: "18px",
                      width: "auto",
                      maxWidth: "40px",
                      objectFit: "contain",
                    }}
                  />
                ) : null}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.68rem",
                    color: isActive ? "var(--accent)" : "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {standing.Constructor.name}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}

      {/* DRIVER STANDINGS */}
      <F1Section
        id="standings"
        title="Driver Standings"
        subtitle={drivers ? `After round ${drivers.round}` : undefined}
      >
        <F1Table
          headers={["Pos", "Driver", "Nationality", "Team", "Pts", "Wins"]}
        >
          {driverRows.length > 0 ? (
            driverRows.map((row) => (
              <tr
                key={row.Driver.driverId}
                className={row.position === "1" ? "f1-leader" : undefined}
                // S54: team colour as a 3px left edge. tr borders paint because
                // .f1-table is border-collapse: collapse.
                style={{
                  borderLeft: `3px solid ${constructorColor(row.Constructors[0]?.constructorId)}`,
                }}
              >
                <td className="f1-pos">{row.positionText}</td>
                <td className="f1-name">
                  <Link href={`/f1/drivers/${row.Driver.driverId}`}>
                    {row.Driver.givenName} {row.Driver.familyName}
                  </Link>
                </td>
                <td>{row.Driver.nationality}</td>
                <td>
                  <TeamCell constructors={row.Constructors} height={20} />
                </td>
                <td className="f1-num">{row.points}</td>
                <td className="f1-num">{row.wins}</td>
              </tr>
            ))
          ) : (
            <F1Empty
              colSpan={6}
              message={
                activeConstructor && drivers
                  ? "No drivers for that constructor"
                  : "Standings unavailable"
              }
            />
          )}
        </F1Table>
      </F1Section>

      {/* CONSTRUCTOR STANDINGS */}
      <F1Section
        title="Constructor Standings"
        subtitle={constructors ? `After round ${constructors.round}` : undefined}
      >
        <F1Table headers={["Pos", "Constructor", "Nationality", "Pts", "Wins"]}>
          {constructors && constructors.standings.length > 0 ? (
            constructors.standings.map((row) => (
              <tr
                key={row.Constructor.constructorId}
                className={row.position === "1" ? "f1-leader" : undefined}
                style={{
                  borderLeft: `3px solid ${constructorColor(row.Constructor.constructorId)}`,
                }}
              >
                <td className="f1-pos">{row.positionText}</td>
                {/* Name stays alongside the logo here -- this table is ABOUT the
                    constructors, so dropping the text would leave the column
                    unreadable for anyone who does not know the liveries. */}
                <td className="f1-name">
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {constructorLogo(row.Constructor.constructorId) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={constructorLogo(row.Constructor.constructorId)!}
                        alt=""
                        style={{
                          height: "24px",
                          width: "auto",
                          objectFit: "contain",
                          verticalAlign: "middle",
                        }}
                      />
                    ) : null}
                    {/* Jolpica ships a Wikipedia url on every Constructor. */}
                    <a
                      href={row.Constructor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "inherit",
                        textDecoration: "underline",
                        textDecorationColor: "var(--border)",
                      }}
                    >
                      {row.Constructor.name}
                    </a>
                  </span>
                </td>
                <td>{row.Constructor.nationality}</td>
                <td className="f1-num">{row.points}</td>
                <td className="f1-num">{row.wins}</td>
              </tr>
            ))
          ) : (
            <F1Empty colSpan={5} message="Standings unavailable" />
          )}
        </F1Table>
      </F1Section>

      {/* LAST RACE */}
      <F1Section
        title={lastRace ? `Last Race: ${lastRace.raceName}` : "Last Race"}
        subtitle={
          lastRace
            ? `${lastRace.Circuit.circuitName} · ${formatRaceDate(lastRace.date, lastRace.time)}`
            : undefined
        }
      >
        <F1Table
          headers={["Pos", "Driver", "Team", "Laps", "Time / Status", "Pts"]}
        >
          {lastRace?.Results && lastRace.Results.length > 0 ? (
            lastRace.Results.map((row) => (
              <tr
                key={row.Driver.driverId}
                className={Number(row.position) <= 3 ? "f1-leader" : undefined}
                style={{
                  borderLeft: `3px solid ${constructorColor(row.Constructor.constructorId)}`,
                }}
              >
                <td className="f1-pos">{row.positionText}</td>
                <td className="f1-name">
                  <Link href={`/f1/drivers/${row.Driver.driverId}`}>
                    {row.Driver.givenName} {row.Driver.familyName}
                  </Link>
                </td>
                <td>
                  <TeamCell constructors={[row.Constructor]} height={20} />
                </td>
                <td className="f1-num">{row.laps}</td>
                <td className="f1-num">{row.Time?.time ?? row.status}</td>
                <td className="f1-num">{row.points}</td>
              </tr>
            ))
          ) : (
            <F1Empty colSpan={6} message="No race result available" />
          )}
        </F1Table>
      </F1Section>

      {/* RACE CALENDAR */}
      <F1Section id="calendar" title="Race Calendar" subtitle={`${season} season`}>
        <F1Table
          headers={["Rnd", "Race", "Circuit", "Country", "Qualifying", "Race Day"]}
        >
          {schedule.length > 0 ? (
            schedule.map((race) => {
              const isNext = nextRace?.round === race.round;
              // Past races are dimmed. Comparing rounds rather than dates keeps
              // this stable inside an ISR window: the same next-race payload
              // decides the whole table.
              const isPast =
                !isNext && nextRace
                  ? Number(race.round) < Number(nextRace.round)
                  : !nextRace;
              return (
                <tr
                  key={race.round}
                  className={isNext ? "f1-next" : isPast ? "f1-past" : undefined}
                >
                  <td className="f1-pos">{race.round}</td>
                  <td className="f1-name">
                    {race.raceName}
                    {isNext ? <span className="f1-badge">Next</span> : null}
                  </td>
                  <td>{race.Circuit.circuitName}</td>
                  <td>{race.Circuit.Location.country}</td>
                  {/* Session sub-objects are only present on the schedule
                      endpoint and only when the session exists. */}
                  <td className="f1-num">
                    {race.Qualifying
                      ? formatRaceDate(race.Qualifying.date, race.Qualifying.time)
                      : "-"}
                  </td>
                  <td className="f1-num">{formatRaceDate(race.date, race.time)}</td>
                </tr>
              );
            })
          ) : (
            <F1Empty colSpan={6} message="Calendar unavailable" />
          )}
        </F1Table>
      </F1Section>

      {/* EXPLORE */}
      <F1Section title="Explore">
        <div className="f1-link-grid">
          <Link href="/f1/drivers" className="f1-link-card">
            <span className="label-tech" style={{ color: "var(--accent)" }}>
              Drivers
            </span>
            <span className="heading" style={{ fontSize: "1.05rem", fontWeight: 600 }}>
              All Drivers
            </span>
            <span
              className="mono"
              style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
            >
              Grid, nationality and season form
            </span>
          </Link>
          <Link href="/f1/circuits" className="f1-link-card">
            <span className="label-tech" style={{ color: "var(--accent)" }}>
              Circuits
            </span>
            <span className="heading" style={{ fontSize: "1.05rem", fontWeight: 600 }}>
              All Circuits
            </span>
            <span
              className="mono"
              style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
            >
              Every track in championship history
            </span>
          </Link>
          <Link href="/f1/seasons" className="f1-link-card">
            <span className="label-tech" style={{ color: "var(--accent)" }}>
              Seasons
            </span>
            <span className="heading" style={{ fontSize: "1.05rem", fontWeight: 600 }}>
              Season History
            </span>
            <span
              className="mono"
              style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
            >
              Champions year by year
            </span>
          </Link>
        </div>
      </F1Section>
    </>
  );
}
