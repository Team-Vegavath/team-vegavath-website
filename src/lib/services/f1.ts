// S50: F1 data via Jolpica (the maintained Ergast successor).
//
// Deliberate egress exception -- see the Session 50 entry in docs/revamp-log.md.
// All fetches use ISR (next.revalidate) so Jolpica is called at most once per
// revalidate window, not once per visitor.
// During race weekends, set site_settings.f1_enabled = 'false' to pause all
// Jolpica calls and serve a static message instead (see getF1Enabled()).
//
// Host note: the documented host in the session brief was api.jolpica.com,
// which does not resolve. The live API is api.jolpi.ca; /ergast/v1/f1/... and
// /ergast/f1/... both answer, and the versioned prefix is used here.
//
// S53 path note: under /ergast/v1 every request needs a trailing RESOURCE
// segment. /f1/current.json and /f1/current/next.json 404 here (they only work
// on the legacy /ergast/f1 prefix); /f1/current/races.json and
// /f1/current/next/races.json are the versioned forms. jolpica() turns a 404
// into null, so the miss showed up as an empty calendar rather than an error.
//
// Every response is shaped { MRData: { <table key>: ... } }. Only the fields
// actually rendered are typed -- the API returns considerably more.

const BASE = "https://api.jolpi.ca/ergast/v1";

const SIX_HOURS = 21600;
const ONE_HOUR = 3600;
const ONE_DAY = 86400;

async function jolpica<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    const json = (await res.json()) as { MRData: T };
    return json.MRData ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- shared types

export interface F1Driver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  url: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
}

export interface F1Constructor {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
}

export interface F1Circuit {
  circuitId: string;
  url: string;
  circuitName: string;
  Location: {
    lat: string;
    long: string;
    locality: string;
    country: string;
  };
}

export interface F1RaceSession {
  date: string;
  time?: string;
}

export interface F1Race {
  season: string;
  round: string;
  url?: string;
  raceName: string;
  Circuit: F1Circuit;
  date: string;
  time?: string;
  // Session sub-objects, present only on the schedule endpoints and only when
  // the session exists (Sprint / SprintQualifying on sprint weekends only).
  // Verified against a live /f1/current/races.json payload.
  FirstPractice?: F1RaceSession;
  SecondPractice?: F1RaceSession;
  ThirdPractice?: F1RaceSession;
  Qualifying?: F1RaceSession;
  Sprint?: F1RaceSession;
  SprintQualifying?: F1RaceSession;
  Results?: F1RaceResult[];
  QualifyingResults?: F1QualifyingResult[];
  SprintResults?: F1RaceResult[];
  PitStops?: F1PitStop[];
  Laps?: F1Lap[];
}

export interface F1RaceResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: F1Driver;
  Constructor: F1Constructor;
  grid: string;
  laps: string;
  status: string;
  Time?: { millis: string; time: string };
  FastestLap?: { rank?: string; lap?: string; Time?: { time: string } };
}

export interface F1QualifyingResult {
  number: string;
  position: string;
  Driver: F1Driver;
  Constructor: F1Constructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

export interface F1PitStop {
  driverId: string;
  lap: string;
  stop: string;
  time: string;
  duration: string;
}

export interface F1Lap {
  number: string;
  Timings: { driverId: string; position: string; time: string }[];
}

export interface F1DriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: F1Driver;
  Constructors: F1Constructor[];
}

export interface F1ConstructorStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: F1Constructor;
}

export interface F1Season {
  season: string;
  url: string;
}

// The API wrapper shapes. StandingsLists is an array with one entry per season
// requested, so every standings helper below reads [0].
interface StandingsResponse<T> {
  StandingsTable: {
    season?: string;
    round?: string;
    StandingsLists: T[];
  };
}

interface RaceResponse {
  RaceTable: { season?: string; round?: string; Races: F1Race[] };
}

// --------------------------------------------------------- constructor colours
// S54: brand colours for the current grid, keyed by Jolpica's constructorId.
// Lives here rather than in a component because three pages read it (/f1 for
// both standings tables, /f1/drivers/[driverId] for the placeholder).
// S55: R2 now holds logos for the current grid (see CONSTRUCTOR_LOGOS below), so
// the colour is no longer the whole treatment -- it still drives the row border
// and the historical-driver placeholder, where no image exists.
const CONSTRUCTOR_COLORS: Record<string, string> = {
  ferrari: "#E8002D",
  mclaren: "#FF8000",
  mercedes: "#27F4D2",
  red_bull: "#3671C6",
  aston_martin: "#229971",
  alpine: "#0093CC",
  haas: "#B6BABD",
  rb: "#6692FF",
  williams: "#64C4FF",
  sauber: "#52E252",
};

export function constructorColor(id: string | undefined): string {
  return (id && CONSTRUCTOR_COLORS[id]) || "var(--border-strong)";
}

// ------------------------------------------------------------ constructor logos
// S55: real imagery for the current grid. Keyed by Jolpica constructorId; the R2
// filenames mostly match, and the two that do not are noted inline. Historical
// constructors are absent on purpose and fall back to the colour treatment.
const R2 = "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev";

const CONSTRUCTOR_LOGOS: Record<string, string> = {
  red_bull: `${R2}/f1/constructors/red_bull.png`,
  ferrari: `${R2}/f1/constructors/ferrari.png`,
  mclaren: `${R2}/f1/constructors/mclaren.jpg`,
  mercedes: `${R2}/f1/constructors/mercedes_amg.png`, // file: mercedes_amg
  audi: `${R2}/f1/constructors/audi.png`,
  haas: `${R2}/f1/constructors/haas.jpg`,
  aston_martin: `${R2}/f1/constructors/aston_martin.jpg`,
  rb: `${R2}/f1/constructors/vcarb.jpg`, // file: vcarb
  alpine: `${R2}/f1/constructors/alpine.jpg`,
  cadillac: `${R2}/f1/constructors/cadillac.jpg`,
  williams: `${R2}/f1/constructors/williams.png`,
};

// Driver filenames already match Jolpica driverIds exactly.
const DRIVER_IMAGES: Record<string, string> = {
  george_russell: `${R2}/f1/drivers/george_russell.png`,
  kimi_antonelli: `${R2}/f1/drivers/kimi_antonelli.png`,
  charles_leclerc: `${R2}/f1/drivers/charles_leclerc.png`,
  lewis_hamilton: `${R2}/f1/drivers/lewis_hamilton.png`,
  lando_norris: `${R2}/f1/drivers/lando_norris.png`,
  oscar_piastri: `${R2}/f1/drivers/oscar_piastri.png`,
  max_verstappen: `${R2}/f1/drivers/max_verstappen.png`,
  isack_hadjar: `${R2}/f1/drivers/isack_hadjar.png`,
  liam_lawson: `${R2}/f1/drivers/liam_lawson.png`,
  arvid_lindblad: `${R2}/f1/drivers/arvid_lindblad.png`,
  pierre_gasly: `${R2}/f1/drivers/pierre_gasly.png`,
  franco_colapinto: `${R2}/f1/drivers/franco_colapinto.png`,
  esteban_ocon: `${R2}/f1/drivers/esteban_ocon.png`,
  oliver_bearman: `${R2}/f1/drivers/oliver_bearman.png`,
  nico_hulkenberg: `${R2}/f1/drivers/nico_hulkenberg.png`,
  gabriel_bortoleto: `${R2}/f1/drivers/gabriel_bortoleto.png`,
  carlos_sainz: `${R2}/f1/drivers/carlos_sainz.png`,
  alexander_albon: `${R2}/f1/drivers/alexander_albon.png`,
  fernando_alonso: `${R2}/f1/drivers/fernando_alonso.png`,
  lance_stroll: `${R2}/f1/drivers/lance_stroll.png`,
  sergio_perez: `${R2}/f1/drivers/sergio_perez.png`,
  valtteri_bottas: `${R2}/f1/drivers/valtteri_bottas.png`,
};

export function constructorLogo(id: string | undefined): string | null {
  return (id && CONSTRUCTOR_LOGOS[id]) || null;
}

export function driverImage(id: string | undefined): string | null {
  return (id && DRIVER_IMAGES[id]) || null;
}

// ------------------------------------------------------- standings and results
// 6-hour revalidate: standings only change after a race finishes.

export async function getF1DriverStandings(): Promise<{
  season: string;
  round: string;
  standings: F1DriverStanding[];
} | null> {
  const data = await jolpica<
    StandingsResponse<{
      season: string;
      round: string;
      DriverStandings: F1DriverStanding[];
    }>
  >("/f1/current/driverStandings.json?limit=40", SIX_HOURS);
  const list = data?.StandingsTable.StandingsLists[0];
  if (!list) return null;
  return {
    season: list.season,
    round: list.round,
    standings: list.DriverStandings ?? [],
  };
}

export async function getF1ConstructorStandings(): Promise<{
  season: string;
  round: string;
  standings: F1ConstructorStanding[];
} | null> {
  const data = await jolpica<
    StandingsResponse<{
      season: string;
      round: string;
      ConstructorStandings: F1ConstructorStanding[];
    }>
  >("/f1/current/constructorStandings.json?limit=40", SIX_HOURS);
  const list = data?.StandingsTable.StandingsLists[0];
  if (!list) return null;
  return {
    season: list.season,
    round: list.round,
    standings: list.ConstructorStandings ?? [],
  };
}

export async function getF1LastRaceResult(): Promise<F1Race | null> {
  const data = await jolpica<RaceResponse>(
    "/f1/current/last/results.json?limit=40",
    SIX_HOURS
  );
  return data?.RaceTable.Races[0] ?? null;
}

export async function getF1LastQualifying(): Promise<F1Race | null> {
  const data = await jolpica<RaceResponse>(
    "/f1/current/last/qualifying.json?limit=40",
    SIX_HOURS
  );
  return data?.RaceTable.Races[0] ?? null;
}

// 1-hour revalidate: the next race entry is stable, but it flips to the
// following round shortly after a race and an hour of staleness is invisible.
export async function getF1NextRace(): Promise<F1Race | null> {
  // 404s once the season is over -- jolpica() maps that to null, which the page
  // renders as "Season Complete".
  const data = await jolpica<RaceResponse>(
    "/f1/current/next/races.json",
    ONE_HOUR
  );
  return data?.RaceTable.Races[0] ?? null;
}

// -------------------------------------------------- schedule / reference data
// 24-hour revalidate.

// S54: ONE_HOUR, not ONE_DAY. The calendar itself changes maybe twice a season,
// so 24h was right on freshness grounds -- but Next caches a FAILED response for
// the same window, so one rate-limited fetch blanked the calendar for a full day.
// An hour bounds that blast radius at 24 calls/day. See the note on
// /f1/drivers/[driverId] for the burst that caused it.
export async function getF1CurrentSchedule(): Promise<F1Race[]> {
  const data = await jolpica<RaceResponse>(
    "/f1/current/races.json?limit=40",
    ONE_HOUR
  );
  return data?.RaceTable.Races ?? [];
}

export async function getF1SeasonHistory(): Promise<F1Season[]> {
  const data = await jolpica<{ SeasonTable: { Seasons: F1Season[] } }>(
    "/f1/seasons.json?limit=100",
    ONE_DAY
  );
  return data?.SeasonTable.Seasons ?? [];
}

// 881 drivers in F1 history and Jolpica caps limit at 100, so this is paged.
// MRData.total is a STRING in every Jolpica response -- hence the Number().
export async function getF1AllDrivers(
  offset = 0
): Promise<{ drivers: F1Driver[]; total: number }> {
  const data = await jolpica<{
    total: string;
    DriverTable: { Drivers: F1Driver[] };
  }>(`/f1/drivers.json?limit=30&offset=${offset}`, ONE_DAY);
  return {
    drivers: data?.DriverTable.Drivers ?? [],
    total: Number(data?.total ?? 0),
  };
}

export async function getF1AllCircuits(): Promise<F1Circuit[]> {
  const data = await jolpica<{ CircuitTable: { Circuits: F1Circuit[] } }>(
    "/f1/circuits.json?limit=100",
    ONE_DAY
  );
  return data?.CircuitTable.Circuits ?? [];
}

export async function getF1AllConstructors(): Promise<F1Constructor[]> {
  const data = await jolpica<{
    ConstructorTable: { Constructors: F1Constructor[] };
  }>("/f1/constructors.json?limit=100", ONE_DAY);
  return data?.ConstructorTable.Constructors ?? [];
}

// ------------------------------------------------------------------- on-demand
// Fetched per page, 24h revalidate.

export async function getF1DriverInfo(driverId: string): Promise<F1Driver | null> {
  const data = await jolpica<{ DriverTable: { Drivers: F1Driver[] } }>(
    `/f1/drivers/${encodeURIComponent(driverId)}.json`,
    ONE_DAY
  );
  return data?.DriverTable.Drivers[0] ?? null;
}

export async function getF1CircuitInfo(
  circuitId: string
): Promise<F1Circuit | null> {
  const data = await jolpica<{ CircuitTable: { Circuits: F1Circuit[] } }>(
    `/f1/circuits/${encodeURIComponent(circuitId)}.json`,
    ONE_DAY
  );
  return data?.CircuitTable.Circuits[0] ?? null;
}

export async function getF1RaceResults(
  season: string,
  round: string
): Promise<F1Race | null> {
  const data = await jolpica<RaceResponse>(
    `/f1/${encodeURIComponent(season)}/${encodeURIComponent(round)}/results.json?limit=40`,
    ONE_DAY
  );
  return data?.RaceTable.Races[0] ?? null;
}

export async function getF1LapTimes(
  season: string,
  round: string
): Promise<F1Lap[]> {
  // Laps are ~870 rows for a full race; capped so one page can never pull the
  // whole set down. Callers render the opening laps only.
  const data = await jolpica<RaceResponse>(
    `/f1/${encodeURIComponent(season)}/${encodeURIComponent(round)}/laps.json?limit=100`,
    ONE_DAY
  );
  return data?.RaceTable.Races[0]?.Laps ?? [];
}

export async function getF1PitStops(
  season: string,
  round: string
): Promise<F1PitStop[]> {
  const data = await jolpica<RaceResponse>(
    `/f1/${encodeURIComponent(season)}/${encodeURIComponent(round)}/pitstops.json?limit=100`,
    ONE_DAY
  );
  return data?.RaceTable.Races[0]?.PitStops ?? [];
}

export async function getF1SprintResults(
  season: string,
  round: string
): Promise<F1Race | null> {
  const data = await jolpica<RaceResponse>(
    `/f1/${encodeURIComponent(season)}/${encodeURIComponent(round)}/sprint.json?limit=40`,
    ONE_DAY
  );
  return data?.RaceTable.Races[0] ?? null;
}

// ------------------------------------------- per-driver detail (profile page)
// Career totals are NOT available in one call: Jolpica rejects
// /f1/drivers/{id}/driverStandings.json without a season_year, and the bulk
// /f1/drivers.json rows carry no stats at all. So the profile page composes
// seasons + constructors + the current season's standing row instead.

export async function getF1DriverSeasons(driverId: string): Promise<F1Season[]> {
  const data = await jolpica<{ SeasonTable: { Seasons: F1Season[] } }>(
    `/f1/drivers/${encodeURIComponent(driverId)}/seasons.json?limit=100`,
    ONE_DAY
  );
  return data?.SeasonTable.Seasons ?? [];
}

export async function getF1DriverConstructors(
  driverId: string
): Promise<F1Constructor[]> {
  const data = await jolpica<{
    ConstructorTable: { Constructors: F1Constructor[] };
  }>(
    `/f1/drivers/${encodeURIComponent(driverId)}/constructors.json?limit=50`,
    ONE_DAY
  );
  return data?.ConstructorTable.Constructors ?? [];
}

export async function getF1DriverSeasonStanding(
  season: string,
  driverId: string
): Promise<F1DriverStanding | null> {
  const data = await jolpica<
    StandingsResponse<{ DriverStandings: F1DriverStanding[] }>
  >(
    `/f1/${encodeURIComponent(season)}/drivers/${encodeURIComponent(driverId)}/driverStandings.json`,
    ONE_DAY
  );
  return data?.StandingsTable.StandingsLists[0]?.DriverStandings[0] ?? null;
}

// Champions for the season-history table. One call per season (N+1), which is
// acceptable at a 24h revalidate and a 30-season cap.
export async function getF1SeasonChampions(season: string): Promise<{
  driver: F1DriverStanding | null;
  constructor: F1ConstructorStanding | null;
}> {
  const [driverData, constructorData] = await Promise.all([
    jolpica<StandingsResponse<{ DriverStandings: F1DriverStanding[] }>>(
      `/f1/${encodeURIComponent(season)}/driverStandings/1.json`,
      ONE_DAY
    ),
    jolpica<StandingsResponse<{ ConstructorStandings: F1ConstructorStanding[] }>>(
      `/f1/${encodeURIComponent(season)}/constructorStandings/1.json`,
      ONE_DAY
    ),
  ]);
  return {
    driver:
      driverData?.StandingsTable.StandingsLists[0]?.DriverStandings[0] ?? null,
    constructor:
      constructorData?.StandingsTable.StandingsLists[0]
        ?.ConstructorStandings[0] ?? null,
  };
}
