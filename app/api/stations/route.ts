import { NextResponse } from "next/server";
import { getAllStations } from "@/lib/stations";
import { buildStationCurrentUrl, parseCsvResponse, parseNumericValue } from "@/lib/snotel-csv";
import type { Station, StationCurrentConditions } from "@/lib/types";

interface CacheEntry {
  data: StationCurrentConditions[];
  timestamp: number;
}

const CACHE_TTL = 60 * 60 * 1000;
let cache: CacheEntry | null = null;
let fetchInProgress: Promise<StationCurrentConditions[]> | null = null;

const CACHE_HEADER = { "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=1800" };
const WARM_CACHE_HEADER = { "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=30" };

async function fetchStationData(triplet: string): Promise<Partial<StationCurrentConditions>> {
  try {
    const url = buildStationCurrentUrl(triplet);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return {};
    const text = await response.text();
    const { rows } = parseCsvResponse(text);
    if (rows.length === 0) return {};

    const headers = Object.keys(rows[0]);
    const sweKey = headers.find((h) => h.includes("Snow Water Equivalent") && !h.includes("Median") && !h.includes("%"));

    let rowIndex = rows.length - 1;
    if (sweKey && !rows[rowIndex][sweKey]?.trim()) {
      for (let i = rows.length - 2; i >= 0; i--) {
        if (rows[i][sweKey]?.trim()) {
          rowIndex = i;
          break;
        }
      }
    }
    const row = rows[rowIndex];
    const medianKey = headers.find((h) => h.includes("Median"));
    const pctKey = headers.find((h) => h.includes("%"));
    const depthKey = headers.find((h) => h.includes("Snow Depth"));
    const precKey = headers.find((h) => h.includes("Precipitation"));
    const tempKey = headers.find((h) => h.includes("Air Temperature Observed"));

    const swe = sweKey ? parseNumericValue(row[sweKey]) : null;
    const sweNormal = medianKey ? parseNumericValue(row[medianKey]) : null;
    const pctOfNormal = pctKey ? parseNumericValue(row[pctKey]) : null;
    const snowDepth = depthKey ? parseNumericValue(row[depthKey]) : null;
    const precipAccum = precKey ? parseNumericValue(row[precKey]) : null;
    const temp = tempKey ? parseNumericValue(row[tempKey]) : null;

    let sweChange1d: number | null = null;
    if (sweKey && rowIndex >= 1) {
      const yesterday = parseNumericValue(rows[rowIndex - 1][sweKey]);
      if (swe !== null && yesterday !== null) {
        sweChange1d = Math.round((swe - yesterday) * 10) / 10;
      }
    }

    let sweChange7d: number | null = null;
    if (sweKey && rowIndex >= 7) {
      const weekAgo = parseNumericValue(rows[rowIndex - 7][sweKey]);
      if (swe !== null && weekAgo !== null) {
        sweChange7d = Math.round((swe - weekAgo) * 10) / 10;
      }
    }

    const dateCol = headers.find((h) => h.toLowerCase() === "date") || headers[0];
    const lastUpdated = row[dateCol] || new Date().toISOString().split("T")[0];

    return { swe, sweNormal, pctOfNormal, snowDepth, precipAccum, temp, sweChange1d, sweChange7d, lastUpdated };
  } catch {
    return {};
  }
}

function emptyConditions(lastUpdated: string): Omit<StationCurrentConditions, keyof Station> {
  return { swe: null, sweNormal: null, pctOfNormal: null, snowDepth: null, temp: null, precipAccum: null, sweChange1d: null, sweChange7d: null, lastUpdated };
}

async function fetchAllStationData(): Promise<StationCurrentConditions[]> {
  const stations = getAllStations();
  const today = new Date().toISOString().split("T")[0];
  const snotelStations = stations.filter((s) => s.network === "SNOTEL");
  const otherStations = stations.filter((s) => s.network !== "SNOTEL");

  const batchSize = 25;
  const results: StationCurrentConditions[] = [];

  for (let i = 0; i < snotelStations.length; i += batchSize) {
    const batch = snotelStations.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (station) => {
        const data = await fetchStationData(station.triplet);
        return { ...station, ...emptyConditions(today), ...data } as StationCurrentConditions;
      })
    );
    results.push(...batchResults);
  }

  for (const station of otherStations) {
    results.push({ ...station, ...emptyConditions(today) });
  }

  return results;
}

function buildFallback(): StationCurrentConditions[] {
  const today = new Date().toISOString().split("T")[0];
  return getAllStations().map((s) => ({ ...s, ...emptyConditions(today) }));
}

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, { headers: CACHE_HEADER });
  }

  if (!fetchInProgress) {
    fetchInProgress = fetchAllStationData()
      .then((data) => {
        cache = { data, timestamp: Date.now() };
        fetchInProgress = null;
        return data;
      })
      .catch(() => {
        fetchInProgress = null;
        return cache?.data || buildFallback();
      });
  }

  if (cache) {
    return NextResponse.json(cache.data, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=60" } });
  }

  return NextResponse.json(buildFallback(), { headers: WARM_CACHE_HEADER });
}
