import type { ApiResponse, StationCurrentConditions } from "@snotel/core/types";
import { getAllStations } from "@snotel/core/stations";
import { fetchStationConditions, mergeConditions } from "./station-conditions";
import { getSnapshot } from "./snapshot-cache";
import { snapshotKeys } from "./snapshot-store";

const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const WAIT_FOR_LIVE_MS = 4000;

export function getStationList(): Promise<ApiResponse<StationCurrentConditions[]>> {
  return getSnapshot<StationCurrentConditions[]>({
    key: snapshotKeys.stations,
    maxAge: MAX_AGE_MS,
    waitMs: WAIT_FOR_LIVE_MS,
    load: async (previous) => mergeConditions(await fetchStationConditions(), previous),
    expired: async (snapshot) => snapshot.data.length !== getAllStations().length,
  });
}
