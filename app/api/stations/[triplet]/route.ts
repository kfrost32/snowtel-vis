import { NextResponse } from "next/server";
import { getStation, parseTripletFromUrl } from "@/lib/stations";
import { buildStationSeasonUrl, parseCsvResponse, parseNumericValue } from "@/lib/snotel-csv";
import { getCurrentWaterYear, getWaterYearStart } from "@/lib/water-year";
import type { DailyObservation, StationSeasonData } from "@/lib/types";

const seasonCache = new Map<string, { data: StationSeasonData; timestamp: number }>();
const CACHE_TTL = 4 * 60 * 60 * 1000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ triplet: string }> }
) {
  const { triplet: urlTriplet } = await params;
  const triplet = parseTripletFromUrl(urlTriplet);
  const station = getStation(triplet);

  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  const cached = seasonCache.get(triplet);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const wy = getCurrentWaterYear();
    const wyStart = getWaterYearStart(wy);
    const url = buildStationSeasonUrl(triplet, wyStart);

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch SNOTEL data" }, { status: 502 });
    }

    const text = await response.text();
    const { headers, rows } = parseCsvResponse(text);

    const dateKey = headers.find((h) => h.toLowerCase() === "date") || headers[0];
    const sweKey = headers.find((h) => h.includes("Snow Water Equivalent") && !h.includes("Median") && !h.includes("%"));
    const medianKey = headers.find((h) => h.includes("Median Snow Water Equivalent"));
    const depthKey = headers.find((h) => h.includes("Snow Depth"));
    const precKey = headers.find((h) => h.includes("Precipitation Accumulation"));
    const tmaxKey = headers.find((h) => h.includes("Air Temperature Maximum"));
    const tminKey = headers.find((h) => h.includes("Air Temperature Minimum"));
    const tavgKey = headers.find((h) => h.includes("Air Temperature Average"));

    const season: DailyObservation[] = rows.map((row) => ({
      date: row[dateKey] || "",
      swe: sweKey ? parseNumericValue(row[sweKey]) : null,
      sweMedian: medianKey ? parseNumericValue(row[medianKey]) : null,
      snowDepth: depthKey ? parseNumericValue(row[depthKey]) : null,
      precip: precKey ? parseNumericValue(row[precKey]) : null,
      tmax: tmaxKey ? parseNumericValue(row[tmaxKey]) : null,
      tmin: tminKey ? parseNumericValue(row[tminKey]) : null,
      tavg: tavgKey ? parseNumericValue(row[tavgKey]) : null,
    }));

    const latest = season[season.length - 1];
    const latestMedian = latest?.sweMedian;
    const latestSwe = latest?.swe;

    const result: StationSeasonData = {
      station,
      current: {
        swe: latestSwe ?? null,
        sweNormal: latestMedian ?? null,
        pctOfNormal: latestSwe !== null && latestMedian !== null && latestMedian > 0
          ? Math.round((latestSwe / latestMedian) * 100)
          : null,
        snowDepth: latest?.snowDepth ?? null,
        temp: latest?.tavg ?? null,
        precipAccum: latest?.precip ?? null,
      },
      season,
    };

    seasonCache.set(triplet, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch station data" }, { status: 500 });
  }
}
