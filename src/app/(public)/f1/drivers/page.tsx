import type { Metadata } from "next";
import Link from "next/link";

import F1Paused from "@/components/f1/F1Paused";
import { F1Empty, F1Section, F1Table } from "@/components/f1/F1Table";
import { driverImage, getF1AllDrivers, getF1DriverStandings } from "@/lib/services/f1";
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

const PER_PAGE = 30;

export default async function F1DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const f1Enabled = await getF1Enabled().catch(() => false);
  if (!f1Enabled) return <F1Paused />;

  // Untrusted URL param feeding an outbound fetch: floor it, drop NaN, clamp
  // negatives. Beyond the last page Jolpica returns an empty list, which the
  // archive table already renders as an empty state.
  const offset = Math.max(
    0,
    Math.floor(Number((await searchParams).offset)) || 0
  );

  const [standings, archive] = await Promise.all([
    getF1DriverStandings(),
    getF1AllDrivers(offset),
  ]);

  const season = standings?.season ?? "";
  const current = standings?.standings ?? [];

  // Career totals are not obtainable in a bounded number of calls: the bulk
  // /f1/drivers.json rows carry no stats, and the per-driver career standings
  // endpoint requires a season. So the grid table shows this season's figures
  // and the archive table stays reference-only. Both link to the profile,
  // which is where per-driver detail lives.
  const start = offset + 1;
  const end = Math.min(offset + PER_PAGE, archive.total);

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
          headers={["", "Pos", "Driver", "Code", "Nationality", "Born", "Team", "Pts", "Wins"]}
        >
          {current.length > 0 ? (
            current.map((row) => (
              <tr
                key={row.Driver.driverId}
                className={row.position === "1" ? "f1-leader" : undefined}
              >
                {/* S55: 32x40 crop of the R2 full-body shot. Only the current
                    grid gets this column -- the archive table below is 30
                    historical drivers a page, all of whom would render an
                    identical grey block. */}
                <td style={{ padding: "0.4rem 0.5rem", width: "40px" }}>
                  {driverImage(row.Driver.driverId) ? (
                    <div style={{ width: "32px", height: "40px", overflow: "hidden" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={driverImage(row.Driver.driverId)!}
                        alt=""
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "top center",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "32px",
                        height: "40px",
                        background: "var(--border)",
                        opacity: 0.4,
                      }}
                    />
                  )}
                </td>
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
            <F1Empty colSpan={9} message="Grid unavailable" />
          )}
        </F1Table>
      </F1Section>

      <F1Section
        title="From the Archive"
        subtitle="Every driver who has started a championship race, alphabetically"
      >
        <F1Table headers={["Driver", "Nationality", "Born", "Reference"]}>
          {archive.drivers.length > 0 ? (
            archive.drivers.map((driver) => (
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

        {archive.total > 0 && (
          <div
            className="mono"
            style={{
              marginTop: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              fontSize: "0.7rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <span>
              Showing {start}-{end} of {archive.total}
            </span>
            {/* Plain links, no client JS: each offset is its own cached page. */}
            <span style={{ display: "flex", gap: "1rem" }}>
              {offset > 0 && (
                <Link href={`/f1/drivers?offset=${offset - PER_PAGE}`}>Prev</Link>
              )}
              {end < archive.total && (
                <Link href={`/f1/drivers?offset=${offset + PER_PAGE}`}>Next</Link>
              )}
            </span>
          </div>
        )}
      </F1Section>
    </>
  );
}
