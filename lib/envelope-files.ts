import type { EnvelopeDay } from "./types";

export interface EnvelopeSeries {
  median: (number | null)[];
  max: (number | null)[];
  min: (number | null)[];
  maxYear: (number | null)[];
  minYear: (number | null)[];
  peakDay: number;
  peak: number;
}

export interface StationEnvelopeFile {
  generated: string;
  lastWaterYear: number;
  swe: EnvelopeSeries;
  depth: EnvelopeSeries;
}

export interface BasinEnvelopeFile {
  generated: string;
  lastWaterYear: number;
  stationCount: number;
  swe: EnvelopeSeries;
}

export function expandEnvelope(series: EnvelopeSeries): EnvelopeDay[] {
  return series.median.map((median, i) => ({
    wyDay: i + 1,
    median,
    max: series.max[i],
    min: series.min[i],
    maxYear: series.maxYear[i],
    minYear: series.minYear[i],
  }));
}
