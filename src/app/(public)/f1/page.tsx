import type { Metadata } from "next";
import Link from "next/link";

import F1Paused from "@/components/f1/F1Paused";
import { F1Empty, F1Section, F1Table } from "@/components/f1/F1Table";
import {
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

export default async function F1Page() {
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

      {/* DRIVER STANDINGS */}
      <F1Section
        id="standings"
        title="Driver Standings"
        subtitle={drivers ? `After round ${drivers.round}` : undefined}
      >
        <F1Table
          headers={["Pos", "Driver", "Nationality", "Team", "Pts", "Wins"]}
        >
          {drivers && drivers.standings.length > 0 ? (
            drivers.standings.map((row) => (
              <tr
                key={row.Driver.driverId}
                className={row.position === "1" ? "f1-leader" : undefined}
              >
                <td className="f1-pos">{row.positionText}</td>
                <td className="f1-name">
                  <Link href={`/f1/drivers/${row.Driver.driverId}`}>
                    {row.Driver.givenName} {row.Driver.familyName}
                  </Link>
                </td>
                <td>{row.Driver.nationality}</td>
                <td>{row.Constructors.map((c) => c.name).join(", ")}</td>
                <td className="f1-num">{row.points}</td>
                <td className="f1-num">{row.wins}</td>
              </tr>
            ))
          ) : (
            <F1Empty colSpan={6} message="Standings unavailable" />
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
              >
                <td className="f1-pos">{row.positionText}</td>
                <td className="f1-name">{row.Constructor.name}</td>
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
              >
                <td className="f1-pos">{row.positionText}</td>
                <td className="f1-name">
                  <Link href={`/f1/drivers/${row.Driver.driverId}`}>
                    {row.Driver.givenName} {row.Driver.familyName}
                  </Link>
                </td>
                <td>{row.Constructor.name}</td>
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
        <F1Table headers={["Rnd", "Race", "Circuit", "Country", "Date"]}>
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
                  <td className="f1-num">{formatRaceDate(race.date, race.time)}</td>
                </tr>
              );
            })
          ) : (
            <F1Empty colSpan={5} message="Calendar unavailable" />
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
