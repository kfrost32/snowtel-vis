import { NextResponse } from "next/server";
import { getStation, parseTripletFromUrl } from "@snotel/core/stations";
import { fetchDailyData, generateDates } from "@/lib/snotel-api";
import { getCurrentWaterYear, getWaterYearStart } from "@snotel/core/water-year";
import { getCached, setCache, wrapFresh, wrapStale } from "@/lib/api-cache";
import type { DailyObservation, StationSeasonData } from "@snotel/core/types";

const CACHE_HEADER = { "Cache-Control": "public, max-age=1800, s-maxage=14400, stale-while-revalidate=3600" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };
const NRCS_TIMEOUT_MS = 8000;

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

  const cacheKey = `season:${triplet}`;
  try {
    const wy = getCurrentWaterYear();
    const wyStart = getWaterYearStart(wy);
    const today = new Date().toISOString().split("T")[0];

    const series = (await fetchDailyData([triplet], ["WTEQ", "SNWD", "PREC", "TMAX", "TMIN", "TAVG"], wyStart, today, {
      strict: true,
      timeout: NRCS_TIMEOUT_MS,
      median: true,
    })).get(triplet) ?? {};

    const wteq = series.WTEQ;
    const dates = wteq?.dates || generateDates(wyStart, today);
    const wteqVals = wteq?.values || [];
    const allMedian = wteq?.medians || [];
    const snwdVals = series.SNWD?.values || [];
    const precVals = series.PREC?.values || [];
    const tmaxVals = series.TMAX?.values || [];
    const tminVals = series.TMIN?.values || [];
    const tavgVals = series.TAVG?.values || [];

    const season: DailyObservation[] = dates.map((date, i) => ({
      date,
      swe: wteqVals[i] ?? null,
      sweMedian: allMedian[i] ?? null,
      snowDepth: snwdVals[i] ?? null,
      precip: precVals[i] ?? null,
      tmax: tmaxVals[i] ?? null,
      tmin: tminVals[i] ?? null,
      tavg: tavgVals[i] ?? null,
    }));

    const latest = season[season.length - 1];
    const latestSwe = latest?.swe;
    const latestMedian = latest?.sweMedian;

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
        lastUpdated: latest?.date ?? null,
      },
      season,
    };

    setCache(cacheKey, result);
    return NextResponse.json(wrapFresh(result), { headers: CACHE_HEADER });
  } catch {
    const stale = getCached<StationSeasonData>(cacheKey);
    if (stale) {
      return NextResponse.json(wrapStale(stale), { headers: CACHE_HEADER });
    }
    return NextResponse.json({ error: "Failed to fetch station data" }, { status: 500, headers: NO_CACHE_HEADER });
  }
}
