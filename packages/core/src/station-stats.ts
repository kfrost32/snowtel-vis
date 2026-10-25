import type { DailyObservation, StationEnvelope, StationSeasonData, WaterYearSummary } from "./types";
import { expandEnvelope, percentileRank, type BasinEnvelopeFile, type StationEnvelopeFile, type YearsFile } from "./envelope-files";
import { buildSeasonMap } from "./season";
import { calendarRow, calendarRowToWyDay, getCurrentWaterYear, getWaterYearDay } from "./water-year";

export function toStationEnvelope(file: StationEnvelopeFile, wy = getCurrentWaterYear()): StationEnvelope {
  return {
    envelope: expandEnvelope(file.swe, wy),
    medianPeakDay: calendarRowToWyDay(file.swe.peakDay, wy),
    medianPeakRow: file.swe.peakDay,
    medianPeakSwe: file.swe.peak,
    depthEnvelope: expandEnvelope(file.depth, wy),
    medianPeakDepthDay: calendarRowToWyDay(file.depth.peakDay, wy),
    medianPeakDepth: file.depth.peak,
  };
}

export interface EnvelopeStats {
  asOf: string;
  currentSwe: number | null;
  medianAtDay: number | null;
  pctOfNormal: number | null;
  pctOfMedianPeak: number | null;
  daysUntilPeak: number;
  percentile: number | null;
}

export function toBasinEnvelope(file: BasinEnvelopeFile, wy = getCurrentWaterYear()): StationEnvelope {
  return {
    envelope: expandEnvelope(file.swe, wy),
    medianPeakDay: calendarRowToWyDay(file.swe.peakDay, wy),
    medianPeakRow: file.swe.peakDay,
    medianPeakSwe: file.swe.peak,
    depthEnvelope: [],
    medianPeakDepthDay: 0,
    medianPeakDepth: 0,
  };
}

export function basinSeasonMap(points: { wyDay: number; swe: number }[]): Map<number, number> {
  return new Map(points.map((p) => [p.wyDay, p.swe]));
}

export function statsAt(
  asOf: string,
  currentSwe: number | null,
  pctOfNormal: number | null,
  envelope: StationEnvelope,
  yearsFile: YearsFile | null,
): EnvelopeStats {
  return {
    asOf,
    currentSwe,
    medianAtDay: envelope.envelope.find((d) => d.wyDay === getWaterYearDay(asOf))?.median ?? null,
    pctOfNormal,
    pctOfMedianPeak: currentSwe !== null && envelope.medianPeakSwe
      ? Math.round((currentSwe / envelope.medianPeakSwe) * 100)
      : null,
    daysUntilPeak: envelope.medianPeakRow - calendarRow(asOf),
    percentile: yearsFile && currentSwe !== null ? percentileRank(yearsFile, asOf, currentSwe) : null,
  };
}

export function envelopeStats(
  season: StationSeasonData | null,
  envelope: StationEnvelope | null,
  yearsFile: YearsFile | null,
): EnvelopeStats | null {
  const asOf = season?.current.lastUpdated;
  if (!envelope || !asOf) return null;
  const currentSwe = buildSeasonMap(season.season).get(getWaterYearDay(asOf)) ?? null;
  return statsAt(asOf, currentSwe, season.current.pctOfNormal, envelope, yearsFile);
}

function change(season: DailyObservation[], field: "swe" | "snowDepth", days: number): number | null {
  const n = season.length - 1;
  if (n < days) return null;
  const now = season[n][field];
  const then = season[n - days][field];
  return now !== null && then !== null ? now - then : null;
}

export const DELTA_DAYS = [1, 3, 7] as const;

export function seasonDeltas(season: DailyObservation[]) {
  return {
    swe: DELTA_DAYS.map((d) => change(season, "swe", d)),
    depth: DELTA_DAYS.map((d) => {
      const v = change(season, "snowDepth", d);
      return v === null ? null : Math.round(v);
    }),
  };
}

export function peakHistory(file: StationEnvelopeFile, season: DailyObservation[], wy = getCurrentWaterYear()): WaterYearSummary[] {
  let current: WaterYearSummary | null = null;
  for (const obs of season) {
    if (obs.swe !== null && obs.swe > (current?.peakSwe ?? 0)) {
      current = { waterYear: wy, peakSwe: obs.swe, peakSweDate: obs.date };
    }
  }
  return current ? [...file.peaks, current] : file.peaks;
}
