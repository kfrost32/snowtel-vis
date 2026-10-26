import { NextResponse } from "next/server";
import type { ForecastTotals } from "@snotel/core/forecast";
import { peekSnapshot } from "@/lib/snapshot-cache";
import { snapshotKeys } from "@/lib/snapshot-store";

export const dynamic = "force-dynamic";

const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
const CACHE_HEADER = { "Cache-Control": "public, max-age=600, s-maxage=1800, stale-while-revalidate=3600" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };

export async function GET() {
  const snapshot = await peekSnapshot<ForecastTotals>(snapshotKeys.forecasts);
  if (!snapshot) return NextResponse.json({ error: "Forecasts not available yet" }, { status: 503, headers: NO_CACHE_HEADER });
  return NextResponse.json({ ...snapshot, stale: Date.now() - snapshot.fetchedAt > STALE_AFTER_MS }, { headers: CACHE_HEADER });
}
