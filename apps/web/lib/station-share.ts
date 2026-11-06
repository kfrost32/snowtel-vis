import type { Metadata } from "next";
import { getStation, networkLabel, stationPath, stationTitle } from "@snotel/core/stations";
import { applyRecentDepth, type RecentConditions } from "@snotel/core/recent";
import { lastStorm, type StormSummary } from "@snotel/core/storm";
import { formatElevation, formatPctOfNormal, formatReadingEndOfDay, formatSnowDepth, formatSwe } from "@snotel/core/formatting";
import { STATE_NAMES } from "@snotel/core/constants";
import type { HourlyObservation, Station, StationCurrentConditions } from "@snotel/core/types";
import { median } from "@snotel/core/basins";
import { peekSnapshot } from "./snapshot-cache";
import { snapshotKeys } from "./snapshot-store";

export interface StationShare {
  station: Station;
  conditions: StationCurrentConditions | null;
  storm: StormSummary | null;
}

export async function stationShare(triplet: string): Promise<StationShare | null> {
  const station = getStation(triplet);
  if (!station) return null;
  const [list, recent, hourly] = await Promise.all([
    peekSnapshot<StationCurrentConditions[]>(snapshotKeys.stations),
    peekSnapshot<RecentConditions>(snapshotKeys.recent),
    peekSnapshot<HourlyObservation[]>(snapshotKeys.hourly(triplet)),
  ]);
  const base = list?.data.find((s) => s.triplet === triplet) ?? null;
  return {
    station,
    conditions: base && applyRecentDepth(base, recent?.data.stations[triplet]),
    storm: hourly ? lastStorm(hourly.data) : null,
  };
}

export async function stationConditions(): Promise<Map<string, StationCurrentConditions>> {
  const [list, recent] = await Promise.all([
    peekSnapshot<StationCurrentConditions[]>(snapshotKeys.stations),
    peekSnapshot<RecentConditions>(snapshotKeys.recent),
  ]);
  return new Map((list?.data ?? []).map((s) => [s.triplet, applyRecentDepth(s, recent?.data.stations[s.triplet])]));
}

export function typicalPctOfNormal(stations: Station[], conditions: Map<string, StationCurrentConditions>): number | null {
  const values = stations.flatMap((s) => conditions.get(s.triplet)?.pctOfNormal ?? []);
  return values.length > 0 ? median(values) : null;
}

export function stationPlace(station: Station): string {
  return `${STATE_NAMES[station.state] ?? station.state} · ${formatElevation(station.elevation)}`;
}

export function stationSummary({ station, conditions, storm }: StationShare): string {
  const place = `${station.name} (${networkLabel(station)}, ${formatElevation(station.elevation)}) in ${STATE_NAMES[station.state] ?? station.state}`;
  const depth = conditions?.snowDepth ?? null;
  const change = conditions?.depthChange1d ?? null;
  const swe = conditions?.swe ?? null;
  const pct = conditions?.pctOfNormal ?? null;
  if (depth === null && swe === null) return `${place} has no current snow readings.`;

  const depthText = depth === null ? null : depth === 0 ? "no snow on the ground" : `${formatSnowDepth(depth)} of snow on the ground`;
  const changeText = depth !== null && change ? `, ${change > 0 ? "up" : "down"} ${formatSnowDepth(Math.abs(change))} in 24 hours,` : "";
  const sweText = swe === null ? null : `${formatSwe(swe)} of snow water equivalent${pct === null ? "" : ` (${formatPctOfNormal(pct)} of median)`}`;
  const readings = depthText && sweText ? `${depthText}${changeText} and ${sweText}` : `${depthText ?? ""}${depthText ? changeText.replace(/,$/, "") : ""}${sweText ?? ""}`;
  const asOf = conditions?.lastUpdated ? ` as of ${formatReadingEndOfDay(conditions.lastUpdated)}` : "";
  const stormText = storm ? ` The latest storm added ${formatSnowDepth(storm.newSnow)}.` : "";
  return `${place} has ${readings}${asOf}.${stormText}`;
}

export async function stationMetadata(triplet: string): Promise<Metadata> {
  const share = await stationShare(triplet);
  if (!share) return {};
  const title = `${stationTitle(share.station)}: snow depth & SWE · snotel.fyi`;
  const description = stationSummary(share);
  const url = stationPath(triplet);
  const images = [`${url}/opengraph-image`];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", url, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
