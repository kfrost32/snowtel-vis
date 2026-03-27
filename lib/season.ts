import { getWaterYearDay } from "@/lib/water-year";
import type { DailyObservation } from "@/lib/types";

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
