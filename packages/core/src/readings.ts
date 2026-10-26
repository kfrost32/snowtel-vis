import type { StationCurrentConditions } from "./types";
import { getPlaceholderConditions } from "./stations";

export const READING_FIELDS = [
  "swe",
  "sweNormal",
  "pctOfNormal",
  "snowDepth",
  "temp",
  "precipAccum",
  "sweChange1d",
  "sweChange3d",
  "sweChange7d",
  "depthChange1d",
  "depthChange3d",
  "depthChange7d",
  "lastUpdated",
] as const satisfies readonly (keyof StationCurrentConditions)[];

type ReadingField = (typeof READING_FIELDS)[number];
type ReadingValue = StationCurrentConditions[ReadingField];

export interface StationReadings {
  fields: string[];
  stations: Record<string, ReadingValue[]>;
}

export function packReadings(conditions: StationCurrentConditions[]): StationReadings {
  const stations: Record<string, ReadingValue[]> = {};
  for (const s of conditions) {
    if (s.network === "SNOTEL") stations[s.triplet] = READING_FIELDS.map((field) => s[field]);
  }
  return { fields: [...READING_FIELDS], stations };
}

export function unpackReadings(readings: StationReadings): StationCurrentConditions[] {
  return getPlaceholderConditions().map((station) => {
    const values = readings.stations[station.triplet];
    if (!values) return station;
    const unpacked: Record<string, unknown> = { ...station };
    readings.fields.forEach((field, i) => {
      unpacked[field] = values[i];
    });
    return unpacked as unknown as StationCurrentConditions;
  });
}
