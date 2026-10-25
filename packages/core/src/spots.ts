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

const SPOT_GLYPHS: Record<SpotKind, string[]> = {
  resort: ["m2 9 20-5", "M12 12V6.5", "M9 12v5", "M15 12v5", "M4 17h16", "M7 12h10a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z"],
  backcountry: ["m8 3 4 8 5-5 5 15H2L8 3z"],
};

export const SPOT_KINDS = Object.keys(SPOT_GLYPHS) as SpotKind[];
export const SPOT_ICON_SIZE = 22;
const GLYPH_BOX = 24;

export function spotIconSvg(kind: SpotKind, scale = 1): string {
  const size = SPOT_ICON_SIZE;
  const glyphScale = size / 2 / GLYPH_BOX;
  const inset = (size - GLYPH_BOX * glyphScale) / 2;
  const paths = SPOT_GLYPHS[kind].map((d) => `<path d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * scale}" height="${size * scale}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="rgba(255,255,255,0.92)" stroke="rgba(15,23,42,0.18)" stroke-width="0.75"/><g transform="translate(${inset} ${inset}) scale(${glyphScale})" fill="none" stroke="${SPOT_COLORS[kind]}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}

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
