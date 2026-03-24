import { NextResponse } from "next/server";
import { getStation, parseTripletFromUrl } from "@/lib/stations";
import { buildStationHourlyUrl, parseCsvResponse, parseNumericValue } from "@/lib/snotel-csv";

export interface HourlyObservation {
  datetime: string;
  snowDepth: number | null;
  temp: number | null;
}

const hourlyCache = new Map<string, { data: HourlyObservation[]; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 60 * 1000;

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

  const cached = hourlyCache.get(triplet);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = buildStationHourlyUrl(triplet);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch hourly data" }, { status: 502 });
    }

    const text = await response.text();
    const { headers, rows } = parseCsvResponse(text);

    const dateKey = headers.find((h) => h.toLowerCase() === "date") || headers[0];
    const depthKey = headers.find((h) => h.includes("Snow Depth"));
    const tempKey = headers.find((h) => h.includes("Air Temperature Observed"));

    const data: HourlyObservation[] = rows
      .filter((row) => row[dateKey])
      .map((row) => ({
        datetime: row[dateKey],
        snowDepth: depthKey ? parseNumericValue(row[depthKey]) : null,
        temp: tempKey ? parseNumericValue(row[tempKey]) : null,
      }));

    hourlyCache.set(triplet, { data, timestamp: Date.now() });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch hourly data" }, { status: 500 });
  }
}
