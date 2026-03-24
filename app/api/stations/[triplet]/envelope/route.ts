import { NextResponse } from "next/server";
import { getStation, parseTripletFromUrl } from "@/lib/stations";
import { fetchPorData, fetchWaterYearMedian } from "@/lib/snotel-api";
import { getWaterYearDay } from "@/lib/water-year";
import type { EnvelopeDay, StationEnvelope } from "@/lib/types";

const CACHE_HEADER = { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };

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

  try {
    const beginDate = station.beginDate || "1980-01-01";
    const endDate = new Date().toISOString().split("T")[0];

    const [wteq, medianMap] = await Promise.all([
      fetchPorData(triplet, "WTEQ", beginDate, endDate),
      fetchWaterYearMedian([triplet], "WTEQ"),
    ]);

    if (!wteq.dates.length) {
      return NextResponse.json({ envelope: [], medianPeakDay: 0, medianPeakSwe: 0 }, { headers: CACHE_HEADER });
    }

    const medianValues = medianMap.get(triplet) || [];

    const byWyDay = new Map<number, number[]>();
    for (let i = 0; i < wteq.dates.length; i++) {
      const swe = wteq.values[i];
      if (swe === null) continue;
      const wyDay = getWaterYearDay(wteq.dates[i]);
      if (!byWyDay.has(wyDay)) byWyDay.set(wyDay, []);
      byWyDay.get(wyDay)!.push(swe);
    }

    const envelope: EnvelopeDay[] = [];
    let medianPeakDay = 1;
    let medianPeakSwe = 0;

    for (let wyDay = 1; wyDay <= 366; wyDay++) {
      const vals = byWyDay.get(wyDay);
      const medianIdx = wyDay - 1;
      const median = medianIdx < medianValues.length ? medianValues[medianIdx] : null;

      if (median !== null && median > medianPeakSwe) {
        medianPeakSwe = median;
        medianPeakDay = wyDay;
      }

      if (!vals || vals.length === 0) {
        envelope.push({ wyDay, max: null, min: null, median });
        continue;
      }

      let max = vals[0];
      let min = vals[0];
      for (const v of vals) {
        if (v > max) max = v;
        if (v < min) min = v;
      }

      envelope.push({ wyDay, max, min, median });
    }

    const result: StationEnvelope = { envelope, medianPeakDay, medianPeakSwe };
    return NextResponse.json(result, { headers: CACHE_HEADER });
  } catch {
    return NextResponse.json({ error: "Failed to fetch envelope data" }, { status: 500, headers: NO_CACHE_HEADER });
  }
}
