import type { StationCurrentConditions } from "./types";
import { hasLiveReadings } from "./stations";

export interface StationFilters {
  states: Iterable<string>;
  elevMin: number | null;
  elevMax: number | null;
  activeOnly: boolean;
}

export function filterStations(
  stations: StationCurrentConditions[],
  { states, elevMin, elevMax, activeOnly }: StationFilters,
  conditionsLoaded = true,
): StationCurrentConditions[] {
  const stateSet = new Set(states);
  return stations.filter((s) => {
    if (stateSet.size > 0 && !stateSet.has(s.state)) return false;
    if (elevMin !== null && s.elevation < elevMin) return false;
    if (elevMax !== null && s.elevation > elevMax) return false;
    if (activeOnly && (conditionsLoaded ? s.swe === null : !hasLiveReadings(s))) return false;
    return true;
  });
}
