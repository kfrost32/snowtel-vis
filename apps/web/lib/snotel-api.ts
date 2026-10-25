export const REST_URL = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1";
const MAX_STATION_ELEMENTS = 1000;

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
  strict?: boolean;
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
  const start = new Date(beginDate.split(" ")[0] + "T12:00:00Z");
  const end = new Date(endDate.split(" ")[0] + "T12:00:00Z");
  const d = new Date(start);
  while (d <= end) {
    dates.push(d.toISOString().split("T")[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

function toDailySeries(beginDate: string, values: RestValue[]): DailySeries | null {
  const last = values.at(-1);
  if (!last) return null;
  const byDate = new Map(values.map((v) => [v.date.split(" ")[0], v]));
  const dates = generateDates(beginDate, last.date);
  return {
    dates,
    values: dates.map((d) => byDate.get(d)?.value ?? null),
    medians: dates.map((d) => byDate.get(d)?.median ?? null),
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
  { strict = false, batchSize = Infinity }: BulkFetchOptions,
  request: (batch: string[]) => Promise<Map<string, T>>
): Promise<Map<string, T>> {
  const size = Math.min(batchSize, Math.floor(MAX_STATION_ELEMENTS / elements.length));
  const fetchBatch = (batch: string[]): Promise<Map<string, T>> =>
    request(batch).catch(async () => {
      if (batch.length < 2) return new Map<string, T>();
      const mid = Math.ceil(batch.length / 2);
      const halves = await Promise.all([batch.slice(0, mid), batch.slice(mid)].map(fetchBatch));
      return new Map([...halves[0], ...halves[1]]);
    });
  const batches: string[][] = [];
  for (let i = 0; i < triplets.length; i += size) {
    batches.push(triplets.slice(i, i + size));
  }
  const results = await Promise.all(batches.map(fetchBatch));
  const merged = new Map<string, T>();
  for (const map of results) {
    for (const [k, v] of map) merged.set(k, v);
  }
  if (strict && merged.size === 0 && triplets.length > 0) throw new Error("NRCS returned no data");
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
        beginDate,
        endDate,
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
