import { CDEC_NETWORK, getStation, getStationsInNetwork, stationId } from "@snotel/core/stations";
import { latestDepth, type RecentDepth } from "@snotel/core/recent";
import { reportedSeason } from "@snotel/core/season";
import type { DailyObservation, HourlyObservation, Station, StationCurrentConditions, StationSeasonData } from "@snotel/core/types";
import { calendarRow, getCurrentWaterYear, getWaterYearStart, shiftDate } from "@snotel/core/water-year";
import { generateDates } from "./snotel-api";
import { conditionsFromSeason, roundTo } from "./series";
import { memoized } from "./memoized";
import { pacificDateTime, pacificToday } from "./pacific-time";
import type { DataFeed } from "./data-feeds";
import cdecMedians from "./cdec-medians.json";

const DATA_URL = "https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet";
const TIMEOUT_MS = 30000;
const STATIONS_PER_REQUEST = 25;
const HOURLY_DAYS = 7;
const CONDITIONS_DAYS = 8;
const DAY_MS = 86400_000;

const SENSORS = {
  swe: 3,
  depth: 18,
  tavg: 30,
  tmax: 31,
  tmin: 32,
  precip: 2,
  temp: 4,
} as const;

const DAILY_SENSORS = [SENSORS.swe, SENSORS.depth, SENSORS.tavg, SENSORS.tmax, SENSORS.tmin, SENSORS.precip];
const HOURLY_SENSORS = [SENSORS.swe, SENSORS.depth, SENSORS.temp];

type SensorReadings = Map<number, Map<string, number>>;
type Readings = Map<string, SensorReadings>;

const medians = cdecMedians as { stations: Record<string, (number | null)[]> };

const rounded = (v: number | undefined, digits: number) => (v === undefined ? null : roundTo(v, digits));

function parseReadings(csv: string, into: Readings): void {
  for (const line of csv.split(/\r?\n/).slice(1)) {
    const cells = line.split(",");
    if (cells.length < 7 || cells[6] === "---" || cells[6] === "") continue;
    const value = Number(cells[6]);
    if (!Number.isFinite(value)) continue;
    const at = cells[4];
    const sensor = Number(cells[2]);
    let sensors = into.get(cells[0]);
    if (!sensors) into.set(cells[0], (sensors = new Map()));
    let series = sensors.get(sensor);
    if (!series) sensors.set(sensor, (series = new Map()));
    series.set(`${at.slice(0, 4)}-${at.slice(4, 6)}-${at.slice(6, 8)} ${at.slice(9, 11)}:${at.slice(11, 13)}`, value);
  }
}

async function fetchReadings(stations: Station[], sensors: number[], duration: "D" | "H", start: string, end: string): Promise<Readings> {
  const ids = stations.map((s) => stationId(s.triplet));
  const chunks = Array.from({ length: Math.ceil(ids.length / STATIONS_PER_REQUEST) }, (_, i) => ids.slice(i * STATIONS_PER_REQUEST, (i + 1) * STATIONS_PER_REQUEST));
  const responses = await Promise.all(
    chunks.map(async (chunk) => {
      const params = new URLSearchParams({ Stations: chunk.join(","), SensorNums: sensors.join(","), dur_code: duration, Start: start, End: end });
      const res = await fetch(`${DATA_URL}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
      if (!res.ok) throw new Error(`CDEC request failed: ${res.status}`);
      return res.text();
    })
  );
  const readings: Readings = new Map();
  for (const csv of responses) parseReadings(csv, readings);
  return readings;
}

function buildSeason(station: Station, sensors: SensorReadings | undefined, dates: string[]): StationSeasonData {
  const [swe, depth, tavg, tmax, tmin, precip] = DAILY_SENSORS.map((sensor) => sensors?.get(sensor));
  const stationMedians = medians.stations[stationId(station.triplet)];
  const season: DailyObservation[] = dates.map((date) => {
    const key = `${date} 00:00`;
    return {
      date,
      swe: rounded(swe?.get(key), 1),
      sweMedian: stationMedians?.[calendarRow(date) - 1] ?? null,
      snowDepth: rounded(depth?.get(key), 0),
      precip: rounded(precip?.get(key), 1),
      tmax: rounded(tmax?.get(key), 1),
      tmin: rounded(tmin?.get(key), 1),
      tavg: rounded(tavg?.get(key), 1),
    };
  });
  return reportedSeason(station, season);
}

async function fetchSeasons(stations: Station[], dates: string[]): Promise<Map<string, StationSeasonData>> {
  const readings = await fetchReadings(stations, DAILY_SENSORS, "D", dates[0], dates.at(-1)!);
  return new Map(stations.map((station) => [station.triplet, buildSeason(station, readings.get(stationId(station.triplet)), dates)]));
}

function seasonDates(): string[] {
  return generateDates(getWaterYearStart(getCurrentWaterYear()), pacificToday());
}

const allSeasons = memoized(() => fetchSeasons(getStationsInNetwork(CDEC_NETWORK), seasonDates()));

const allConditions = memoized(async (): Promise<StationCurrentConditions[]> => {
  const today = pacificToday();
  const seasons = await fetchSeasons(getStationsInNetwork(CDEC_NETWORK), generateDates(shiftDate(today, -(CONDITIONS_DAYS - 1)), today));
  return [...seasons.values()].map((season) => conditionsFromSeason(season));
});

async function fetchCdecSeason(triplet: string): Promise<StationSeasonData | null> {
  const station = getStation(triplet);
  if (station?.network !== CDEC_NETWORK) return null;
  return (await fetchSeasons([station], seasonDates())).get(triplet) ?? null;
}

function hourlyRange(days: number): [string, string] {
  const today = pacificToday();
  return [shiftDate(today, -days), shiftDate(today, 1)];
}

async function fetchCdecHourly(triplet: string): Promise<HourlyObservation[]> {
  const station = getStation(triplet);
  if (!station) return [];
  const [start, end] = hourlyRange(HOURLY_DAYS);
  const sensors = (await fetchReadings([station], HOURLY_SENSORS, "H", start, end)).get(stationId(triplet));
  const cutoff = pacificDateTime(Date.now() - HOURLY_DAYS * DAY_MS);
  const datetimes = [...new Set([...(sensors?.values() ?? [])].flatMap((series) => [...series.keys()]))].filter((datetime) => datetime >= cutoff).sort();
  return datetimes.map((datetime) => ({
    datetime,
    snowDepth: rounded(sensors?.get(SENSORS.depth)?.get(datetime), 0),
    temp: rounded(sensors?.get(SENSORS.temp)?.get(datetime), 1),
    swe: rounded(sensors?.get(SENSORS.swe)?.get(datetime), 1),
  }));
}

async function fetchCdecRecentDepth(): Promise<Record<string, RecentDepth>> {
  const stations = getStationsInNetwork(CDEC_NETWORK);
  const [start, end] = hourlyRange(2);
  const readings = await fetchReadings(stations, [SENSORS.depth], "H", start, end);
  const recent: Record<string, RecentDepth> = {};
  for (const station of stations) {
    const depth = readings.get(stationId(station.triplet))?.get(SENSORS.depth);
    if (!depth) continue;
    const latest = latestDepth([...depth].map(([datetime, value]) => ({ datetime, snowDepth: roundTo(value, 0) })));
    if (latest) recent[station.triplet] = latest;
  }
  return recent;
}

export const cdecFeed: DataFeed = {
  name: "CDEC",
  network: CDEC_NETWORK,
  fetchSeasons: allSeasons,
  fetchSeason: fetchCdecSeason,
  fetchConditions: allConditions,
  fetchHourly: fetchCdecHourly,
  fetchRecentDepth: fetchCdecRecentDepth,
};
