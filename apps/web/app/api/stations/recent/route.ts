import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchRecentDepth } from "@/lib/recent-depth";
import { getCached, setCache, wrapStale } from "@/lib/api-cache";
import type { RecentConditions } from "@snotel/core/recent";

export const maxDuration = 300;

const CACHE_KEY = "stations-recent";
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;
const CACHE_HEADER = { "Cache-Control": "public, max-age=600, s-maxage=1800, stale-while-revalidate=3600" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };

const getRecent = unstable_cache(
  async () => ({ data: await fetchRecentDepth(), fetchedAt: Date.now() }),
  [CACHE_KEY],
  { revalidate: 3600 }
);

let inFlight: ReturnType<typeof getRecent> | null = null;
let failedAt = 0;

function loadRecent() {
  inFlight ??= getRecent()
    .then((fresh) => {
      setCache(CACHE_KEY, fresh.data);
      return fresh;
    })
    .catch((e) => {
      failedAt = Date.now();
      throw e;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function GET() {
  const stale = getCached<RecentConditions>(CACHE_KEY);
  if (stale && Date.now() - failedAt < RETRY_AFTER_FAILURE_MS) {
    return NextResponse.json(wrapStale(stale), { headers: CACHE_HEADER });
  }
  try {
    const fresh = await loadRecent();
    return NextResponse.json({ ...fresh, stale: false }, { headers: CACHE_HEADER });
  } catch {
    if (stale) return NextResponse.json(wrapStale(stale), { headers: CACHE_HEADER });
    return NextResponse.json({ error: "Failed to fetch recent conditions" }, { status: 500, headers: NO_CACHE_HEADER });
  }
}
