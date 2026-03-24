import { NextResponse } from "next/server";
import { getAllStations } from "@/lib/stations";
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

const basinEnvelopeCache = new Map<string, { data: EnvelopeResponse; timestamp: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000;
const CACHE_HEADER = { "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=3600" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

async function fetchStationYearData(
  triplet: string
): Promise<{ yearData: Map<number, Map<number, number>>; medianByWyDay: Map<number, number> } | null> {
  try {
    const url = buildStationHistoricalUrl(triplet);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const text = await response.text();
    const { headers, rows } = parseCsvResponse(text);

    const dateKey = headers.find((h) => h.toLowerCase() === "date") || headers[0];
    const sweKey = headers.find(
      (h) => h.includes("Snow Water Equivalent") && !h.includes("Median") && !h.includes("%")
    );
    const medianKey = headers.find((h) => h.includes("Snow Water Equivalent") && h.includes("Median"));

    const yearData = new Map<number, Map<number, number>>();
    const medianByWyDay = new Map<number, number>();

    for (const row of rows) {
      const dateStr = row[dateKey];
      if (!dateStr) continue;

      const date = new Date(dateStr + "T00:00:00");
      const month = date.getMonth();
      const waterYear = month >= 9 ? date.getFullYear() + 1 : date.getFullYear();
      const oct1 =
        month >= 9
          ? new Date(date.getFullYear(), 9, 1)
          : new Date(date.getFullYear() - 1, 9, 1);
      const wyDay = Math.floor((date.getTime() - oct1.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (wyDay < 1 || wyDay > 366) continue;

      const swe = sweKey ? parseNumericValue(row[sweKey]) : null;
      if (swe !== null) {
        if (!yearData.has(waterYear)) yearData.set(waterYear, new Map());
        yearData.get(waterYear)!.set(wyDay, swe);
      }

      if (medianKey && !medianByWyDay.has(wyDay)) {
        const med = parseNumericValue(row[medianKey]);
        if (med !== null) medianByWyDay.set(wyDay, med);
      }
    }

    return { yearData, medianByWyDay };
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ huc: string }> }
) {
  const { huc } = await params;

  const cached = basinEnvelopeCache.get(huc);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, { headers: CACHE_HEADER });
  }

  const hucLevel = huc.length as 2 | 4;
  const stations = getAllStations().filter(
    (s) => s.huc && s.huc.slice(0, hucLevel) === huc
  );

  if (stations.length === 0) {
    return NextResponse.json({ error: "No stations found for this basin" }, { status: 404, headers: NO_CACHE_HEADER });
  }

  const MAX_STATIONS = 30;
  const stationSample =
    stations.length > MAX_STATIONS
      ? stations.slice(0, MAX_STATIONS)
      : stations;

  const allStationData = await Promise.all(
    stationSample.map((s) => fetchStationYearData(s.triplet))
  );

  const validStationData = allStationData.filter(
    (d): d is { yearData: Map<number, Map<number, number>>; medianByWyDay: Map<number, number> } => d !== null
  );

  if (validStationData.length === 0) {
    return NextResponse.json({ error: "Failed to fetch basin data" }, { status: 502, headers: NO_CACHE_HEADER });
  }

  const currentWY = getCurrentWaterYear();

  const allYears = new Set<number>();
  validStationData.forEach(({ yearData }) => {
    yearData.forEach((_, wy) => allYears.add(wy));
  });

  const completedYears = Array.from(allYears)
    .filter((y) => y < currentWY)
    .sort((a, b) => a - b);

  // Average the official 1991-2020 medians across stations
  const basinMedianByWyDay = new Map<number, number>();
  for (let day = 1; day <= 366; day++) {
    const vals: number[] = [];
    for (const { medianByWyDay } of validStationData) {
      const v = medianByWyDay.get(day);
      if (v !== undefined) vals.push(v);
    }
    if (vals.length > 0) basinMedianByWyDay.set(day, vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  const basinYearData = new Map<number, Map<number, number[]>>();
  for (const wy of [...completedYears, currentWY]) {
    const dayMap = new Map<number, number[]>();
    for (const { yearData } of validStationData) {
      const stationDays = yearData.get(wy);
      if (!stationDays) continue;
      stationDays.forEach((swe, wyDay) => {
        if (!dayMap.has(wyDay)) dayMap.set(wyDay, []);
        dayMap.get(wyDay)!.push(swe);
      });
    }
    basinYearData.set(wy, dayMap);
  }

  const basinAvgByYear = new Map<number, Map<number, number>>();
  for (const [wy, dayMap] of basinYearData) {
    const avgMap = new Map<number, number>();
    dayMap.forEach((values, wyDay) => {
      if (values.length > 0) {
        avgMap.set(wyDay, values.reduce((a, b) => a + b, 0) / values.length);
      }
    });
    basinAvgByYear.set(wy, avgMap);
  }

  const envelope: EnvelopeDay[] = [];
  for (let day = 1; day <= 366; day++) {
    const values: number[] = [];
    for (const wy of completedYears) {
      const avg = basinAvgByYear.get(wy)?.get(day);
      if (avg !== undefined) values.push(avg);
    }

    const officialMedian = basinMedianByWyDay.get(day) ?? null;

    if (values.length < 3) {
      envelope.push({ wyDay: day, min: null, max: null, median: officialMedian, p10: null, p90: null });
      continue;
    }

    values.sort((a, b) => a - b);
    envelope.push({
      wyDay: day,
      min: values[0],
      max: values[values.length - 1],
      median: officialMedian ?? percentile(values, 50),
      p10: percentile(values, 10),
      p90: percentile(values, 90),
    });
  }

  const recentYears = completedYears.slice(-5);
  const yearTraces: YearTrace[] = [...recentYears, currentWY]
    .filter((wy) => basinAvgByYear.has(wy))
    .map((wy) => {
      const avgMap = basinAvgByYear.get(wy)!;
      const data = Array.from(avgMap.entries())
        .map(([wyDay, swe]) => ({ wyDay, swe }))
        .sort((a, b) => a.wyDay - b.wyDay);
      return { waterYear: wy, data };
    });

  const result: EnvelopeResponse = {
    envelope,
    years: yearTraces,
    currentYear: currentWY,
  };

  basinEnvelopeCache.set(huc, { data: result, timestamp: Date.now() });
  return NextResponse.json(result, { headers: CACHE_HEADER });
}
