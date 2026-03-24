import type { StationCurrentConditions, BasinSummary } from "./types";
import { HUC2_NAMES, HUC4_NAMES } from "./huc-names";

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function groupStationsByHuc(
  stations: StationCurrentConditions[],
  level: 2 | 4
): Map<string, StationCurrentConditions[]> {
  const groups = new Map<string, StationCurrentConditions[]>();
  for (const s of stations) {
    if (!s.huc) continue;
    const prefix = s.huc.slice(0, level);
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(s);
  }
  return groups;
}

export function computePolygonCentroid(geometry: GeoJSON.Geometry): { latitude: number; longitude: number } | null {
  const rings: number[][][] = [];
  if (geometry.type === "Polygon") {
    rings.push(geometry.coordinates[0] as number[][]);
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates as number[][][][]) {
      rings.push(poly[0]);
    }
  } else {
    return null;
  }

  let totalArea = 0;
  let cx = 0;
  let cy = 0;
  for (const ring of rings) {
    const n = ring.length;
    for (let i = 0; i < n - 1; i++) {
      const x0 = ring[i][0], y0 = ring[i][1];
      const x1 = ring[i + 1][0], y1 = ring[i + 1][1];
      const cross = x0 * y1 - x1 * y0;
      totalArea += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
  }
  if (totalArea === 0) return null;
  totalArea *= 0.5;
  cx /= 6 * totalArea;
  cy /= 6 * totalArea;
  return { latitude: cy, longitude: cx };
}

export function computeBasinCentroid(stations: StationCurrentConditions[]): {
  latitude: number;
  longitude: number;
} {
  let lat = 0;
  let lng = 0;
  for (const s of stations) {
    lat += s.latitude;
    lng += s.longitude;
  }
  return {
    latitude: lat / stations.length,
    longitude: lng / stations.length,
  };
}

export function computeBasinSummaries(
  stations: StationCurrentConditions[],
  level: 2 | 4
): BasinSummary[] {
  const names = level === 2 ? HUC2_NAMES : HUC4_NAMES;
  const groups = groupStationsByHuc(stations, level);

  const summaries: BasinSummary[] = [];
  for (const [huc, stationList] of groups) {
    const usedStations = stationList.filter(
      (s) => s.swe !== null && s.sweNormal !== null
    );
    const sumSwe = usedStations.reduce((a, s) => a + s.swe!, 0);
    const sumNormal = usedStations.reduce((a, s) => a + s.sweNormal!, 0);
    const basinIndex = sumNormal > 0 ? Math.round((sumSwe / sumNormal) * 100) : null;

    const withSwe = stationList.filter((s) => s.swe !== null);
    const sweValues = withSwe.map((s) => s.swe!);

    summaries.push({
      huc,
      name: names[huc] || `HUC ${huc}`,
      region: level === 4 ? (HUC2_NAMES[huc.slice(0, 2)] || "") : "",
      stationCount: stationList.length,
      medianPctOfNormal: basinIndex,
      avgSwe:
        sweValues.length > 0
          ? Math.round((sweValues.reduce((a, b) => a + b, 0) / sweValues.length) * 10) / 10
          : null,
      stations: stationList,
    });
  }

  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}
