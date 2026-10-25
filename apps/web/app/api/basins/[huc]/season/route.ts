import { NextResponse } from "next/server";
import { getAllStations } from "@snotel/core/stations";
import { getStationHucs } from "@snotel/core/basins";
import { getCurrentWaterYear, getWaterYearStart } from "@snotel/core/water-year";
import { fetchDailyData } from "@/lib/snotel-api";
import { averageSeason, type BasinSeasonPoint } from "@/lib/basin-season";
import { todayInDataTimezone } from "@/lib/station-conditions";
import { getSnapshot } from "@/lib/snapshot-cache";
import { snapshotKeys } from "@/lib/snapshot-store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CACHE_HEADER = { "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=1800" };
const STALE_HEADER = { "Cache-Control": "public, max-age=0, s-maxage=300" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const WAIT_FOR_LIVE_MS = 4000;

async function fetchBasinSeason(huc: string): Promise<BasinSeasonPoint[]> {
  const triplets = getAllStations()
    .filter((s) => s.network === "SNOTEL" && getStationHucs(s).some((h) => h.startsWith(huc)))
    .map((s) => s.triplet);
  const data = await fetchDailyData(triplets, ["WTEQ"], getWaterYearStart(getCurrentWaterYear()), todayInDataTimezone(), {
    timeout: 90000,
    batchSize: 100,
  });
  return averageSeason(
    [...data.values()].flatMap(({ WTEQ }) => (WTEQ ? [WTEQ.dates.map((date, i) => ({ date, swe: WTEQ.values[i] }))] : []))
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ huc: string }> }) {
  const { huc } = await params;
  if (!/^\d{2}(\d{2})?$/.test(huc)) {
    return NextResponse.json({ error: "Invalid basin" }, { status: 404, headers: NO_CACHE_HEADER });
  }
  try {
    const result = await getSnapshot<BasinSeasonPoint[]>({
      key: snapshotKeys.basinSeason(huc),
      maxAge: MAX_AGE_MS,
      waitMs: WAIT_FOR_LIVE_MS,
      load: () => fetchBasinSeason(huc),
    });
    return NextResponse.json(result, { headers: result.stale ? STALE_HEADER : CACHE_HEADER });
  } catch (e) {
    console.error(`Basin ${huc} season fetch failed:`, (e as Error).message);
    return NextResponse.json({ error: "Failed to fetch basin season" }, { status: 502, headers: NO_CACHE_HEADER });
  }
}
