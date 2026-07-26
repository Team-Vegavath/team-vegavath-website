import type { Metadata } from "next";
import Link from "next/link";

import F1Paused from "@/components/f1/F1Paused";
import { F1Empty, F1Section, F1Table } from "@/components/f1/F1Table";
import { getF1AllDrivers, getF1DriverStandings } from "@/lib/services/f1";
import { getF1Enabled } from "@/lib/services/settings";

export const metadata: Metadata = {
  title: "F1 Drivers",
  description: "Current Formula 1 driver line-up with nationality, number and team.",
  alternates: { canonical: "/f1/drivers" },
};

// See the note in f1/page.tsx: 60s so the kill switch is responsive, while the
// Jolpica payloads themselves stay cached for 6h/24h inside services/f1.ts.
export const revalidate = 60;

function formatDob(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function F1DriversPage() {
  const f1Enabled = await getF1Enabled().catch(() => false);
  if (!f1Enabled) return <F1Paused />;

  const [standings, allDrivers] = await Promise.all([
    getF1DriverStandings(),
    getF1AllDrivers(),
  ]);

  const season = standings?.season ?? "";
  const current = standings?.standings ?? [];
  const currentIds = new Set(current.map((row) => row.Driver.driverId));

  // Career totals are not obtainable in a bounded number of calls: the bulk
  // /f1/drivers.json rows carry no stats, and the per-driver career standings
  // endpoint requires a season. So the grid table shows this season's figures
  // and the historical table stays reference-only. Both link to the profile,
  // which is where per-driver detail lives.
  const historical = allDrivers.filter((d) => !currentIds.has(d.driverId));

  return (
    <>
      <header style={{ marginBottom: "3rem" }}>
        <h1
          className="heading"
          style={{
            fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          Drivers
        </h1>
      </header>

      <F1Section
        title={season ? `${season} Grid` : "Current Grid"}
        subtitle="Points and wins are this season's totals"
      >
        <F1Table
          headers={["Pos", "Driver", "Code", "Nationality", "Born", "Team", "Pts", "Wins"]}
        >
          {current.length > 0 ? (
            current.map((row) => (
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
                <td className="f1-num">{row.Driver.code ?? "-"}</td>
                <td>{row.Driver.nationality}</td>
                <td className="f1-num">{formatDob(row.Driver.dateOfBirth)}</td>
                <td>{row.Constructors.map((c) => c.name).join(", ")}</td>
                <td className="f1-num">{row.points}</td>
                <td className="f1-num">{row.wins}</td>
              </tr>
            ))
          ) : (
            <F1Empty colSpan={8} message="Grid unavailable" />
          )}
        </F1Table>
      </F1Section>

      <F1Section
        title="From the Archive"
        subtitle={`First ${historical.length} of the drivers who have started a championship race`}
      >
        <F1Table headers={["Driver", "Nationality", "Born", "Reference"]}>
          {historical.length > 0 ? (
            historical.map((driver) => (
              <tr key={driver.driverId}>
                <td className="f1-name">
                  <Link href={`/f1/drivers/${driver.driverId}`}>
                    {driver.givenName} {driver.familyName}
                  </Link>
                </td>
                <td>{driver.nationality}</td>
                <td className="f1-num">{formatDob(driver.dateOfBirth)}</td>
                <td className="f1-num">{driver.driverId}</td>
              </tr>
            ))
          ) : (
            <F1Empty colSpan={4} message="Driver archive unavailable" />
          )}
        </F1Table>
      </F1Section>
    </>
  );
}
