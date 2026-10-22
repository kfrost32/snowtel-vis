import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchStationConditions } from "@/lib/station-conditions";
import { getCached, setCache, wrapStale } from "@/lib/api-cache";
import type { ApiResponse } from "@/lib/api-cache";
import type { StationCurrentConditions } from "@/lib/types";
import seedData from "@/data/station-conditions.json";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CACHE_HEADER = { "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=1800" };
const CACHE_KEY = "stations:current";

const seed = seedData as { timestamp: number; data: StationCurrentConditions[] };

const getStationConditions = unstable_cache(
  async () => ({ data: await fetchStationConditions(), fetchedAt: Date.now() }),
  [CACHE_KEY],
  { revalidate: 3600 }
);

export async function GET() {
  try {
    const fresh = await getStationConditions();
    setCache(CACHE_KEY, fresh.data);
    const body: ApiResponse<StationCurrentConditions[]> = { ...fresh, stale: false };
    return NextResponse.json(body, { headers: CACHE_HEADER });
  } catch (e) {
    console.error("Station conditions fetch failed:", (e as Error).message);
    const stale = getCached<StationCurrentConditions[]>(CACHE_KEY) ?? { data: seed.data, fetchedAt: seed.timestamp };
    return NextResponse.json(wrapStale(stale), { headers: CACHE_HEADER });
  }
}
