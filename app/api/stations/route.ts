import { NextResponse, after } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchStationConditions } from "@/lib/station-conditions";
import { getCached, setCache, wrapStale } from "@/lib/api-cache";
import type { ApiResponse } from "@/lib/api-cache";
import type { StationCurrentConditions } from "@/lib/types";
import seedData from "@/data/station-conditions.json";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CACHE_HEADER = { "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400" };
const FALLBACK_HEADER = { "Cache-Control": "no-store" };
const CACHE_KEY = "stations:current";
const FALLBACK_AFTER_MS = 4000;

const seed = seedData as { timestamp: number; data: StationCurrentConditions[] };

const getStationConditions = unstable_cache(
  async () => ({ data: await fetchStationConditions(), fetchedAt: Date.now() }),
  [CACHE_KEY],
  { revalidate: 3600 }
);

let inFlight: ReturnType<typeof getStationConditions> | null = null;

function loadLive() {
  inFlight ??= getStationConditions()
    .then((fresh) => {
      setCache(CACHE_KEY, fresh.data);
      return fresh;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function fallback() {
  const stale = getCached<StationCurrentConditions[]>(CACHE_KEY) ?? { data: seed.data, fetchedAt: seed.timestamp };
  return NextResponse.json(wrapStale(stale), { headers: FALLBACK_HEADER });
}

export async function GET() {
  if (inFlight) return fallback();
  const live = loadLive();
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), FALLBACK_AFTER_MS));

  try {
    const fresh = await Promise.race([live, timeout]);
    if (fresh) {
      const body: ApiResponse<StationCurrentConditions[]> = { ...fresh, stale: false };
      return NextResponse.json(body, { headers: CACHE_HEADER });
    }
    after(() => live.catch((e) => console.error("Station conditions fetch failed:", (e as Error).message)));
    return fallback();
  } catch (e) {
    console.error("Station conditions fetch failed:", (e as Error).message);
    return fallback();
  }
}
