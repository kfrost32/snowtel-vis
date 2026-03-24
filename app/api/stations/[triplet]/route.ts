import { NextResponse } from "next/server";
import { getStation, parseTripletFromUrl } from "@/lib/stations";
import { fetchElementData, fetchMedianData, generateDates } from "@/lib/snotel-api";
import { getCurrentWaterYear, getWaterYearStart } from "@/lib/water-year";
import type { DailyObservation, StationSeasonData } from "@/lib/types";

const CACHE_HEADER = { "Cache-Control": "public, max-age=1800, s-maxage=14400, stale-while-revalidate=3600" };
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
    const wy = getCurrentWaterYear();
    const wyStart = getWaterYearStart(wy);
    const today = new Date().toISOString().split("T")[0];
    const todayDate = new Date();

    const [wteqMap, snwdMap, precMap, tmaxMap, tminMap, tavgMap, medianOctDec, medianJanNow] = await Promise.all([
      fetchElementData([triplet], "WTEQ", wyStart, today),
      fetchElementData([triplet], "SNWD", wyStart, today),
      fetchElementData([triplet], "PREC", wyStart, today),
      fetchElementData([triplet], "TMAX", wyStart, today),
      fetchElementData([triplet], "TMIN", wyStart, today),
      fetchElementData([triplet], "TAVG", wyStart, today),
      fetchMedianData([triplet], "WTEQ", 10, 1, 12, 31),
      todayDate.getMonth() >= 9
        ? Promise.resolve(new Map<string, (number | null)[]>())
        : fetchMedianData([triplet], "WTEQ", 1, 1, todayDate.getMonth() + 1, todayDate.getDate()),
    ]);

    const wteq = wteqMap.get(triplet);
    const dates = wteq?.dates || generateDates(wyStart, today);
    const wteqVals = wteq?.values || [];
    const snwdVals = snwdMap.get(triplet)?.values || [];
    const precVals = precMap.get(triplet)?.values || [];
    const tmaxVals = tmaxMap.get(triplet)?.values || [];
    const tminVals = tminMap.get(triplet)?.values || [];
    const tavgVals = tavgMap.get(triplet)?.values || [];

    const octDecMedian = medianOctDec.get(triplet) || [];
    const janNowMedian = medianJanNow.get(triplet) || [];
    const allMedian = [...octDecMedian, ...janNowMedian];

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

    return NextResponse.json(result, { headers: CACHE_HEADER });
  } catch {
    return NextResponse.json({ error: "Failed to fetch station data" }, { status: 500, headers: NO_CACHE_HEADER });
  }
}
