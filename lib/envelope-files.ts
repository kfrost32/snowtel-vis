import type { EnvelopeDay, WaterYearSummary } from "./types";
import { calendarRow, getCurrentWaterYear, rowsToWaterYear } from "./water-year";

export interface EnvelopeSeries {
  median: (number | null)[];
  max: (number | null)[];
  min: (number | null)[];
  maxYear: (number | null)[];
  minYear: (number | null)[];
  p10: (number | null)[];
  p30: (number | null)[];
  p70: (number | null)[];
  p90: (number | null)[];
  peakDay: number;
  peak: number;
}

export interface StationEnvelopeFile {
  generated: string;
  lastWaterYear: number;
  peaks: WaterYearSummary[];
  swe: EnvelopeSeries;
  depth: EnvelopeSeries;
}

export interface BasinEnvelopeFile {
  generated: string;
  lastWaterYear: number;
  stationCount: number;
  swe: EnvelopeSeries;
}

export function expandEnvelope(series: EnvelopeSeries, wy = getCurrentWaterYear()): EnvelopeDay[] {
  const rows = rowsToWaterYear(series.median.map((_, i) => i), wy);
  return rows.map((i, day) => ({
    wyDay: day + 1,
    median: series.median[i],
    max: series.max[i],
    min: series.min[i],
    maxYear: series.maxYear[i],
    minYear: series.minYear[i],
    p10: series.p10[i],
    p30: series.p30[i],
    p70: series.p70[i],
    p90: series.p90[i],
  }));
}

export interface YearsFile {
  generated: string;
  years: Record<string, (number | null)[]>;
}

export function percentileRank(file: YearsFile, asOf: string, value: number): number | null {
  const row = calendarRow(asOf) - 1;
  const values = Object.values(file.years)
    .map((arr) => arr[row])
    .filter((v): v is number => v !== null && v !== undefined);
  if (!values.length) return null;
  return Math.round((100 * values.filter((v) => v < value).length) / values.length);
}
