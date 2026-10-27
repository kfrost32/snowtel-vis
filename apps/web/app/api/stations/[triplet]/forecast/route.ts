import { NextResponse } from "next/server";
import { getStation, hasNwsForecast, parseTripletFromUrl } from "@snotel/core/stations";
import { getStationForecast } from "@/lib/nws";

const CACHE_HEADER = { "Cache-Control": "public, max-age=900, s-maxage=1800, stale-while-revalidate=3600" };
const STALE_HEADER = { "Cache-Control": "public, max-age=0, s-maxage=300" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ triplet: string }> }) {
  const triplet = parseTripletFromUrl((await params).triplet);
  if (!hasNwsForecast(getStation(triplet))) {
    return NextResponse.json({ error: "Station not found" }, { status: 404, headers: NO_CACHE_HEADER });
  }
  try {
    const result = await getStationForecast(triplet);
    return NextResponse.json(result, { headers: result.stale ? STALE_HEADER : CACHE_HEADER });
  } catch (e) {
    console.error(`Forecast ${triplet} failed:`, (e as Error).message);
    return NextResponse.json({ error: "Forecast unavailable" }, { status: 503, headers: NO_CACHE_HEADER });
  }
}
