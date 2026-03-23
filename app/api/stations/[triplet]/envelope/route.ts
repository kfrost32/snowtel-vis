import { NextResponse } from "next/server";
import { getStation, parseTripletFromUrl } from "@/lib/stations";
import { buildStationHistoricalUrl, parseCsvResponse, parseNumericValue } from "@/lib/snotel-csv";
import { getCurrentWaterYear } from "@/lib/water-year";

interface EnvelopeDay {
  wyDay: number;
  min: number | null;
  max: number | null;
  median: number | null;
  p10: number | null;
  p90: number | null;
}

interface YearTrace {
  waterYear: number;
  data: { wyDay: number; swe: number }[];
}

interface EnvelopeResponse {
  envelope: EnvelopeDay[];
  years: YearTrace[];
  currentYear: number;
}

const envelopeCache = new Map<string, { data: EnvelopeResponse; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

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

  const cached = envelopeCache.get(triplet);
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

    const currentWY = getCurrentWaterYear();
    const yearData = new Map<number, Map<number, number>>();

    for (const row of rows) {
      const dateStr = row[dateKey];
      if (!dateStr) continue;
      const swe = sweKey ? parseNumericValue(row[sweKey]) : null;
      if (swe === null) continue;

      const date = new Date(dateStr + "T00:00:00");
      const month = date.getMonth();
      const waterYear = month >= 9 ? date.getFullYear() + 1 : date.getFullYear();

      const oct1 = month >= 9
        ? new Date(date.getFullYear(), 9, 1)
        : new Date(date.getFullYear() - 1, 9, 1);
      const wyDay = Math.floor((date.getTime() - oct1.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (wyDay < 1 || wyDay > 366) continue;

      if (!yearData.has(waterYear)) {
        yearData.set(waterYear, new Map());
      }
      yearData.get(waterYear)!.set(wyDay, swe);
    }

    const completedYears = Array.from(yearData.keys())
      .filter((y) => y < currentWY)
      .sort((a, b) => a - b);

    const envelope: EnvelopeDay[] = [];
    for (let day = 1; day <= 366; day++) {
      const values: number[] = [];
      for (const wy of completedYears) {
        const swe = yearData.get(wy)?.get(day);
        if (swe !== undefined) values.push(swe);
      }

      if (values.length < 3) {
        envelope.push({ wyDay: day, min: null, max: null, median: null, p10: null, p90: null });
        continue;
      }

      values.sort((a, b) => a - b);
      envelope.push({
        wyDay: day,
        min: values[0],
        max: values[values.length - 1],
        median: percentile(values, 50),
        p10: percentile(values, 10),
        p90: percentile(values, 90),
      });
    }

    const recentYears = completedYears.slice(-5);
    const yearTraces: YearTrace[] = [...recentYears, currentWY]
      .filter((wy) => yearData.has(wy))
      .map((wy) => {
        const dayMap = yearData.get(wy)!;
        const data = Array.from(dayMap.entries())
          .map(([wyDay, swe]) => ({ wyDay, swe }))
          .sort((a, b) => a.wyDay - b.wyDay);
        return { waterYear: wy, data };
      });

    const result: EnvelopeResponse = {
      envelope,
      years: yearTraces,
      currentYear: currentWY,
    };

    envelopeCache.set(triplet, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to compute envelope" }, { status: 500 });
  }
}
