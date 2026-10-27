import { getWaterYearDay } from "./water-year";
import type { DailyObservation, StationSeasonData } from "./types";

export function buildSeasonMap(
  season: DailyObservation[],
  field: (d: DailyObservation) => number | null = (d) => d.swe,
): Map<number, number> {
  const m = new Map<number, number>();
  for (const d of season) {
    const val = field(d);
    if (val !== null) m.set(getWaterYearDay(d.date), val);
  }
  return m;
}

export function seasonCurrent(season: DailyObservation[]): StationSeasonData["current"] {
  const latest = season.at(-1);
  const swe = latest?.swe ?? null;
  const median = latest?.sweMedian ?? null;
  return {
    swe,
    sweNormal: median,
    pctOfNormal: swe !== null && median !== null && median > 0 ? Math.round((swe / median) * 100) : null,
    snowDepth: latest?.snowDepth ?? null,
    temp: latest?.tavg ?? null,
    precipAccum: latest?.precip ?? null,
    lastUpdated: latest?.date ?? null,
  };
}
