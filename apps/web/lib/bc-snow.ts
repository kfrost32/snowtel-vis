import { BC_NETWORK, getStationsInNetwork, stationId } from "@snotel/core/stations";
import { latestDepth, type RecentDepth } from "@snotel/core/recent";
import { reportedSeason } from "@snotel/core/season";
import { celsiusToFahrenheit, cmToInches, mmToInches } from "@snotel/core/units";
import type { DailyObservation, HourlyObservation, Station, StationCurrentConditions, StationSeasonData } from "@snotel/core/types";
import { calendarRow, getCurrentWaterYear, getWaterYearStart } from "@snotel/core/water-year";
import { generateDates } from "./snotel-api";
import { conditionsFromSeason, roundTo } from "./series";
import { PACIFIC_OFFSET_MS, pacificDateTime, pacificToday } from "./pacific-time";
import { memoized } from "./memoized";
import type { DataFeed } from "./data-feeds";
import bcMedians from "./bc-medians.json";

const DATA_URL = "https://www.env.gov.bc.ca/wsd/data_searches/snow/asws/data";
const ELEMENTS = ["SW", "SD", "TA", "PC"] as const;
const TIMEOUT_MS = 30000;
const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;
const MIDNIGHT_LOOKBACK_MS = 6 * HOUR_MS;
const MAX_DAILY_PRECIP_MM = 250;
const HOURLY_DAYS = 7;

type Element = (typeof ELEMENTS)[number];

interface ElementTable {
  times: number[];
  columns: Map<string, Float64Array>;
}

interface BcStationSeries {
  season: StationSeasonData;
  midnightTemp: number | null;
}

const medians = bcMedians as { stations: Record<string, (number | null)[]> };

const sweInches = (mm: number) => roundTo(mmToInches(mm), 1);
const depthInches = (cm: number) => roundTo(cmToInches(cm), 0);
const fahrenheit = (c: number) => roundTo(celsiusToFahrenheit(c), 1);
const orNull = (v: number, convert: (v: number) => number) => (Number.isNaN(v) ? null : convert(v));

function parseTable(csv: string): ElementTable {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const ids = header.split(",").slice(1).map((column) => column.split(" ")[0]);
  const columns = ids.map(() => new Float64Array(rows.length).fill(NaN));
  const times = rows.map((row, r) => {
    const cells = row.split(",");
    for (let i = 0; i < ids.length; i++) {
      const cell = cells[i + 1];
      if (cell) columns[i][r] = Number(cell);
    }
    return Date.parse(`${cells[0].replace(" ", "T")}:00Z`);
  });
  return { times, columns: new Map(ids.map((id, i) => [id, columns[i]])) };
}

const tables = Object.fromEntries(
  ELEMENTS.map((element) => [
    element,
    memoized(async () => {
      const res = await fetch(`${DATA_URL}/${element}.csv`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
      if (!res.ok) throw new Error(`BC ${element} request failed: ${res.status}`);
      return parseTable(await res.text());
    }),
  ])
) as Record<Element, () => Promise<ElementTable>>;

function localMidnight(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) + PACIFIC_OFFSET_MS;
}

function firstRowAtOrAfter(times: number[], t: number): number {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function valueAt(table: ElementTable, values: Float64Array | undefined, t: number): number {
  if (!values) return NaN;
  const row = firstRowAtOrAfter(table.times, t);
  return table.times[row] === t ? values[row] : NaN;
}

function atMidnights(table: ElementTable, values: Float64Array | undefined, dates: string[]): number[] {
  if (!values) return dates.map(() => NaN);
  const { times } = table;
  let row = 0;
  let last = -1;
  return dates.map((date) => {
    const midnight = localMidnight(date);
    for (; row < times.length && times[row] <= midnight; row++) {
      if (!Number.isNaN(values[row])) last = row;
    }
    return last >= 0 && midnight - times[last] <= MIDNIGHT_LOOKBACK_MS ? values[last] : NaN;
  });
}

function dailyTemps(table: ElementTable, values: Float64Array | undefined, dates: string[]) {
  const max = new Float64Array(dates.length).fill(-Infinity);
  const min = new Float64Array(dates.length).fill(Infinity);
  const sum = new Float64Array(dates.length);
  const count = new Uint16Array(dates.length);
  const start = localMidnight(dates[0]);
  if (values) {
    table.times.forEach((t, row) => {
      const value = values[row];
      const day = Math.floor((t - 1 - start) / DAY_MS) + 1;
      if (Number.isNaN(value) || day < 0 || day >= dates.length) return;
      max[day] = Math.max(max[day], value);
      min[day] = Math.min(min[day], value);
      sum[day] += value;
      count[day]++;
    });
  }
  return dates.map((_, day) =>
    count[day]
      ? { tmax: fahrenheit(max[day]), tmin: fahrenheit(min[day]), tavg: fahrenheit(sum[day] / count[day]) }
      : { tmax: null, tmin: null, tavg: null }
  );
}

function seasonPrecip(gauge: number[]): (number | null)[] {
  let total = 0;
  let previous = NaN;
  return gauge.map((value) => {
    if (Number.isNaN(value)) return null;
    const diff = value - previous;
    if (diff > 0 && diff < MAX_DAILY_PRECIP_MM) total += diff;
    previous = value;
    return sweInches(total);
  });
}

function buildSeries(station: Station, data: Record<Element, ElementTable>, dates: string[]): BcStationSeries {
  const id = stationId(station.triplet);
  const swe = atMidnights(data.SW, data.SW.columns.get(id), dates);
  const depth = atMidnights(data.SD, data.SD.columns.get(id), dates);
  const precip = seasonPrecip(atMidnights(data.PC, data.PC.columns.get(id), dates));
  const temperature = data.TA.columns.get(id);
  const temps = dailyTemps(data.TA, temperature, dates);
  const midnightTemps = atMidnights(data.TA, temperature, dates);
  const stationMedians = medians.stations[id];
  const season: DailyObservation[] = dates.map((date, i) => ({
    date,
    swe: orNull(swe[i], sweInches),
    sweMedian: stationMedians?.[calendarRow(date) - 1] ?? null,
    snowDepth: orNull(depth[i], depthInches),
    precip: precip[i],
    ...temps[i],
  }));
  const reported = reportedSeason(station, season);
  return { season: reported, midnightTemp: orNull(midnightTemps[reported.season.length - 1], fahrenheit) };
}

const allSeries = memoized(async () => {
  const loaded = await Promise.all(ELEMENTS.map((element) => tables[element]()));
  const data = Object.fromEntries(ELEMENTS.map((element, i) => [element, loaded[i]])) as Record<Element, ElementTable>;
  const dates = generateDates(getWaterYearStart(getCurrentWaterYear()), pacificToday());
  return new Map(getStationsInNetwork(BC_NETWORK).map((station) => [station.triplet, buildSeries(station, data, dates)]));
});

async function fetchBcSeasons(): Promise<Map<string, StationSeasonData>> {
  const series = await allSeries();
  return new Map([...series].map(([triplet, { season }]) => [triplet, season]));
}

async function fetchBcSeason(triplet: string): Promise<StationSeasonData | null> {
  return (await allSeries()).get(triplet)?.season ?? null;
}

async function fetchBcConditions(): Promise<StationCurrentConditions[]> {
  const series = await allSeries();
  return [...series.values()].map(({ season, midnightTemp }) => conditionsFromSeason(season, midnightTemp));
}

function recentRows(table: ElementTable): number[] {
  const start = firstRowAtOrAfter(table.times, Date.now() - HOURLY_DAYS * DAY_MS);
  return Array.from({ length: table.times.length - start }, (_, i) => start + i);
}

async function fetchBcHourly(triplet: string): Promise<HourlyObservation[]> {
  const [depthTable, sweTable, tempTable] = await Promise.all([tables.SD(), tables.SW(), tables.TA()]);
  const id = stationId(triplet);
  const depth = depthTable.columns.get(id);
  const swe = sweTable.columns.get(id);
  const temp = tempTable.columns.get(id);
  return recentRows(depthTable).map((row) => {
    const t = depthTable.times[row];
    return {
      datetime: pacificDateTime(t),
      snowDepth: depth ? orNull(depth[row], depthInches) : null,
      temp: orNull(valueAt(tempTable, temp, t), fahrenheit),
      swe: orNull(valueAt(sweTable, swe, t), sweInches),
    };
  });
}

async function fetchBcRecentDepth(): Promise<Record<string, RecentDepth>> {
  const table = await tables.SD();
  const rows = recentRows(table);
  const datetimes = rows.map((row) => pacificDateTime(table.times[row]));
  const stations: Record<string, RecentDepth> = {};
  for (const station of getStationsInNetwork(BC_NETWORK)) {
    const depth = table.columns.get(stationId(station.triplet));
    if (!depth) continue;
    const recent = latestDepth(rows.map((row, i) => ({ datetime: datetimes[i], snowDepth: orNull(depth[row], depthInches) })));
    if (recent) stations[station.triplet] = recent;
  }
  return stations;
}

export const bcFeed: DataFeed = {
  name: "BC",
  network: BC_NETWORK,
  fetchSeasons: fetchBcSeasons,
  fetchSeason: fetchBcSeason,
  fetchConditions: fetchBcConditions,
  fetchHourly: fetchBcHourly,
  fetchRecentDepth: fetchBcRecentDepth,
};
