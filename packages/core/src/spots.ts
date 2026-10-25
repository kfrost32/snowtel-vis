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

const NUDGE_RADIUS_DEG = 0.03;
const NUDGE_PX = 30;
const LABEL_EMS = 1.3;
export const SPOT_TEXT_SIZE = 11;

export function spotPlacement(spot: Spot, stations: { latitude: number; longitude: number }[]) {
  const cosLat = Math.cos((spot.latitude * Math.PI) / 180);
  let dx = 0, dy = 0, nearest = Infinity;
  for (const s of stations) {
    const sx = (spot.longitude - s.longitude) * cosLat;
    const sy = spot.latitude - s.latitude;
    const d = Math.hypot(sx, sy);
    if (d < nearest) { nearest = d; dx = sx; dy = sy; }
  }
  if (nearest > NUDGE_RADIUS_DEG) {
    return { iconOffset: [0, 0], textAnchor: "top", textOffset: [0, LABEL_EMS] };
  }
  const [ux, uy] = nearest === 0 ? [0, 1] : [dx / nearest, dy / nearest];
  const iconOffset = [ux * NUDGE_PX, -uy * NUDGE_PX];
  const [anchor, dir] = Math.abs(uy) >= Math.abs(ux)
    ? uy > 0 ? ["bottom", [0, -1]] : ["top", [0, 1]]
    : ux > 0 ? ["left", [1, 0]] : ["right", [-1, 0]];
  return {
    iconOffset,
    textAnchor: anchor,
    textOffset: [iconOffset[0] / SPOT_TEXT_SIZE + dir[0] * LABEL_EMS, iconOffset[1] / SPOT_TEXT_SIZE + dir[1] * LABEL_EMS],
  };
}
