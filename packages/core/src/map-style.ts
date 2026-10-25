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
import { formatDepthChange } from "./formatting";
import { hasFreshSnow } from "./recent";
import { snowColors, theme } from "./theme";

export const BASEMAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const INITIAL_CENTER: [number, number] = [-110, 44];
export const INITIAL_ZOOM = 4;

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
  const fmtChange = (v: number | null) => v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}"`;
  switch (metric) {
    case "WTEQ": return s.swe !== null ? `${s.swe.toFixed(1)}"` : "";
    case "WTEQ_PCT": return s.pctOfNormal !== null ? `${Math.round(s.pctOfNormal)}%` : "";
    case "CHANGE_1D": return fmtChange(s.sweChange1d);
    case "CHANGE_3D": return fmtChange(s.sweChange3d ?? null);
    case "CHANGE_7D": return fmtChange(s.sweChange7d);
    case "SNWD_CHANGE_1D": return formatDepthChange(s.depthChange1d ?? null);
    case "SNWD_CHANGE_3D": return formatDepthChange(s.depthChange3d ?? null);
    case "SNWD_CHANGE_7D": return formatDepthChange(s.depthChange7d ?? null);
    case "SNWD": return s.snowDepth !== null ? `${Math.round(s.snowDepth)}"` : "—";
    case "PREC": return s.precipAccum !== null ? `${Math.round(s.precipAccum)}"` : "";
    case "TAVG": return s.temp !== null ? `${Math.round(s.temp)}°` : "";
    default: return "";
  }
}

export function stationDetail(metric: string, s: StationCurrentConditions): string {
  const elevation = `${s.elevation.toLocaleString()} ft`;
  if (!isSweMetric(metric)) return `${metricDotLabel(metric, s) || "—"} · ${elevation}`;
  const reason = noComparisonReason(s);
  if (reason) return `${reason} · ${elevation}`;
  return `${Math.round(s.pctOfNormal!)}% · ${s.swe!.toFixed(1)}" SWE · ${elevation}`;
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
    default: return false;
  }
}

export function stationFeatures(stations: StationCurrentConditions[], metric: string): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: stations.filter((s) => s.latitude && s.longitude).map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
      properties: {
        triplet: s.triplet,
        name: s.name,
        color: getMetricMapColor(metric, s),
        inactive: isInactive(metric, s),
        hollow: isHollow(metric, s),
        label: isHollow(metric, s) ? "" : metricDotLabel(metric, s),
        hoverDetail: stationDetail(metric, s),
        fresh: metric !== "SNWD_CHANGE_1D" && hasFreshSnow(s) && !isHollow(metric, s) && !isInactive(metric, s),
        sortKey: s.latitude,
      },
    })),
  };
}

export const stationCircleLayout: CircleLayerSpecification["layout"] = {
  "circle-sort-key": ["get", "sortKey"],
};

export const stationCirclePaint: CircleLayerSpecification["paint"] = {
  "circle-color": ["case", ["get", "inactive"], theme.mediumGray, ["get", "hollow"], "rgba(0,0,0,0)", ["get", "color"]],
  "circle-radius": [
    "interpolate", ["linear"], ["zoom"],
    3, ["case", ["get", "inactive"], 1, ["get", "hollow"], 2.5, 5],
    5, ["case", ["get", "inactive"], 1.5, ["get", "hollow"], 3.5, 8],
    7, ["case", ["get", "inactive"], 2.5, ["get", "hollow"], 5, 14],
    10, ["case", ["get", "inactive"], 3.5, ["get", "hollow"], 7, 20],
  ],
  "circle-stroke-width": [
    "interpolate", ["linear"], ["zoom"],
    3, ["case", ["get", "inactive"], 0, 1],
    7, ["case", ["get", "inactive"], 0, ["get", "hollow"], 1.5, 2.5],
  ],
  "circle-stroke-color": ["case", ["get", "hollow"], theme.mediumGray, theme.white],
  "circle-opacity": ["case", ["get", "inactive"], 0.35, 1],
};

export const freshSnowFilter: CircleLayerSpecification["filter"] = ["==", ["get", "fresh"], true];

export const freshSnowPaint: CircleLayerSpecification["paint"] = {
  "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 8, 5, 12, 7, 19, 10, 26],
  "circle-color": "rgba(0,0,0,0)",
  "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 7, 3],
  "circle-stroke-color": snowColors.freshSnow,
};

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

export const BASEMAP_STYLE_URL_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export const TERRAIN_TILES = ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"];
export const TERRAIN_MAXZOOM = 15;

export const hillshadePaint: HillshadeLayerSpecification["paint"] = {
  "hillshade-exaggeration": 0.3,
  "hillshade-shadow-color": "#5a5a5a",
  "hillshade-highlight-color": "#ffffff",
  "hillshade-accent-color": "#4a4a4a",
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
