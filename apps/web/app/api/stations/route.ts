import { NextResponse } from "next/server";
import { fetchStationConditions, mergeConditions } from "@/lib/station-conditions";
import { getSnapshot } from "@/lib/snapshot-cache";
import { snapshotKeys } from "@/lib/snapshot-store";
import type { StationCurrentConditions } from "@snotel/core/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CACHE_HEADER = { "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400" };
const STALE_HEADER = { "Cache-Control": "public, max-age=0, s-maxage=60" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const WAIT_FOR_LIVE_MS = 4000;

export async function GET() {
  try {
    const result = await getSnapshot<StationCurrentConditions[]>({
      key: snapshotKeys.stations,
      maxAge: MAX_AGE_MS,
      waitMs: WAIT_FOR_LIVE_MS,
      load: async (previous) => mergeConditions(await fetchStationConditions(), previous),
    });
    return NextResponse.json(result, { headers: result.stale ? STALE_HEADER : CACHE_HEADER });
  } catch (e) {
    console.error("Station conditions fetch failed:", (e as Error).message);
    return NextResponse.json({ error: "Failed to fetch station conditions" }, { status: 503, headers: NO_CACHE_HEADER });
  }
}
