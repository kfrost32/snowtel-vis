import { NextResponse } from "next/server";
import { getAllStations } from "@/lib/stations";
import { fetchPorData, fetchWaterYearMedian } from "@/lib/snotel-api";
import { getWaterYearDay, getCurrentWaterYear } from "@/lib/water-year";
import { getCached, setCache, wrapFresh, wrapStale } from "@/lib/api-cache";
import type { EnvelopeDay, StationEnvelope } from "@/lib/types";

const CACHE_HEADER = { "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=3600" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };

const MAX_STATIONS = 150;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ huc: string }> }
) {
  const { huc } = await params;

  const stations = getAllStations()
    .filter((s) => s.network === "SNOTEL" && s.huc.startsWith(huc))
    .slice(0, MAX_STATIONS);

  if (stations.length === 0) {
    return NextResponse.json({ error: "No stations found for this basin" }, { status: 404, headers: NO_CACHE_HEADER });
  }

  const cacheKey = `basin-envelope:${huc}`;
  try {
    const endDate = new Date().toISOString().split("T")[0];

    const triplets = stations.map((s) => s.triplet);
    const earliestBegin = stations
      .map((s) => s.beginDate || "1980-01-01")
      .sort()[0];

    const BATCH_SIZE = 10;
    const stationResults: { dates: string[]; values: (number | null)[] }[] = [];
    const medianPromise = fetchWaterYearMedian(triplets, "WTEQ");

    for (let i = 0; i < stations.length; i += BATCH_SIZE) {
      const batch = stations.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((s) =>
          fetchPorData(s.triplet, "WTEQ", s.beginDate || "1980-01-01", endDate)
            .catch(() => ({ dates: [] as string[], values: [] as (number | null)[] }))
        )
      );
      stationResults.push(...results);
    }

    const medianMap = await medianPromise;

    const byWyDayYear = new Map<number, Map<number, number[]>>();
    const currentWy = getCurrentWaterYear();
    const currentByWyDay = new Map<number, number[]>();

    for (let si = 0; si < stationResults.length; si++) {
      const { dates, values } = stationResults[si];
      for (let i = 0; i < dates.length; i++) {
        const swe = values[i];
        if (swe === null) continue;
        const dateStr = dates[i];
        const wyDay = getWaterYearDay(dateStr);

        const date = new Date(dateStr + "T12:00:00Z");
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const wy = month >= 10 ? year + 1 : year;

        if (!byWyDayYear.has(wyDay)) byWyDayYear.set(wyDay, new Map());
        const yearMap = byWyDayYear.get(wyDay)!;
        if (!yearMap.has(wy)) yearMap.set(wy, []);
        yearMap.get(wy)!.push(swe);

        if (wy === currentWy) {
          if (!currentByWyDay.has(wyDay)) currentByWyDay.set(wyDay, []);
          currentByWyDay.get(wyDay)!.push(swe);
        }
      }
    }

    const medianByDay = new Map<number, number[]>();
    for (const triplet of triplets) {
      const vals = medianMap.get(triplet) || [];
      for (let d = 0; d < vals.length; d++) {
        const v = vals[d];
        if (v === null) continue;
        const wyDay = d + 1;
        if (!medianByDay.has(wyDay)) medianByDay.set(wyDay, []);
        medianByDay.get(wyDay)!.push(v);
      }
    }

    const envelope: EnvelopeDay[] = [];
    let medianPeakDay = 1;
    let medianPeakSwe = 0;

    for (let wyDay = 1; wyDay <= 366; wyDay++) {
      const yearMap = byWyDayYear.get(wyDay);
      const medianVals = medianByDay.get(wyDay);
      const median = medianVals && medianVals.length > 0
        ? medianVals.reduce((a, b) => a + b, 0) / medianVals.length
        : null;

      if (median !== null && median > medianPeakSwe) {
        medianPeakSwe = median;
        medianPeakDay = wyDay;
      }

      if (!yearMap || yearMap.size === 0) {
        envelope.push({ wyDay, max: null, min: null, median });
        continue;
      }

      const yearAvgs: { avg: number; wy: number }[] = [];
      for (const [wy, vals] of yearMap) {
        if (wy === currentWy) continue;
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (avg < 0.05) continue;
        yearAvgs.push({ avg, wy });
      }

      if (yearAvgs.length === 0) {
        envelope.push({ wyDay, max: null, min: null, median });
        continue;
      }

      let max = yearAvgs[0].avg;
      let min = yearAvgs[0].avg;
      let maxYear = yearAvgs[0].wy;
      let minYear = yearAvgs[0].wy;
      for (const v of yearAvgs) {
        if (v.avg > max) { max = v.avg; maxYear = v.wy; }
        if (v.avg < min) { min = v.avg; minYear = v.wy; }
      }

      envelope.push({ wyDay, max, min, median, maxYear, minYear });
    }

    const currentSeason: { wyDay: number; swe: number }[] = [];
    for (let wyDay = 1; wyDay <= 366; wyDay++) {
      const vals = currentByWyDay.get(wyDay);
      if (vals && vals.length > 0) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        currentSeason.push({ wyDay, swe: Math.round(avg * 10) / 10 });
      }
    }

    const result = {
      envelope,
      medianPeakDay,
      medianPeakSwe: Math.round(medianPeakSwe * 10) / 10,
      currentSeason,
      stationCount: stations.length,
    };

    setCache(cacheKey, result);
    return NextResponse.json(wrapFresh(result), { headers: CACHE_HEADER });
  } catch {
    const stale = getCached<Record<string, unknown>>(cacheKey);
    if (stale) {
      return NextResponse.json(wrapStale(stale), { headers: CACHE_HEADER });
    }
    return NextResponse.json({ error: "Failed to fetch basin envelope data" }, { status: 500, headers: NO_CACHE_HEADER });
  }
}
