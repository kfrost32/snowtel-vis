import { shiftDate } from "@snotel/core/water-year";

export const REST_URL = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1";
const MAX_STATION_ELEMENTS = 1000;
const REST_DAILY_OFFSET_DAYS = 1;

interface RestValue {
  date: string;
  value?: number | null;
  median?: number | null;
}

interface RestStation {
  stationTriplet: string;
  data: { stationElement: { elementCode: string }; values?: RestValue[] }[];
}

export interface DailySeries {
  dates: string[];
  values: (number | null)[];
  medians: (number | null)[];
}

export interface HourlyValue {
  datetime: string;
  value: number | null;
}

export interface BulkFetchOptions {
  timeout?: number;
  batchSize?: number;
}

async function restRequestOnce(params: Record<string, string>, timeout: number): Promise<RestStation[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${REST_URL}/data?${new URLSearchParams(params)}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`NRCS request failed: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function restRequest(params: Record<string, string>, timeout = 30000): Promise<RestStation[]> {
  try {
    return await restRequestOnce(params, timeout);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return restRequestOnce(params, timeout);
  }
}

export function generateDates(beginDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const end = endDate.slice(0, 10);
  for (let d = beginDate.slice(0, 10); d <= end; d = shiftDate(d, 1)) dates.push(d);
  return dates;
}

function toDailySeries(beginDate: string, values: RestValue[]): DailySeries | null {
  const last = values.findLast((v) => v.value != null);
  if (!last) return null;
  const byDate = new Map(values.map((v) => [v.date.slice(0, 10), v]));
  const restDates = generateDates(shiftDate(beginDate, -REST_DAILY_OFFSET_DAYS), last.date);
  return {
    dates: generateDates(beginDate, shiftDate(last.date, REST_DAILY_OFFSET_DAYS)),
    values: restDates.map((d) => byDate.get(d)?.value ?? null),
    medians: restDates.map((d) => byDate.get(d)?.median ?? null),
  };
}

function groupByStation<T>(
  stations: RestStation[],
  convert: (values: RestValue[]) => T | null
): Map<string, Record<string, T>> {
  const result = new Map<string, Record<string, T>>();
  for (const station of stations) {
    const elements: Record<string, T> = {};
    for (const { stationElement, values } of station.data) {
      const series = convert(values ?? []);
      if (series) elements[stationElement.elementCode] = series;
    }
    result.set(station.stationTriplet, elements);
  }
  return result;
}

async function fetchInBatches<T>(
  triplets: string[],
  elements: string[],
  { batchSize = Infinity }: BulkFetchOptions,
  request: (batch: string[]) => Promise<Map<string, T>>
): Promise<Map<string, T>> {
  const size = Math.min(batchSize, Math.floor(MAX_STATION_ELEMENTS / elements.length));
  const batches: string[][] = [];
  for (let i = 0; i < triplets.length; i += size) {
    batches.push(triplets.slice(i, i + size));
  }
  const settled = await Promise.allSettled(batches.map(request));
  const firstFailure = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (firstFailure && settled.every((r) => r.status === "rejected")) throw firstFailure.reason;

  const split = async (batch: string[]): Promise<Map<string, T>> => {
    if (batch.length < 2) return new Map<string, T>();
    const mid = Math.ceil(batch.length / 2);
    const halves = await Promise.all([batch.slice(0, mid), batch.slice(mid)].map((half) => request(half).catch(() => split(half))));
    return new Map([...halves[0], ...halves[1]]);
  };
  const results = await Promise.all(settled.map((r, i) => (r.status === "fulfilled" ? r.value : split(batches[i]))));
  const merged = new Map<string, T>();
  for (const map of results) {
    for (const [k, v] of map) merged.set(k, v);
  }
  return merged;
}

export function fetchDailyData(
  triplets: string[],
  elements: string[],
  beginDate: string,
  endDate: string,
  { median = false, ...options }: BulkFetchOptions & { median?: boolean } = {}
): Promise<Map<string, Record<string, DailySeries>>> {
  return fetchInBatches(triplets, elements, options, (batch) =>
    restRequest(
      {
        stationTriplets: batch.join(","),
        elements: elements.join(","),
        duration: "DAILY",
        beginDate: shiftDate(beginDate, -REST_DAILY_OFFSET_DAYS),
        endDate: shiftDate(endDate, -REST_DAILY_OFFSET_DAYS),
        ...(median && { centralTendencyType: "MEDIAN" }),
      },
      options.timeout
    ).then((stations) => groupByStation(stations, (values) => toDailySeries(beginDate, values)))
  );
}

export function fetchHourlyData(
  triplets: string[],
  elements: string[],
  beginDate: string,
  endDate: string,
  options: BulkFetchOptions = {}
): Promise<Map<string, Record<string, HourlyValue[]>>> {
  return fetchInBatches(triplets, elements, options, (batch) =>
    restRequest(
      { stationTriplets: batch.join(","), elements: elements.join(","), duration: "HOURLY", beginDate, endDate },
      options.timeout
    ).then((stations) =>
      groupByStation(stations, (values) => values.map((v) => ({ datetime: v.date, value: v.value ?? null })))
    )
  );
}
