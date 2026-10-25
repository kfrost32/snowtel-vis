import { NextResponse } from "next/server";
import { fetchRecentDepth } from "@/lib/recent-depth";
import { getSnapshot } from "@/lib/snapshot-cache";
import { snapshotKeys } from "@/lib/snapshot-store";
import type { RecentConditions } from "@snotel/core/recent";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CACHE_HEADER = { "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600" };
const STALE_HEADER = { "Cache-Control": "public, max-age=0, s-maxage=60" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };
const MAX_AGE_MS = 60 * 60 * 1000;
const WAIT_FOR_LIVE_MS = 4000;

export async function GET() {
  try {
    const result = await getSnapshot<RecentConditions>({
      key: snapshotKeys.recent,
      maxAge: MAX_AGE_MS,
      waitMs: WAIT_FOR_LIVE_MS,
      load: fetchRecentDepth,
    });
    return NextResponse.json(result, { headers: result.stale ? STALE_HEADER : CACHE_HEADER });
  } catch (e) {
    console.error("Recent conditions fetch failed:", (e as Error).message);
    return NextResponse.json({ error: "Failed to fetch recent conditions" }, { status: 503, headers: NO_CACHE_HEADER });
  }
}
