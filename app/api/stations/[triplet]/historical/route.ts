import { NextResponse } from "next/server";
import { getStation, parseTripletFromUrl } from "@/lib/stations";
import { buildStationHistoricalUrl, parseCsvResponse, parseNumericValue } from "@/lib/snotel-csv";
import type { WaterYearSummary } from "@/lib/types";

const historicalCache = new Map<string, { data: WaterYearSummary[]; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

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

  const cached = historicalCache.get(triplet);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = buildStationHistoricalUrl(triplet);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch historical data" }, { status: 502 });
    }

    const text = await response.text();
    const { headers, rows } = parseCsvResponse(text);

    const dateKey = headers.find((h) => h.toLowerCase() === "date") || headers[0];
    const sweKey = headers.find((h) => h.includes("Snow Water Equivalent") && !h.includes("Median") && !h.includes("%"));
    const precKey = headers.find((h) => h.includes("Precipitation Accumulation"));

    const waterYearData = new Map<number, { peakSwe: number; peakSweDate: string; apr1Swe: number | null; totalPrecip: number | null }>();

    for (const row of rows) {
      const dateStr = row[dateKey];
      if (!dateStr) continue;

      const swe = sweKey ? parseNumericValue(row[sweKey]) : null;
      const precip = precKey ? parseNumericValue(row[precKey]) : null;

      const date = new Date(dateStr + "T00:00:00");
      const month = date.getMonth();
      const year = date.getFullYear();
      const waterYear = month >= 9 ? year + 1 : year;

      if (!waterYearData.has(waterYear)) {
        waterYearData.set(waterYear, { peakSwe: 0, peakSweDate: dateStr, apr1Swe: null, totalPrecip: null });
      }

      const wy = waterYearData.get(waterYear)!;

      if (swe !== null && swe > wy.peakSwe) {
        wy.peakSwe = swe;
        wy.peakSweDate = dateStr;
      }

      if (month === 3 && date.getDate() === 1 && swe !== null) {
        wy.apr1Swe = swe;
      }

      if (month === 8 && date.getDate() === 30 && precip !== null) {
        wy.totalPrecip = precip;
      }
    }

    const summaries: WaterYearSummary[] = Array.from(waterYearData.entries())
      .map(([waterYear, data]) => ({
        waterYear,
        peakSwe: data.peakSwe,
        peakSweDate: data.peakSweDate,
        apr1Swe: data.apr1Swe,
        totalPrecip: data.totalPrecip,
      }))
      .filter((s) => s.peakSwe > 0)
      .sort((a, b) => a.waterYear - b.waterYear);

    historicalCache.set(triplet, { data: summaries, timestamp: Date.now() });
    return NextResponse.json(summaries);
  } catch {
    return NextResponse.json({ error: "Failed to fetch historical data" }, { status: 500 });
  }
}
