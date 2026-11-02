import stateBoundaries from "../data/state-boundaries.json";
import huc4Boundaries from "../data/huc4-boundaries.json";
import { STATE_NAMES } from "./constants";
import { HUC4_NAMES } from "./huc-names";

export interface MapView {
  center: [lng: number, lat: number];
  bounds: [[west: number, south: number], [east: number, north: number]];
  zoom: number;
}

type Position = GeoJSON.Position;
type Feature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, Record<string, string>>;

const BASIN_MIN_ZOOM = 6;
const MAX_LISTED_STATES = 3;
const SAMPLES_PER_SIDE = 7;

function inRing([x, y]: Position, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inShape(point: Position, shape: Feature["geometry"]): boolean {
  const polygons = shape.type === "Polygon" ? [shape.coordinates] : shape.coordinates;
  return polygons.some((rings) => rings.reduce((inside, ring) => (inRing(point, ring) ? !inside : inside), false));
}

const states = (stateBoundaries as GeoJSON.FeatureCollection).features as Feature[];
const basins = (huc4Boundaries as GeoJSON.FeatureCollection).features as Feature[];

function statesInView({ bounds: [[west, south], [east, north]] }: MapView): string[] {
  const found = new Set<string>();
  for (let i = 0; i < SAMPLES_PER_SIDE; i++) {
    for (let j = 0; j < SAMPLES_PER_SIDE; j++) {
      const point: Position = [
        west + ((east - west) * (i + 0.5)) / SAMPLES_PER_SIDE,
        south + ((north - south) * (j + 0.5)) / SAMPLES_PER_SIDE,
      ];
      const state = states.find((f) => inShape(point, f.geometry));
      if (state?.properties) found.add(state.properties.state);
    }
  }
  return [...found].sort();
}

function basinAt(center: Position): string | null {
  const basin = basins.find((f) => inShape(center, f.geometry));
  if (!basin?.properties) return null;
  return HUC4_NAMES[basin.properties.huc4] ?? basin.properties.name ?? null;
}

function listNames(codes: string[]): string {
  const names = codes.map((code) => STATE_NAMES[code] ?? code);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : names[0];
}

export function placeLabel(view: MapView, selectedStates: string[] = []): string | null {
  if (selectedStates.length) return selectedStates.length > MAX_LISTED_STATES ? "Western US" : listNames([...selectedStates].sort());
  const inView = statesInView(view);
  if (view.zoom >= BASIN_MIN_ZOOM) {
    const basin = basinAt(view.center);
    if (basin) return inView.length ? `${basin} basin · ${inView.join(", ")}` : `${basin} basin`;
  }
  if (!inView.length) return null;
  return inView.length > MAX_LISTED_STATES ? "Western US" : listNames(inView);
}
