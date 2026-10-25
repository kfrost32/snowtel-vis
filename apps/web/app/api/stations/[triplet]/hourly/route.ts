import { NextResponse } from "next/server";
import { getStation, parseTripletFromUrl } from "@snotel/core/stations";
import { fetchHourlyData } from "@/lib/snotel-api";
import { shiftDate } from "@snotel/core/water-year";
import { getSnapshot, peekSnapshot } from "@/lib/snapshot-cache";
import { snapshotKeys, type Snapshot } from "@/lib/snapshot-store";
import type { RecentConditions } from "@snotel/core/recent";
import type { HourlyObservation } from "@snotel/core/types";

const CACHE_HEADER = { "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1800" };
const STALE_HEADER = { "Cache-Control": "public, max-age=0, s-maxage=300" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };
const NRCS_TIMEOUT_MS = 8000;
const MAX_AGE_MS = 60 * 60 * 1000;

async function fetchHourly(triplet: string): Promise<HourlyObservation[]> {
  const endDate = shiftDate(new Date().toISOString().split("T")[0], 1);
  const begin = new Date();
  begin.setDate(begin.getDate() - 7);
  const beginDate = begin.toISOString().split("T")[0];

  const series = (await fetchHourlyData([triplet], ["SNWD", "TOBS", "WTEQ"], beginDate, endDate, { timeout: NRCS_TIMEOUT_MS })).get(triplet);
  const tobsByTime = new Map((series?.TOBS ?? []).map((v) => [v.datetime, v.value]));
  const sweByTime = new Map((series?.WTEQ ?? []).map((v) => [v.datetime, v.value]));
  return (series?.SNWD ?? []).map((s) => ({
    datetime: s.datetime,
    snowDepth: s.value,
    temp: tobsByTime.get(s.datetime) ?? null,
    swe: sweByTime.get(s.datetime) ?? null,
  }));
}

async function behindRecent(triplet: string, snapshot: Snapshot<HourlyObservation[]>): Promise<boolean> {
  const recent = await peekSnapshot<RecentConditions>(snapshotKeys.recent);
  const recentAt = recent?.data.stations[triplet]?.depthAt;
  if (!recent || !recentAt || snapshot.fetchedAt >= recent.fetchedAt) return false;
  const ownAt = snapshot.data.findLast((h) => h.snowDepth !== null)?.datetime;
  return !ownAt || ownAt < recentAt;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ triplet: string }> }
) {
  const { triplet: urlTriplet } = await params;
  const triplet = parseTripletFromUrl(urlTriplet);
  if (!getStation(triplet)) {
    return NextResponse.json({ error: "Station not found" }, { status: 404, headers: NO_CACHE_HEADER });
  }

  try {
    const result = await getSnapshot<HourlyObservation[]>({
      key: snapshotKeys.hourly(triplet),
      maxAge: MAX_AGE_MS,
      load: () => fetchHourly(triplet),
      expired: (snapshot) => behindRecent(triplet, snapshot),
    });
    return NextResponse.json(result, { headers: result.stale ? STALE_HEADER : CACHE_HEADER });
  } catch (e) {
    console.error(`Hourly ${triplet} fetch failed:`, (e as Error).message);
    return NextResponse.json({ error: "Failed to fetch hourly data" }, { status: 503, headers: NO_CACHE_HEADER });
  }
}
