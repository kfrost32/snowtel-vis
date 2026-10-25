import { getAllStations } from "@snotel/core/stations";
import { latestDepth, type RecentConditions, type RecentDepth } from "@snotel/core/recent";
import { shiftDate } from "@snotel/core/water-year";
import { fetchHourlyData } from "./snotel-api";
import { todayInDataTimezone } from "./station-conditions";

const BULK_TIMEOUT_MS = 60000;
const BATCH_SIZE = 100;

export async function fetchRecentDepth(): Promise<RecentConditions> {
  const triplets = getAllStations().filter((s) => s.network === "SNOTEL").map((s) => s.triplet);
  const today = todayInDataTimezone();
  const depth = await fetchHourlyData(triplets, ["SNWD"], shiftDate(today, -1), shiftDate(today, 1), {
    timeout: BULK_TIMEOUT_MS,
    batchSize: BATCH_SIZE,
  });

  const stations: Record<string, RecentDepth> = {};
  let asOf: string | null = null;
  for (const [triplet, { SNWD }] of depth) {
    const recent = SNWD && latestDepth(SNWD.map((v) => ({ datetime: v.datetime, snowDepth: v.value })));
    if (!recent) continue;
    stations[triplet] = recent;
    if (!asOf || recent.depthAt > asOf) asOf = recent.depthAt;
  }
  return { asOf, stations };
}
