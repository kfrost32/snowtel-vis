import { NextResponse } from "next/server";
import { getStation, parseTripletFromUrl } from "@snotel/core/stations";
import { fetchHourlyData } from "@/lib/snotel-api";
import { getCached, setCache, wrapFresh, wrapStale } from "@/lib/api-cache";
import type { HourlyObservation } from "@snotel/core/types";

const CACHE_HEADER = { "Cache-Control": "public, max-age=900, s-maxage=7200, stale-while-revalidate=1800" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };
const NRCS_TIMEOUT_MS = 8000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ triplet: string }> }
) {
  const { triplet: urlTriplet } = await params;
  const triplet = parseTripletFromUrl(urlTriplet);
  const station = getStation(triplet);

  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404, headers: NO_CACHE_HEADER });
  }

  const cacheKey = `hourly:${triplet}`;
  try {
    const endDate = new Date().toISOString().split("T")[0];
    const begin = new Date();
    begin.setDate(begin.getDate() - 7);
    const beginDate = begin.toISOString().split("T")[0];

    const series = (await fetchHourlyData([triplet], ["SNWD", "TOBS"], beginDate, endDate, { strict: true, timeout: NRCS_TIMEOUT_MS })).get(triplet);
    const snwd = series?.SNWD ?? [];
    const tobs = series?.TOBS ?? [];
    const tobsByTime = new Map(tobs.map((v) => [v.datetime, v.value]));

    const data: HourlyObservation[] = snwd.map((s) => ({
      datetime: s.datetime,
      snowDepth: s.value,
      temp: tobsByTime.get(s.datetime) ?? null,
    }));

    setCache(cacheKey, data);
    return NextResponse.json(wrapFresh(data), { headers: CACHE_HEADER });
  } catch {
    const stale = getCached<HourlyObservation[]>(cacheKey);
    if (stale) {
      return NextResponse.json(wrapStale(stale), { headers: CACHE_HEADER });
    }
    return NextResponse.json({ error: "Failed to fetch hourly data" }, { status: 500, headers: NO_CACHE_HEADER });
  }
}
