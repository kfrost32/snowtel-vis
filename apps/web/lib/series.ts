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

export function accumulationChanges(values: (number | null)[], dates: string[]) {
  let end = values.length;
  while (end > 0 && values[end - 1] === null) end--;
  const last = dates[end - 1] ?? "";
  const resetDate = `${Number(last.slice(0, 4)) - (last.slice(5, 10) > "10-01" ? 0 : 1)}-10-01`;
  const season = values.slice(0, end).filter((_, i) => (dates[i] ?? "") > resetDate);
  return {
    precipChange1d: seriesChange(season, 1),
    precipChange3d: seriesChange(season, 3),
    precipChange7d: seriesChange(season, 7),
  };
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
    ...accumulationChanges(season.map((d) => d.precip), season.map((d) => d.date)),
    lastUpdated: current.lastUpdated ?? season[0].date,
  };
}
