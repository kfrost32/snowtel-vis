import { getAllStations } from "@snotel/core/stations";
import type { RecentConditions, RecentDepth } from "@snotel/core/recent";
import { fetchHourlyData, type HourlyValue } from "./snotel-api";
import { shiftDate, todayInDataTimezone } from "./station-conditions";

const BULK_TIMEOUT_MS = 60000;
const BATCH_SIZE = 100;
const HOUR_MS = 3600000;

function toTime(datetime: string): number {
  return Date.parse(datetime.replace(" ", "T") + ":00Z");
}

function recentDepth(values: HourlyValue[]): RecentDepth | null {
  const readings = values.filter((v): v is { datetime: string; value: number } => v.value !== null);
  const latest = readings.at(-1);
  if (!latest) return null;
  const target = toTime(latest.datetime) - 24 * HOUR_MS;
  const dayAgo = readings.find((v) => toTime(v.datetime) === target);
  return {
    depth: latest.value,
    depthAt: latest.datetime,
    change24h: dayAgo ? Math.round(latest.value - dayAgo.value) : null,
  };
}

export async function fetchRecentDepth(): Promise<RecentConditions> {
  const triplets = getAllStations().filter((s) => s.network === "SNOTEL").map((s) => s.triplet);
  const today = todayInDataTimezone();
  const depth = await fetchHourlyData(triplets, ["SNWD"], shiftDate(today, -1), shiftDate(today, 1), {
    strict: true,
    timeout: BULK_TIMEOUT_MS,
    batchSize: BATCH_SIZE,
  });

  const stations: Record<string, RecentDepth> = {};
  let asOf: string | null = null;
  for (const [triplet, { SNWD }] of depth) {
    const recent = SNWD && recentDepth(SNWD);
    if (!recent) continue;
    stations[triplet] = recent;
    if (!asOf || recent.depthAt > asOf) asOf = recent.depthAt;
  }
  return { asOf, stations };
}
