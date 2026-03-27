import { NextResponse } from "next/server";
import type { StationCurrentConditions } from "@/lib/types";
import seedData from "@/data/station-conditions.json";

const CACHE_HEADER = { "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=1800" };

const parsed = seedData as { timestamp: number; data: StationCurrentConditions[] };

export async function GET() {
  return NextResponse.json(
    { data: parsed.data, fetchedAt: parsed.timestamp, stale: false },
    { headers: CACHE_HEADER }
  );
}
