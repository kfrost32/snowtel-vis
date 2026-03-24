import { NextResponse } from "next/server";
import type { StationCurrentConditions } from "@/lib/types";
import seedData from "@/data/station-conditions.json";

const CACHE_HEADER = { "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=1800" };

const data: StationCurrentConditions[] = (seedData as { timestamp: number; data: StationCurrentConditions[] }).data;

export async function GET() {
  return NextResponse.json(data, { headers: CACHE_HEADER });
}
