import type { HourlyObservation, StationCurrentConditions } from "./types";
import { formatHourlyTime, formatReadingEndOfDay } from "./formatting";

const FRESH_SNOW_INCHES = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

export const RECENT_REFRESH_MS = 60 * 60 * 1000;

export interface RecentDepth {
  depth: number;
  depthAt: string;
  change24h: number | null;
}

export interface RecentConditions {
  asOf: string | null;
  stations: Record<string, RecentDepth>;
}

function usesRecentReading(metric: string): boolean {
  return metric === "SNWD" || metric === "SNWD_CHANGE_1D";
}

export function dataAsOfLabel(metric: string, stations: StationCurrentConditions[], recent: RecentConditions | null): string | null {
  if (usesRecentReading(metric) && recent?.asOf) return `As of ${formatHourlyTime(recent.asOf)}`;
  const latest = stations.reduce((max, s) => (s.lastUpdated > max ? s.lastUpdated : max), "");
  return latest ? formatReadingEndOfDay(latest) : null;
}

function toTime(datetime: string): number {
  return Date.parse(datetime.replace(" ", "T") + ":00Z");
}

export function latestDepth(observations: Pick<HourlyObservation, "datetime" | "snowDepth">[]): RecentDepth | null {
  const readings = observations.filter((o): o is { datetime: string; snowDepth: number } => o.snowDepth !== null);
  const latest = readings.at(-1);
  if (!latest) return null;
  const dayAgo = readings.find((o) => toTime(o.datetime) === toTime(latest.datetime) - DAY_MS);
  return {
    depth: latest.snowDepth,
    depthAt: latest.datetime,
    change24h: dayAgo ? Math.round(latest.snowDepth - dayAgo.snowDepth) : null,
  };
}

export function stationDepth(recent: RecentDepth | null | undefined, hourly: HourlyObservation[] | null | undefined): RecentDepth | null {
  const own = hourly ? latestDepth(hourly) : null;
  if (!recent) return own;
  return own && own.depthAt > recent.depthAt ? own : recent;
}

export function applyRecentDepth(s: StationCurrentConditions, r: RecentDepth | null | undefined): StationCurrentConditions {
  return r ? { ...s, snowDepth: r.depth, depthChange1d: r.change24h, depthAt: r.depthAt } : s;
}

export function withRecentDepth(stations: StationCurrentConditions[], recent: RecentConditions | null): StationCurrentConditions[] {
  if (!recent) return stations;
  return stations.map((s) => applyRecentDepth(s, recent.stations[s.triplet]));
}

export function hasFreshSnow(s: StationCurrentConditions): boolean {
  return (s.depthChange1d ?? 0) >= FRESH_SNOW_INCHES;
}
