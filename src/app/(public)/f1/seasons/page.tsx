import type { Metadata } from "next";

import F1Paused from "@/components/f1/F1Paused";
import { F1Empty, F1Section, F1Table } from "@/components/f1/F1Table";
import { getF1SeasonChampions, getF1SeasonHistory } from "@/lib/services/f1";
import { getF1Enabled } from "@/lib/services/settings";

export const metadata: Metadata = {
  title: "F1 Season History",
};

export const revalidate = 60;

// Champion lookup is one request per season (N+1). Capped at the most recent 30
// so the page never fans out to 77 calls; the 24h fetch revalidate inside
// services/f1.ts means this happens roughly once a day.
const SEASON_CAP = 30;

export default async function F1SeasonsPage() {
  const f1Enabled = await getF1Enabled().catch(() => false);
  if (!f1Enabled) return <F1Paused />;

  const allSeasons = await getF1SeasonHistory();
  // The API returns 1950 first; take the tail and show newest first.
  const recent = allSeasons.slice(-SEASON_CAP).reverse();

  const rows = await Promise.all(
    recent.map(async (season) => ({
      season: season.season,
      url: season.url,
      ...(await getF1SeasonChampions(season.season)),
    }))
  );

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
          Season History
        </h1>
      </header>

      <F1Section
        title="Champions"
        subtitle={
          allSeasons.length > SEASON_CAP
            ? `Most recent ${SEASON_CAP} of ${allSeasons.length} championship seasons`
            : `${allSeasons.length} championship seasons`
        }
      >
        <F1Table
          headers={["Year", "Champion Driver", "Team", "Champion Constructor"]}
        >
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr key={row.season}>
                <td className="f1-pos">{row.season}</td>
                <td className="f1-name">
                  {row.driver
                    ? `${row.driver.Driver.givenName} ${row.driver.Driver.familyName}`
                    : "In progress"}
                </td>
                <td>
                  {row.driver?.Constructors.map((c) => c.name).join(", ") ?? "-"}
                </td>
                <td>{row.constructor?.Constructor.name ?? "-"}</td>
              </tr>
            ))
          ) : (
            <F1Empty colSpan={4} message="Season history unavailable" />
          )}
        </F1Table>
      </F1Section>
    </>
  );
}
