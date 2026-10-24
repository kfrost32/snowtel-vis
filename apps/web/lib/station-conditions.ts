import { getAllStations } from "@snotel/core/stations";
import { fetchElementData, fetchMedianData } from "./snotel-api";
import type { StationCurrentConditions } from "@snotel/core/types";

const LOOKBACK_DAYS = 8;
const DATA_TIMEZONE = "America/Denver";
const BULK_TIMEOUT_MS = 90000;

export function todayInDataTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DATA_TIMEZONE }).format(new Date());
}

function shiftDate(dateStr: string, days: number): string {
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
  const [, month, day] = endDate.split("-").map(Number);

  const [wteqData, snwdData, precData, tobsData, medianData] = await Promise.all([
    fetchElementData(snotelTriplets, "WTEQ", beginDate, endDate, { strict: true, timeout: BULK_TIMEOUT_MS }),
    fetchElementData(snotelTriplets, "SNWD", beginDate, endDate, { timeout: BULK_TIMEOUT_MS }),
    fetchElementData(snotelTriplets, "PREC", beginDate, endDate, { timeout: BULK_TIMEOUT_MS }),
    fetchElementData(snotelTriplets, "TOBS", beginDate, endDate, { timeout: BULK_TIMEOUT_MS }),
    fetchMedianData(snotelTriplets, "WTEQ", month, day, month, day, { strict: true, timeout: BULK_TIMEOUT_MS }),
  ]);

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

    const wteq = wteqData.get(station.triplet)?.values ?? [];
    const snwd = snwdData.get(station.triplet)?.values ?? [];
    const prec = precData.get(station.triplet)?.values ?? [];
    const tobs = tobsData.get(station.triplet)?.values ?? [];
    const sweNormal = medianData.get(station.triplet)?.[0] ?? null;

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
      lastUpdated: endDate,
    };
  });
}
