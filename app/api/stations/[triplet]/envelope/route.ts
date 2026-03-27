import { NextResponse } from "next/server";
import { getStation, parseTripletFromUrl } from "@/lib/stations";
import { fetchPorData, fetchWaterYearMedian } from "@/lib/snotel-api";
import { getWaterYearDay, getCurrentWaterYear } from "@/lib/water-year";
import { getCached, setCache, wrapFresh, wrapStale } from "@/lib/api-cache";
import type { EnvelopeDay, StationEnvelope } from "@/lib/types";

const CACHE_HEADER = { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };

function buildEnvelope(por: { dates: string[]; values: (number | null)[] }, medianValues: (number | null)[]) {
  const byWyDay = new Map<number, { val: number; wy: number }[]>();
  for (let i = 0; i < por.dates.length; i++) {
    const val = por.values[i];
    if (val === null) continue;
    const dateStr = por.dates[i];
    const wyDay = getWaterYearDay(dateStr);
    const date = new Date(dateStr + "T12:00:00Z");
    const month = date.getUTCMonth();
    const wy = month >= 9 ? date.getUTCFullYear() + 1 : date.getUTCFullYear();
    if (!byWyDay.has(wyDay)) byWyDay.set(wyDay, []);
    byWyDay.get(wyDay)!.push({ val, wy });
  }

  const envelope: EnvelopeDay[] = [];
  let peakDay = 1;
  let peakVal = 0;
  const currentWy = getCurrentWaterYear();

  for (let wyDay = 1; wyDay <= 366; wyDay++) {
    const vals = byWyDay.get(wyDay);
    const medianIdx = wyDay - 1;
    const median = medianIdx < medianValues.length ? medianValues[medianIdx] : null;

    if (median !== null && median > peakVal) {
      peakVal = median;
      peakDay = wyDay;
    }

    if (!vals || vals.length === 0) {
      envelope.push({ wyDay, max: null, min: null, median });
      continue;
    }

    const historical = vals.filter(v => v.wy !== currentWy);
    if (historical.length === 0) {
      envelope.push({ wyDay, max: null, min: null, median });
      continue;
    }
    let max = historical[0].val;
    let min = historical[0].val;
    let maxYear = historical[0].wy;
    let minYear = historical[0].wy;
    for (const v of historical) {
      if (v.val > max) { max = v.val; maxYear = v.wy; }
      if (v.val < min) { min = v.val; minYear = v.wy; }
    }

    envelope.push({ wyDay, max, min, median, maxYear, minYear });
  }

  return { envelope, peakDay, peakVal };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ triplet: string }> }
) {
  const { triplet: urlTripletParam } = await params;
  const triplet = parseTripletFromUrl(urlTripletParam);
  const station = getStation(triplet);

  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404, headers: NO_CACHE_HEADER });
  }

  const cacheKey = `envelope:${triplet}`;
  try {
    const beginDate = station.beginDate || "1980-01-01";
    const endDate = new Date().toISOString().split("T")[0];

    const [wteq, wteqMedianMap, snwd, snwdMedianMap] = await Promise.all([
      fetchPorData(triplet, "WTEQ", beginDate, endDate),
      fetchWaterYearMedian([triplet], "WTEQ"),
      fetchPorData(triplet, "SNWD", beginDate, endDate),
      fetchWaterYearMedian([triplet], "SNWD"),
    ]);

    if (!wteq.dates.length) {
      return NextResponse.json({ envelope: [], medianPeakDay: 0, medianPeakSwe: 0, depthEnvelope: [], medianPeakDepthDay: 0, medianPeakDepth: 0 }, { headers: CACHE_HEADER });
    }

    const wteqMedianValues = wteqMedianMap.get(triplet) || [];
    const sweResult = buildEnvelope(wteq, wteqMedianValues);

    const snwdMedianValues = snwdMedianMap.get(triplet) || [];
    const depthResult = buildEnvelope(snwd, snwdMedianValues);

    const result: StationEnvelope = {
      envelope: sweResult.envelope,
      medianPeakDay: sweResult.peakDay,
      medianPeakSwe: sweResult.peakVal,
      depthEnvelope: depthResult.envelope,
      medianPeakDepthDay: depthResult.peakDay,
      medianPeakDepth: depthResult.peakVal,
    };
    setCache(cacheKey, result);
    return NextResponse.json(wrapFresh(result), { headers: CACHE_HEADER });
  } catch {
    const stale = getCached<StationEnvelope>(cacheKey);
    if (stale) {
      return NextResponse.json(wrapStale(stale), { headers: CACHE_HEADER });
    }
    return NextResponse.json({ error: "Failed to fetch envelope data" }, { status: 500, headers: NO_CACHE_HEADER });
  }
}
