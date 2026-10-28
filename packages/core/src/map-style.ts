import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  HillshadeLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "@maplibre/maplibre-gl-style-spec";
import type { BasinSummary, StationCurrentConditions } from "./types";
import { getMapMarkerColor, getMetricMapColor } from "./colors";
import { computeBasinCentroid, computePolygonCentroid } from "./basins";
import { formatChange, formatDepthChange, formatElevation, formatReadingEndOfDay, formatSnowDepth, formatSwe } from "./formatting";
import { formatAxisTemp } from "./units";

const compact = (label: string) => label.replace(" cm", "cm");

function forecastLabel(inches: number | null | undefined): string {
  if (inches == null) return "";
  return compact(inches > 0 ? `+${formatSnowfall(inches)}` : formatSnowfall(0));
}
import { hasFreshSnow } from "./recent";
import { formatSnowfall } from "./forecast";
import { theme } from "./theme";
import { shiftDate } from "./water-year";
import { getAllStations, hasLiveReadings } from "./stations";
import stateBoundaries from "../data/state-boundaries.json";
import { SPOT_COLORS, SPOT_KIND_LABELS, SPOT_TEXT_SIZE, spotElevationLabel, spotPlacement, type Spot, type SpotKind } from "./spots";

export const BASEMAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const INITIAL_CENTER: [number, number] = [-110, 44];
export const INITIAL_ZOOM = 4;

const MAP_DARK_EDGE = "#0F1316";
const MAP_DARK_HALO = "rgba(15,19,22,0.9)";

export function isSweMetric(metric: string): boolean {
  return metric === "WTEQ" || metric === "WTEQ_PCT";
}

export function noComparisonReason(s: StationCurrentConditions): string | null {
  if (s.network === "Snow Course") return "Monthly manual reading";
  if (s.swe === null) return "Not reporting";
  if (s.sweNormal === null) return "No median yet";
  if (s.sweNormal === 0) return "Median is 0\" today";
  return null;
}

export function metricDotLabel(metric: string, s: StationCurrentConditions): string {
  const fmtChange = (v: number | null) => (v === null ? "—" : compact(formatChange(v)));
  switch (metric) {
    case "WTEQ": return s.swe !== null ? compact(formatSwe(s.swe)) : "";
    case "WTEQ_PCT": return s.pctOfNormal !== null ? `${Math.round(s.pctOfNormal)}%` : "";
    case "CHANGE_1D": return fmtChange(s.sweChange1d);
    case "CHANGE_3D": return fmtChange(s.sweChange3d ?? null);
    case "CHANGE_7D": return fmtChange(s.sweChange7d);
    case "SNWD_CHANGE_1D": return compact(formatDepthChange(s.depthChange1d ?? null));
    case "SNWD_CHANGE_3D": return compact(formatDepthChange(s.depthChange3d ?? null));
    case "SNWD_CHANGE_7D": return compact(formatDepthChange(s.depthChange7d ?? null));
    case "SNWD": return s.snowDepth !== null ? compact(formatSnowDepth(s.snowDepth)) : "—";
    case "PREC": return s.precipAccum !== null ? compact(formatSnowDepth(s.precipAccum)) : "";
    case "TAVG": return s.temp !== null ? formatAxisTemp(s.temp) : "";
    case "FORECAST_3D": return forecastLabel(s.forecast3d);
    case "FORECAST_7D": return forecastLabel(s.forecast7d);
    default: return "";
  }
}

export function stationDetail(metric: string, s: StationCurrentConditions): string {
  const elevation = formatElevation(s.elevation);
  if (!isSweMetric(metric)) return `${metricDotLabel(metric, s) || "—"} · ${elevation}`;
  const reason = noComparisonReason(s);
  if (reason) return `${reason} · ${elevation}`;
  return `${Math.round(s.pctOfNormal!)}% · ${formatSwe(s.swe)} SWE · ${elevation}`;
}

function isHollow(metric: string, s: StationCurrentConditions): boolean {
  return isSweMetric(metric) && s.pctOfNormal === null;
}

function isInactive(metric: string, s: StationCurrentConditions): boolean {
  switch (metric) {
    case "WTEQ":
    case "WTEQ_PCT": return s.swe === null;
    case "SNWD": return !s.snowDepth;
    case "SNWD_CHANGE_1D": return !s.depthChange1d;
    case "FORECAST_3D": return s.forecast3d == null;
    case "FORECAST_7D": return s.forecast7d == null;
    default: return false;
  }
}

function reportingCutoff(stations: StationCurrentConditions[]): string {
  const latest = stations.reduce((max, s) => (s.swe !== null && s.lastUpdated > max ? s.lastUpdated : max), "");
  return latest ? shiftDate(latest, -1) : "";
}

export function stationFeatures(stations: StationCurrentConditions[], metric: string): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const cutoff = reportingCutoff(stations);
  return {
    type: "FeatureCollection",
    features: stations.filter((s) => s.latitude && s.longitude).map((s) => {
      const outdated = hasLiveReadings(s) && s.swe !== null && s.lastUpdated < cutoff;
      const inactive = outdated || isInactive(metric, s);
      const hollow = isHollow(metric, s);
      const fresh = hasFreshSnow(s);
      const detail = outdated ? `${stationDetail(metric, s)} · ${formatReadingEndOfDay(s.lastUpdated)}` : stationDetail(metric, s);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
        properties: {
          triplet: s.triplet,
          name: s.name,
          color: getMetricMapColor(metric, s),
          inactive,
          hollow,
          label: hollow ? "" : metricDotLabel(metric, s),
          hoverDetail: fresh ? `${detail} · ${formatDepthChange(s.depthChange1d ?? null)} in 24h` : detail,
          fresh,
          sortKey: s.latitude,
        },
      };
    }),
  };
}

export const stationCircleLayout: CircleLayerSpecification["layout"] = {
  "circle-sort-key": ["get", "sortKey"],
};

export const stationCirclePaint: CircleLayerSpecification["paint"] = {
  "circle-color": ["case", ["get", "inactive"], theme.mediumGray, ["get", "hollow"], "rgba(0,0,0,0)", ["get", "color"]],
  "circle-radius": [
    "interpolate", ["linear"], ["zoom"],
    3, ["case", ["get", "inactive"], 1.75, ["get", "hollow"], 2.5, 5],
    5, ["case", ["get", "inactive"], 2.5, ["get", "hollow"], 3.5, 8],
    7, ["case", ["get", "inactive"], 4, ["get", "hollow"], 5, 14],
    10, ["case", ["get", "inactive"], 5.5, ["get", "hollow"], 7, 20],
  ],
  "circle-stroke-width": [
    "interpolate", ["linear"], ["zoom"],
    3, ["case", ["get", "inactive"], 0, ["get", "hollow"], 1, ["get", "fresh"], 1.25, 0.5],
    7, ["case", ["get", "inactive"], 0, ["get", "hollow"], 1.5, ["get", "fresh"], 3, 1],
  ],
  "circle-stroke-color": ["case", ["get", "hollow"], theme.mediumGray, theme.white],
  "circle-opacity": ["case", ["get", "inactive"], 0.6, 1],
};

export const stationCirclePaintDark: CircleLayerSpecification["paint"] = {
  ...stationCirclePaint,
  "circle-stroke-color": ["case", ["get", "hollow"], theme.mediumGray, MAP_DARK_EDGE],
};

export const SPOT_MINZOOM = 7.5;

export function spotImageId(kind: SpotKind): string {
  return `spot-${kind}`;
}

export function spotFeatures(spots: Spot[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const stations = getAllStations();
  return {
    type: "FeatureCollection",
    features: spots.map((spot) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [spot.longitude, spot.latitude] },
      properties: {
        ...spotPlacement(spot, stations),
        id: spot.id,
        kind: spot.kind,
        icon: spotImageId(spot.kind),
        name: spot.name,
        color: SPOT_COLORS[spot.kind],
        hoverDetail: [SPOT_KIND_LABELS[spot.kind], spotElevationLabel(spot)].filter(Boolean).join(" · "),
      },
    })),
  };
}

export const spotLayout: SymbolLayerSpecification["layout"] = {
  "icon-image": ["get", "icon"],
  "icon-size": ["interpolate", ["linear"], ["zoom"], SPOT_MINZOOM, 0.7, 12, 1],
  "icon-allow-overlap": true,
  "icon-offset": ["get", "iconOffset"],
  "text-field": ["step", ["zoom"], "", 10, ["get", "name"]],
  "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
  "text-size": SPOT_TEXT_SIZE,
  "text-anchor": ["get", "textAnchor"],
  "text-offset": ["get", "textOffset"],
  "text-optional": true,
};

export const spotPaint: SymbolLayerSpecification["paint"] = {
  "text-color": ["get", "color"],
  "text-halo-color": "rgba(255,255,255,0.95)",
  "text-halo-width": 1.5,
};

export const spotPaintDark: SymbolLayerSpecification["paint"] = {
  "text-color": ["match", ["get", "kind"], "backcountry", "#5EC4B6", "#B4C1C7"],
  "text-halo-color": MAP_DARK_HALO,
  "text-halo-width": 1.5,
};

export const selectedStationGlowPaint: CircleLayerSpecification["paint"] = {
  "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 16, 5, 22, 7, 34, 10, 46],
  "circle-color": theme.white,
  "circle-opacity": 0.9,
  "circle-blur": 1,
};

export const selectedStationPaint: CircleLayerSpecification["paint"] = {
  "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 6, 5, 9.5, 7, 16, 10, 23],
  "circle-color": ["get", "color"],
  "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 7, 3],
  "circle-stroke-color": theme.white,
};

export const selectedStationGlowPaintDark: CircleLayerSpecification["paint"] = {
  ...selectedStationGlowPaint,
  "circle-opacity": 0.22,
};

export const selectedStationPaintDark: CircleLayerSpecification["paint"] = {
  ...selectedStationPaint,
  "circle-stroke-color": "#D3DCE0",
};



export function selectedStationFilter(triplet: string | null): ["==", ["get", "triplet"], string] {
  return ["==", ["get", "triplet"], triplet ?? ""];
}

export const STATION_LABEL_MINZOOM = 6;

export const stationLabelLayout: SymbolLayerSpecification["layout"] = {
  "text-field": ["get", "label"],
  "text-size": ["interpolate", ["linear"], ["zoom"], 5, 8, 6, 9, 10, 12],
  "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
  "text-allow-overlap": false,
  "text-ignore-placement": false,
  "symbol-sort-key": ["get", "sortKey"],
};

export const stationLabelPaint: SymbolLayerSpecification["paint"] = {
  "text-color": theme.white,
  "text-halo-color": "rgba(0,0,0,0.5)",
  "text-halo-width": 1,
};

export const selectedStationValuePaint = stationLabelPaint;

export const selectedStationValueLayout: SymbolLayerSpecification["layout"] = {
  ...stationLabelLayout,
  "text-allow-overlap": true,
  "text-ignore-placement": true,
};

export const BASEMAP_STYLE_URL_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export const TERRAIN_TILES = ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"];
export const TERRAIN_MAXZOOM = 15;

export const hillshadePaint: HillshadeLayerSpecification["paint"] = {
  "hillshade-exaggeration": 0.3,
  "hillshade-shadow-color": "#5a5a5a",
  "hillshade-highlight-color": "#ffffff",
  "hillshade-accent-color": "#4a4a4a",
};

export const hillshadePaintDark: HillshadeLayerSpecification["paint"] = {
  "hillshade-exaggeration": 0.25,
  "hillshade-shadow-color": "#000000",
  "hillshade-highlight-color": "rgba(255, 255, 255, 0.12)",
  "hillshade-accent-color": "#000000",
};

export const WESTERN_US_BOUNDS: [number, number, number, number] = [-124.5, 32, -104, 49];

export type RegionLevel = 2 | 4;

export interface RegionMarker {
  huc: string;
  name: string;
  latitude: number;
  longitude: number;
  medianPctOfNormal: number | null;
  stationCount: number;
}

export function regionMarkers(basins: BasinSummary[]): RegionMarker[] {
  return basins.map((b) => {
    const centroid = computeBasinCentroid(b.stations);
    return {
      huc: b.huc,
      name: b.name,
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      medianPctOfNormal: b.medianPctOfNormal,
      stationCount: b.stationCount,
    };
  });
}

function hucKey(level: RegionLevel) {
  return level === 2 ? "huc2" : "huc4";
}

export function regionPolygons(boundaries: GeoJSON.FeatureCollection, markers: RegionMarker[], level: RegionLevel): GeoJSON.FeatureCollection {
  const byHuc = new Map(markers.map((m) => [m.huc, m]));
  return {
    type: "FeatureCollection",
    features: boundaries.features.map((f) => {
      const huc = f.properties?.[hucKey(level)];
      const marker = byHuc.get(huc);
      return {
        ...f,
        properties: {
          ...f.properties,
          hucId: huc,
          fillColor: marker ? getMapMarkerColor(marker.medianPctOfNormal) : theme.borderGray,
          medianPctOfNormal: marker?.medianPctOfNormal ?? null,
          stationCount: marker?.stationCount ?? 0,
          name: marker?.name ?? f.properties?.name ?? "",
        },
      };
    }),
  };
}

export function regionLabels(boundaries: GeoJSON.FeatureCollection, markers: RegionMarker[], level: RegionLevel): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const centroids = new Map<string, { latitude: number; longitude: number }>();
  for (const f of boundaries.features) {
    const huc = f.properties?.[hucKey(level)];
    const centroid = computePolygonCentroid(f.geometry);
    if (huc && centroid) centroids.set(huc, centroid);
  }
  return {
    type: "FeatureCollection",
    features: markers.filter((m) => m.medianPctOfNormal !== null).map((m) => {
      const c = centroids.get(m.huc) ?? { latitude: m.latitude, longitude: m.longitude };
      const pct = `${Math.round(m.medianPctOfNormal!)}%`;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [c.longitude, c.latitude] },
        properties: { hucId: m.huc, label: level === 2 ? `${m.name}\n${pct}` : pct, textColor: getMapMarkerColor(m.medianPctOfNormal) },
      };
    }),
  };
}

export const regionFillPaint: FillLayerSpecification["paint"] = {
  "fill-color": ["coalesce", ["get", "fillColor"], theme.mediumGray],
  "fill-opacity": 0.35,
};

export const regionFillPaintDark: FillLayerSpecification["paint"] = {
  "fill-color": ["coalesce", ["get", "fillColor"], theme.mediumGray],
  "fill-opacity": 0.16,
};

export const regionOutlinePaint: Record<RegionLevel, LineLayerSpecification["paint"]> = {
  2: { "line-color": ["coalesce", ["get", "fillColor"], theme.mediumGray], "line-width": 2.5, "line-opacity": 0.75 },
  4: { "line-color": ["coalesce", ["get", "fillColor"], theme.mediumGray], "line-width": 1, "line-opacity": 0.5 },
};

export const regionLabelLayout: Record<RegionLevel, SymbolLayerSpecification["layout"]> = {
  2: { "text-field": ["get", "label"], "text-size": 15, "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"], "text-allow-overlap": false, "text-padding": 8 },
  4: { "text-field": ["get", "label"], "text-size": 13, "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"], "text-allow-overlap": false, "text-padding": 6 },
};

export const regionLabelPaint: Record<RegionLevel, SymbolLayerSpecification["paint"]> = {
  2: { "text-color": ["get", "textColor"], "text-halo-color": "rgba(255,255,255,0.95)", "text-halo-width": 2.5 },
  4: { "text-color": ["get", "textColor"], "text-halo-color": "rgba(255,255,255,0.95)", "text-halo-width": 2 },
};

export const regionLabelPaintDark: Record<RegionLevel, SymbolLayerSpecification["paint"]> = {
  2: { ...regionLabelPaint[2], "text-halo-color": MAP_DARK_HALO },
  4: { ...regionLabelPaint[4], "text-halo-color": MAP_DARK_HALO },
};

const STATES = stateBoundaries as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, { state: string }>;
const WORLD_RING: GeoJSON.Position[] = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];

function selectedStateFeatures(states: Iterable<string>) {
  const selected = new Set(states);
  return STATES.features.filter((f) => selected.has(f.properties.state));
}

function exteriorRings(feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>): GeoJSON.Position[][] {
  return feature.geometry.type === "Polygon" ? [feature.geometry.coordinates[0]] : feature.geometry.coordinates.map((polygon) => polygon[0]);
}

function signedArea(ring: GeoJSON.Position[]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return area / 2;
}

function clockwise(ring: GeoJSON.Position[]): GeoJSON.Position[] {
  return signedArea(ring) < 0 ? ring : [...ring].reverse();
}

export function stateOutlines(states: Iterable<string>): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: selectedStateFeatures(states) };
}

export function stateMask(states: Iterable<string>): GeoJSON.FeatureCollection {
  const holes = selectedStateFeatures(states).flatMap(exteriorRings).map(clockwise);
  if (!holes.length) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [WORLD_RING, ...holes] } }],
  };
}

export function stateBounds(states: Iterable<string>): [number, number, number, number] | null {
  const points = selectedStateFeatures(states).flatMap(exteriorRings).flat();
  if (!points.length) return null;
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

export const stateMaskPaint: FillLayerSpecification["paint"] = {
  "fill-color": theme.white,
  "fill-opacity": 0.7,
};

export const stateMaskPaintDark: FillLayerSpecification["paint"] = {
  "fill-color": "#0B0F12",
  "fill-opacity": 0.65,
};

export const stateOutlinePaint: LineLayerSpecification["paint"] = {
  "line-color": theme.darkGray,
  "line-width": 1.5,
  "line-opacity": 0.8,
};
