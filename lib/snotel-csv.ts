import { REPORT_GENERATOR_BASE } from "./constants";

export function buildStationCurrentUrl(triplet: string): string {
  const encoded = encodeURIComponent(triplet);
  return `${REPORT_GENERATOR_BASE}/customSingleStationReport/daily/end_of_period/${encoded}%7Cid=%22%22%7Cname/-8,0/WTEQ::value,WTEQ::median_1991,WTEQ::pctOfMedian_1991,SNWD::value,PREC::value,TOBS::value,TMAX::value,TMIN::value,TAVG::value`;
}

export function buildStationSeasonUrl(triplet: string, waterYearStart: string): string {
  const encoded = encodeURIComponent(triplet);
  return `${REPORT_GENERATOR_BASE}/customSingleStationReport/daily/start_of_period/${encoded}%7Cid=%22%22%7Cname/${waterYearStart},0/WTEQ::value,WTEQ::median_1991,SNWD::value,PREC::value,TMAX::value,TMIN::value,TAVG::value`;
}

export function buildStationHistoricalUrl(triplet: string): string {
  const encoded = encodeURIComponent(triplet);
  return `${REPORT_GENERATOR_BASE}/customSingleStationReport/daily/start_of_period/${encoded}%7Cid=%22%22%7Cname/POR_BEGIN,POR_END/WTEQ::value,WTEQ::median_1991,PREC::value`;
}

export function buildStationHourlyUrl(triplet: string): string {
  const encoded = encodeURIComponent(triplet);
  return `${REPORT_GENERATOR_BASE}/customSingleStationReport/hourly/start_of_period/${encoded}%7Cid=%22%22%7Cname/-6,0/SNWD::value,TOBS::value`;
}

export function buildMultiStationCurrentUrl(triplets: string[]): string {
  const stationList = triplets.join("%7C");
  return `${REPORT_GENERATOR_BASE}/customMultipleStationReport/daily/start_of_period/${stationList}/-1,0/name,stationId,state.code,elevation,latitude,longitude,WTEQ::value,WTEQ::median_1991,WTEQ::pctOfMedian_1991,SNWD::value,PREC::value,TOBS::value`;
}

export interface ParsedRow {
  [key: string]: string;
}

export function parseCsvResponse(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split("\n");
  const dataLines: string[] = [];
  let headers: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (headers.length === 0) {
      headers = trimmed.split(",").map((h) => h.trim());
      continue;
    }

    dataLines.push(trimmed);
  }

  const rows = dataLines.map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: ParsedRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });

  return { headers, rows };
}

export function parseNumericValue(value: string): number | null {
  if (!value || value === "" || value === "-99.9" || value === "-99.0") return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

export async function fetchSnotelCsv(url: string): Promise<{ headers: string[]; rows: ParsedRow[] }> {
  const response = await fetch(url, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`SNOTEL fetch failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  return parseCsvResponse(text);
}
