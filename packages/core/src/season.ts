import { getWaterYearDay } from "./water-year";
import type { DailyObservation, Station, StationSeasonData } from "./types";

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

const RECENT_FALLBACK_DAYS = 2;

function recent(season: DailyObservation[], field: (d: DailyObservation) => number | null): number | null {
  return season.slice(-RECENT_FALLBACK_DAYS).map(field).findLast((v) => v !== null) ?? null;
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
    temp: recent(season, (d) => d.tavg),
    precipAccum: recent(season, (d) => d.precip),
    lastUpdated: latest?.date ?? null,
  };
}

export function reportedSeason(station: Station, season: DailyObservation[]): StationSeasonData {
  let end = season.length;
  while (end > 1 && season[end - 1].swe === null && season[end - 1].snowDepth === null) end--;
  const reported = season.slice(0, end);
  return { station, current: seasonCurrent(reported), season: reported };
}
