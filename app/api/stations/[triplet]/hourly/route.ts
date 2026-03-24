import { NextResponse } from "next/server";
import { getStation, parseTripletFromUrl } from "@/lib/stations";
import { fetchHourlyData } from "@/lib/snotel-api";

export interface HourlyObservation {
  datetime: string;
  snowDepth: number | null;
  temp: number | null;
}

const CACHE_HEADER = { "Cache-Control": "public, max-age=900, s-maxage=7200, stale-while-revalidate=1800" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ triplet: string }> }
) {
  const { triplet: urlTriplet } = await params;
  const triplet = parseTripletFromUrl(urlTriplet);
  const station = getStation(triplet);

  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404, headers: NO_CACHE_HEADER });
  }

  try {
    const endDate = new Date().toISOString().split("T")[0];
    const begin = new Date();
    begin.setDate(begin.getDate() - 7);
    const beginDate = begin.toISOString().split("T")[0];

    const [snwdMap, tobsMap] = await Promise.all([
      fetchHourlyData([triplet], "SNWD", beginDate, endDate),
      fetchHourlyData([triplet], "TOBS", beginDate, endDate),
    ]);

    const snwd = snwdMap.get(triplet) || [];
    const tobs = tobsMap.get(triplet) || [];
    const tobsByTime = new Map(tobs.map((v) => [v.datetime, v.value]));

    const data: HourlyObservation[] = snwd.map((s) => ({
      datetime: s.datetime,
      snowDepth: s.value,
      temp: tobsByTime.get(s.datetime) ?? null,
    }));

    return NextResponse.json(data, { headers: CACHE_HEADER });
  } catch {
    return NextResponse.json({ error: "Failed to fetch hourly data" }, { status: 500, headers: NO_CACHE_HEADER });
  }
}
