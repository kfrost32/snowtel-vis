import skiAreas from "../data/ski-areas.json";
import backcountryAreas from "../data/backcountry-areas.json";

export type SpotKind = "resort" | "backcountry";

export interface Spot {
  id: string;
  kind: SpotKind;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
  baseElevation: number | null;
  summitElevation: number | null;
  runs: number | null;
  website: string | null;
}

const spots: Spot[] = [
  ...skiAreas.map((a) => ({
    ...a,
    kind: "resort" as const,
    elevation: null,
  })),
  ...backcountryAreas.map((a) => ({
    ...a,
    kind: "backcountry" as const,
    baseElevation: null,
    summitElevation: null,
    runs: null,
    website: null,
  })),
];

export function getAllSpots(): Spot[] {
  return spots;
}

export const SPOT_COLORS: Record<SpotKind, string> = {
  resort: "#5A6B73",
  backcountry: "#0F766E",
};

export const SPOT_KIND_LABELS: Record<SpotKind, string> = {
  resort: "Ski area",
  backcountry: "Backcountry",
};

export function spotElevationLabel(spot: Spot): string | null {
  if (spot.baseElevation !== null && spot.summitElevation !== null) {
    return `${spot.baseElevation.toLocaleString()}–${spot.summitElevation.toLocaleString()}′`;
  }
  return spot.elevation !== null ? `${spot.elevation.toLocaleString()}′` : null;
}
