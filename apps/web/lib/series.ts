import type { StationCurrentConditions, StationSeasonData } from "@snotel/core/types";

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor || 0;
}

export function seriesChange(values: (number | null)[], days: number, digits = 1): number | null {
  const latest = values.length - 1;
  if (latest < days) return null;
  const now = values[latest];
  const then = values[latest - days];
  if (now === null || then === null) return null;
  return roundTo(now - then, digits);
}

export function conditionsFromSeason({ station, current, season }: StationSeasonData, temp = current.temp): StationCurrentConditions {
  const swe = season.map((d) => d.swe);
  const depth = season.map((d) => d.snowDepth);
  return {
    ...station,
    swe: current.swe,
    sweNormal: current.sweNormal,
    pctOfNormal: current.pctOfNormal,
    snowDepth: current.snowDepth,
    temp,
    precipAccum: current.precipAccum,
    sweChange1d: seriesChange(swe, 1),
    sweChange3d: seriesChange(swe, 3),
    sweChange7d: seriesChange(swe, 7),
    depthChange1d: seriesChange(depth, 1, 0),
    depthChange3d: seriesChange(depth, 3, 0),
    depthChange7d: seriesChange(depth, 7, 0),
    lastUpdated: current.lastUpdated ?? season[0].date,
  };
}
