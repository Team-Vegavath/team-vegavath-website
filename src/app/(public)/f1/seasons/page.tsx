import type { Metadata } from "next";

import F1Paused from "@/components/f1/F1Paused";
import { F1Empty, F1Section, F1Table } from "@/components/f1/F1Table";
import { getF1SeasonChampions, getF1SeasonHistory } from "@/lib/services/f1";
import { getF1Enabled } from "@/lib/services/settings";

export const metadata: Metadata = {
  title: "F1 Season History",
  description: "Formula 1 world champions by season, driver and constructor.",
  alternates: { canonical: "/f1/seasons" },
};

export const revalidate = 60;

// Champion lookup is one request per season (N+1). Capped at the most recent 30
// so the page never fans out to 77 calls; the 24h fetch revalidate inside
// services/f1.ts means this happens roughly once a day.
const SEASON_CAP = 30;

// S57: each season is TWO Jolpica calls, so a single Promise.all over the 30
// opened 60 sockets at once -- squarely in 429 territory, and jolpica() turns a
// 429 into null, so the page would have rendered a wall of "-" with no error.
// Five seasons (10 calls) per batch, batches run one after the other.
const SEASON_BATCH = 5;

export default async function F1SeasonsPage() {
  const f1Enabled = await getF1Enabled().catch(() => false);
  if (!f1Enabled) return <F1Paused />;

  const allSeasons = await getF1SeasonHistory();
  // The API returns 1950 first; take the tail and show newest first.
  const recent = allSeasons.slice(-SEASON_CAP).reverse();

  // No per-item .catch: getF1SeasonChampions cannot reject, because every call
  // inside it goes through jolpica(), which swallows the throw and returns null.
  const rows: Array<
    { season: string; url: string } & Awaited<
      ReturnType<typeof getF1SeasonChampions>
    >
  > = [];
  for (let i = 0; i < recent.length; i += SEASON_BATCH) {
    const batch = await Promise.all(
      recent.slice(i, i + SEASON_BATCH).map(async (season) => ({
        season: season.season,
        url: season.url,
        ...(await getF1SeasonChampions(season.season)),
      }))
    );
    rows.push(...batch);
  }

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
