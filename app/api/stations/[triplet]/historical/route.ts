import { NextResponse } from "next/server";
import { getStation, parseTripletFromUrl } from "@/lib/stations";
import { fetchPorData } from "@/lib/snotel-api";
import { getCached, setCache, wrapFresh, wrapStale } from "@/lib/api-cache";
import type { WaterYearSummary } from "@/lib/types";

const CACHE_HEADER = { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600" };
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

  const cacheKey = `historical:${triplet}`;
  try {
    const beginDate = station.beginDate || "1980-01-01";
    const endDate = new Date().toISOString().split("T")[0];

    const [wteq, prec] = await Promise.all([
      fetchPorData(triplet, "WTEQ", beginDate, endDate),
      fetchPorData(triplet, "PREC", beginDate, endDate),
    ]);

    if (!wteq.dates.length) {
      return NextResponse.json([], { headers: CACHE_HEADER });
    }

    const precByDate = new Map<string, number | null>();
    for (let i = 0; i < prec.dates.length; i++) {
      precByDate.set(prec.dates[i], prec.values[i]);
    }

    const waterYearData = new Map<number, { peakSwe: number; peakSweDate: string; apr1Swe: number | null; totalPrecip: number | null }>();

    for (let i = 0; i < wteq.dates.length; i++) {
      const dateStr = wteq.dates[i];
      const swe = wteq.values[i];
      const precip = precByDate.get(dateStr) ?? null;

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

    setCache(cacheKey, summaries);
    return NextResponse.json(wrapFresh(summaries), { headers: CACHE_HEADER });
  } catch {
    const stale = getCached<WaterYearSummary[]>(cacheKey);
    if (stale) {
      return NextResponse.json(wrapStale(stale), { headers: CACHE_HEADER });
    }
    return NextResponse.json({ error: "Failed to fetch historical data" }, { status: 500, headers: NO_CACHE_HEADER });
  }
}
