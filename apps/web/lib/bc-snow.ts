import { getAllStations, isBcStation } from "@snotel/core/stations";
import { latestDepth, type RecentDepth } from "@snotel/core/recent";
import type { DailyObservation, HourlyObservation, Station, StationCurrentConditions, StationSeasonData } from "@snotel/core/types";
import { calendarRow, getCurrentWaterYear, getWaterYearStart, shiftDate } from "@snotel/core/water-year";
import { generateDates } from "./snotel-api";
import { seriesChange } from "./series";
import bcMedians from "./bc-medians.json";

const DATA_URL = "https://www.env.gov.bc.ca/wsd/data_searches/snow/asws/data";
const ELEMENTS = ["SW", "SD", "TA", "PC"] as const;
const TIMEOUT_MS = 30000;
const MEMO_MS = 10 * 60 * 1000;
const HOUR_MS = 3600_000;
const LOCAL_OFFSET_MS = 8 * HOUR_MS;
const MIDNIGHT_LOOKBACK_HOURS = 6;
const MAX_DAILY_PRECIP_MM = 250;
const HOURLY_DAYS = 7;

type Element = (typeof ELEMENTS)[number];

interface ElementTable {
  times: number[];
  columns: Map<string, (number | null)[]>;
}

type BcData = Record<Element, ElementTable>;

const medians = bcMedians as { stations: Record<string, (number | null)[]> };

const toInches = (mm: number) => Math.round((mm / 25.4) * 10) / 10;
const cmToInches = (cm: number) => Math.round(cm / 2.54);
const toFahrenheit = (c: number) => Math.round((c * 9) / 5 * 10 + 320) / 10;

function parseTable(csv: string): ElementTable {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const ids = header.split(",").slice(1).map((column) => column.split(" ")[0]);
  const columns = new Map(ids.map((id) => [id, [] as (number | null)[]]));
  const times: number[] = [];
  for (const row of rows) {
    const cells = row.split(",");
    times.push(Date.parse(`${cells[0].replace(" ", "T")}:00Z`));
    ids.forEach((id, i) => {
      const cell = cells[i + 1];
      const value = cell === undefined || cell === "" ? NaN : Number(cell);
      columns.get(id)!.push(Number.isFinite(value) ? value : null);
    });
  }
  return { times, columns };
}

async function fetchTable(element: Element): Promise<ElementTable> {
  const res = await fetch(`${DATA_URL}/${element}.csv`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`BC ${element} request failed: ${res.status}`);
  return parseTable(await res.text());
}

let memo: { data: Promise<BcData>; at: number } | null = null;

function fetchBcData(): Promise<BcData> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.data;
  const data = Promise.all(ELEMENTS.map(fetchTable)).then((tables) => Object.fromEntries(ELEMENTS.map((e, i) => [e, tables[i]])) as BcData);
  const entry = { data, at: Date.now() };
  memo = entry;
  data.catch(() => {
    if (memo === entry) memo = null;
  });
  return data;
}

function bcStationId(triplet: string): string {
  return triplet.split(":")[0];
}

function localDateTime(ms: number): string {
  return new Date(ms - LOCAL_OFFSET_MS).toISOString().slice(0, 16).replace("T", " ");
}

function localMidnight(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) + LOCAL_OFFSET_MS;
}

function localToday(): string {
  return localDateTime(Date.now()).slice(0, 10);
}

function readings(table: ElementTable, id: string): { time: number; value: number }[] {
  const column = table.columns.get(id);
  if (!column) return [];
  return column.flatMap((value, i) => (value === null ? [] : [{ time: table.times[i], value }]));
}

function atMidnights(points: { time: number; value: number }[], dates: string[]): (number | null)[] {
  let cursor = 0;
  return dates.map((date) => {
    const midnight = localMidnight(date);
    while (cursor < points.length && points[cursor].time <= midnight) cursor++;
    const last = points[cursor - 1];
    return last && midnight - last.time <= MIDNIGHT_LOOKBACK_HOURS * HOUR_MS ? last.value : null;
  });
}

function dailyTemps(points: { time: number; value: number }[], dates: string[]) {
  const byDate = new Map<string, number[]>();
  for (const { time, value } of points) {
    const date = shiftDate(localDateTime(time - 1).slice(0, 10), 1);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(value);
  }
  return dates.map((date) => {
    const values = byDate.get(date);
    if (!values?.length) return { tmax: null, tmin: null, tavg: null };
    return {
      tmax: toFahrenheit(Math.max(...values)),
      tmin: toFahrenheit(Math.min(...values)),
      tavg: toFahrenheit(values.reduce((a, b) => a + b, 0) / values.length),
    };
  });
}

function seasonPrecip(gauge: (number | null)[]): (number | null)[] {
  let total = 0;
  let previous: number | null = null;
  return gauge.map((value) => {
    if (value === null) return null;
    if (previous !== null) {
      const diff = value - previous;
      if (diff > 0 && diff < MAX_DAILY_PRECIP_MM) total += diff;
    }
    previous = value;
    return toInches(total);
  });
}

function buildSeason(station: Station, data: BcData, dates: string[]): StationSeasonData {
  const id = bcStationId(station.triplet);
  const swe = atMidnights(readings(data.SW, id), dates).map((v) => (v === null ? null : toInches(v)));
  const depth = atMidnights(readings(data.SD, id), dates).map((v) => (v === null ? null : cmToInches(v)));
  const precip = seasonPrecip(atMidnights(readings(data.PC, id), dates));
  const temps = dailyTemps(readings(data.TA, id), dates);
  const stationMedians = medians.stations[id];
  const season: DailyObservation[] = dates.map((date, i) => ({
    date,
    swe: swe[i],
    sweMedian: stationMedians?.[calendarRow(date) - 1] ?? null,
    snowDepth: depth[i],
    precip: precip[i],
    ...temps[i],
  }));
  while (season.length > 1 && season.at(-1)!.swe === null && season.at(-1)!.snowDepth === null) season.pop();

  const latest = season.at(-1);
  const current = latest?.swe ?? null;
  const median = latest?.sweMedian ?? null;
  return {
    station,
    current: {
      swe: current,
      sweNormal: median,
      pctOfNormal: current !== null && median !== null && median > 0 ? Math.round((current / median) * 100) : null,
      snowDepth: latest?.snowDepth ?? null,
      temp: latest?.tavg ?? null,
      precipAccum: latest?.precip ?? null,
      lastUpdated: latest?.date ?? null,
    },
    season,
  };
}

function bcStations(): Station[] {
  return getAllStations().filter(isBcStation);
}

function seasonDates(): string[] {
  return generateDates(getWaterYearStart(getCurrentWaterYear()), localToday());
}

export async function fetchBcSeasons(triplets?: string[]): Promise<Map<string, StationSeasonData>> {
  const data = await fetchBcData();
  const wanted = triplets && new Set(triplets);
  const dates = seasonDates();
  const seasons = new Map<string, StationSeasonData>();
  for (const station of bcStations()) {
    if (!wanted || wanted.has(station.triplet)) seasons.set(station.triplet, buildSeason(station, data, dates));
  }
  return seasons;
}

export async function fetchBcConditions(): Promise<StationCurrentConditions[]> {
  const data = await fetchBcData();
  const dates = seasonDates();
  return bcStations().map((station): StationCurrentConditions => {
    const { current, season } = buildSeason(station, data, dates);
    const lastUpdated = current.lastUpdated ?? dates.at(-1)!;
    const swe = season.map((d) => d.swe);
    const depth = season.map((d) => d.snowDepth);
    const [temp] = atMidnights(readings(data.TA, bcStationId(station.triplet)), [lastUpdated]);
    return {
      ...station,
      swe: current.swe,
      sweNormal: current.sweNormal,
      pctOfNormal: current.pctOfNormal,
      snowDepth: current.snowDepth,
      temp: temp === null ? null : toFahrenheit(temp),
      precipAccum: current.precipAccum,
      sweChange1d: seriesChange(swe, 1),
      sweChange3d: seriesChange(swe, 3),
      sweChange7d: seriesChange(swe, 7),
      depthChange1d: seriesChange(depth, 1, 0),
      depthChange3d: seriesChange(depth, 3, 0),
      depthChange7d: seriesChange(depth, 7, 0),
      lastUpdated,
    };
  });
}

function hourlyFor(data: BcData, id: string): HourlyObservation[] {
  const since = Date.now() - HOURLY_DAYS * 24 * HOUR_MS;
  const byTime = (table: ElementTable) => {
    const column = table.columns.get(id) ?? [];
    return new Map(table.times.map((t, i) => [t, column[i]]));
  };
  const temps = byTime(data.TA);
  const swe = byTime(data.SW);
  const depth = byTime(data.SD);
  return data.SD.times
    .filter((t) => t >= since)
    .map((t) => {
      const d = depth.get(t);
      const s = swe.get(t);
      const c = temps.get(t);
      return {
        datetime: localDateTime(t),
        snowDepth: d == null ? null : cmToInches(d),
        temp: c == null ? null : toFahrenheit(c),
        swe: s == null ? null : toInches(s),
      };
    });
}

export async function fetchBcHourly(triplet: string): Promise<HourlyObservation[]> {
  return hourlyFor(await fetchBcData(), bcStationId(triplet));
}

export async function fetchBcRecentDepth(): Promise<Record<string, RecentDepth>> {
  const data = await fetchBcData();
  const stations: Record<string, RecentDepth> = {};
  for (const station of bcStations()) {
    const recent = latestDepth(hourlyFor(data, bcStationId(station.triplet)));
    if (recent) stations[station.triplet] = recent;
  }
  return stations;
}
