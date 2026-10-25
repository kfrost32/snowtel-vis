import { getAllStations } from "@snotel/core/stations";
import { fetchDailyData } from "./snotel-api";
import type { StationCurrentConditions } from "@snotel/core/types";

const LOOKBACK_DAYS = 8;
const DATA_TIMEZONE = "America/Denver";
const BULK_TIMEOUT_MS = 90000;
const BATCH_SIZE = 50;
const CARRY_OVER_DAYS = 14;

export function todayInDataTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DATA_TIMEZONE }).format(new Date());
}

export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function change(values: (number | null)[], days: number, digits = 1): number | null {
  const latest = values.length - 1;
  if (latest < days) return null;
  const now = values[latest];
  const then = values[latest - days];
  if (now === null || then === null) return null;
  const factor = 10 ** digits;
  return Math.round((now - then) * factor) / factor;
}

export async function fetchStationConditions(): Promise<StationCurrentConditions[]> {
  const stations = getAllStations();
  const snotelTriplets = stations.filter((s) => s.network === "SNOTEL").map((s) => s.triplet);

  const endDate = todayInDataTimezone();
  const beginDate = shiftDate(endDate, -LOOKBACK_DAYS);
  const data = await fetchDailyData(snotelTriplets, ["WTEQ", "SNWD", "PREC", "TOBS"], beginDate, endDate, {
    timeout: BULK_TIMEOUT_MS,
    batchSize: BATCH_SIZE,
    median: true,
  });

  return stations.map((station): StationCurrentConditions => {
    if (station.network !== "SNOTEL") {
      return {
        ...station,
        swe: null, sweNormal: null, pctOfNormal: null, snowDepth: null, temp: null, precipAccum: null,
        sweChange1d: null, sweChange3d: null, sweChange7d: null,
        depthChange1d: null, depthChange3d: null, depthChange7d: null,
        lastUpdated: endDate,
      };
    }

    const series = data.get(station.triplet) ?? {};
    const wteq = series.WTEQ?.values ?? [];
    const snwd = series.SNWD?.values ?? [];
    const prec = series.PREC?.values ?? [];
    const tobs = series.TOBS?.values ?? [];
    const sweNormal = series.WTEQ?.medians.at(-1) ?? null;

    const swe = wteq.at(-1) ?? null;
    const pctOfNormal = swe !== null && sweNormal !== null && sweNormal > 0
      ? Math.round((swe / sweNormal) * 100)
      : null;

    return {
      ...station,
      swe,
      sweNormal,
      pctOfNormal,
      snowDepth: snwd.at(-1) ?? null,
      temp: tobs.at(-1) ?? null,
      precipAccum: prec.at(-1) ?? null,
      sweChange1d: change(wteq, 1),
      sweChange3d: change(wteq, 3),
      sweChange7d: change(wteq, 7),
      depthChange1d: change(snwd, 1, 0),
      depthChange3d: change(snwd, 3, 0),
      depthChange7d: change(snwd, 7, 0),
      lastUpdated: series.WTEQ?.dates.at(-1) ?? endDate,
    };
  });
}

export function mergeConditions(
  fresh: StationCurrentConditions[],
  previous: StationCurrentConditions[] | null
): StationCurrentConditions[] {
  if (!previous) return fresh;
  const cutoff = shiftDate(todayInDataTimezone(), -CARRY_OVER_DAYS);
  const before = new Map(previous.map((s) => [s.triplet, s]));
  return fresh.map((s) => {
    const old = before.get(s.triplet);
    if (!old || old.swe === null || old.lastUpdated < cutoff) return s;
    return s.swe === null || old.lastUpdated > s.lastUpdated ? old : s;
  });
}
