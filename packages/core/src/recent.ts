import type { StationCurrentConditions } from "./types";
import { formatHourlyTime, formatReadingEndOfDay } from "./formatting";

const FRESH_SNOW_INCHES = 1;

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

export function withRecentDepth(stations: StationCurrentConditions[], recent: RecentConditions | null): StationCurrentConditions[] {
  if (!recent) return stations;
  return stations.map((s) => {
    const r = recent.stations[s.triplet];
    if (!r) return s;
    return { ...s, snowDepth: r.depth, depthChange1d: r.change24h, depthAt: r.depthAt };
  });
}

export function hasFreshSnow(s: StationCurrentConditions): boolean {
  return (s.depthChange1d ?? 0) >= FRESH_SNOW_INCHES;
}
