import { NextResponse } from "next/server";
import { isBcStation } from "@snotel/core/stations";
import { getStationList } from "@/lib/station-list";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CACHE_HEADER = { "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400" };
const STALE_HEADER = { "Cache-Control": "public, max-age=0, s-maxage=60" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };

export async function GET() {
  try {
    const result = await getStationList();
    return NextResponse.json({ ...result, data: result.data.filter((s) => !isBcStation(s)) }, { headers: result.stale ? STALE_HEADER : CACHE_HEADER });
  } catch (e) {
    console.error("Station conditions fetch failed:", (e as Error).message);
    return NextResponse.json({ error: "Failed to fetch station conditions" }, { status: 503, headers: NO_CACHE_HEADER });
  }
}
