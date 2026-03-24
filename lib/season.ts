import { getWaterYearDay } from "@/lib/water-year";
import type { DailyObservation } from "@/lib/types";

export function buildSeasonMap(season: DailyObservation[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const d of season) {
    if (d.swe !== null) m.set(getWaterYearDay(d.date), d.swe);
  }
  return m;
}
