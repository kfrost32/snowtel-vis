import { NextResponse } from "next/server";
import { getStation, isBcStation, parseTripletFromUrl } from "@snotel/core/stations";
import { fetchStationSeasons } from "@/lib/station-season";
import { fetchBcSeason } from "@/lib/bc-snow";
import { getSnapshot } from "@/lib/snapshot-cache";
import { snapshotKeys } from "@/lib/snapshot-store";
import type { StationSeasonData } from "@snotel/core/types";

const CACHE_HEADER = { "Cache-Control": "public, max-age=1800, s-maxage=14400, stale-while-revalidate=3600" };
const STALE_HEADER = { "Cache-Control": "public, max-age=0, s-maxage=300" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };
const NRCS_TIMEOUT_MS = 8000;
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

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

  try {
    const result = await getSnapshot<StationSeasonData>({
      key: snapshotKeys.season(triplet),
      maxAge: MAX_AGE_MS,
      load: async () => {
        const season = isBcStation(station)
          ? await fetchBcSeason(triplet)
          : (await fetchStationSeasons([triplet], { timeout: NRCS_TIMEOUT_MS })).get(triplet);
        if (!season) throw new Error(`No data returned for ${triplet}`);
        return season;
      },
    });
    return NextResponse.json(result, { headers: result.stale ? STALE_HEADER : CACHE_HEADER });
  } catch (e) {
    console.error(`Station ${triplet} fetch failed:`, (e as Error).message);
    return NextResponse.json({ error: "Failed to fetch station data" }, { status: 503, headers: NO_CACHE_HEADER });
  }
}
