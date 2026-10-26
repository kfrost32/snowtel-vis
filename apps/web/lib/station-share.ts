import { getStation } from "@snotel/core/stations";
import { applyRecentDepth, type RecentConditions } from "@snotel/core/recent";
import { lastStorm, SNOW_QUALITY, type StormSummary } from "@snotel/core/storm";
import { formatDepthChange, formatElevation, formatPctOfNormal, formatReadingEndOfDay, formatSnowDepth, formatSwe } from "@snotel/core/formatting";
import { STATE_NAMES } from "@snotel/core/constants";
import type { HourlyObservation, Station, StationCurrentConditions } from "@snotel/core/types";
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

export function stationPlace(station: Station): string {
  return `${STATE_NAMES[station.state] ?? station.state} · ${formatElevation(station.elevation)}`;
}

export function stationShareDescription({ station, conditions, storm }: StationShare): string {
  if (!conditions) return `Snowpack conditions for ${station.name}, ${stationPlace(station)}.`;
  const change = conditions.depthChange1d ?? null;
  return [
    conditions.snowDepth !== null && `${formatSnowDepth(conditions.snowDepth)} of snow`,
    change ? `${formatDepthChange(change)} in 24h` : null,
    conditions.swe !== null && `${formatSwe(conditions.swe)} SWE`,
    conditions.pctOfNormal !== null && `${formatPctOfNormal(conditions.pctOfNormal)} of median`,
    storm && `last storm +${formatSnowDepth(storm.newSnow)}${storm.quality ? ` (${SNOW_QUALITY[storm.quality].label.toLowerCase()})` : ""}`,
    conditions.lastUpdated && formatReadingEndOfDay(conditions.lastUpdated),
  ]
    .filter(Boolean)
    .join(" · ");
}
