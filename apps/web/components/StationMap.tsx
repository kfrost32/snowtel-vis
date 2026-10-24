"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StationCurrentConditions } from "@snotel/core/types";
import { getMapMarkerColor, getMetricMapColor } from "@snotel/core/colors";
import { computePolygonCentroid } from "@snotel/core/basins";
import { formatSwe, formatSnowDepth, formatTemp, formatPrecip, formatDepthChange } from "@snotel/core/formatting";
import { urlTriplet } from "@snotel/core/stations";
import { prefetchStation } from "@/lib/prefetch";
import { theme } from "@snotel/core/theme";
import { SPOT_COLORS, SPOT_KIND_LABELS, spotElevationLabel, type Spot, type SpotKind } from "@snotel/core/spots";
import huc2Boundaries from "@snotel/core/data/huc2-boundaries.json";
import huc4Boundaries from "@snotel/core/data/huc4-boundaries.json";

export interface BasinMarker {
  huc: string;
  name: string;
  latitude: number;
  longitude: number;
  medianPctOfNormal: number | null;
  stationCount: number;
}

interface StationMapProps {
  stations: StationCurrentConditions[];
  onVisibleStationsChange?: (triplets: Set<string>) => void;
  flyTo?: { lng: number; lat: number; triplet: string } | null;
  huc2Markers?: BasinMarker[];
  huc4Markers?: BasinMarker[];
  showStations?: boolean;
  showHuc2?: boolean;
  showHuc4?: boolean;
  metric?: string;
  onStationSelect?: (triplet: string) => void;
  onBasinSelect?: (huc: string) => void;
  spots?: Spot[];
  showSpots?: boolean;
}

const SPOT_GLYPHS: Record<SpotKind, string[]> = {
  resort: ["m2 9 20-5", "M12 12V6.5", "M9 12v5", "M15 12v5", "M4 17h16", "M7 12h10a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z"],
  backcountry: ["m8 3 4 8 5-5 5 15H2L8 3z"],
};

const NUDGE_RADIUS_DEG = 0.03;
const NUDGE_PX = 30;
const LABEL_EMS = 1.3;
const TEXT_SIZE = 11;

function spotPlacement(spot: Spot, stations: StationCurrentConditions[]) {
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
    textOffset: [iconOffset[0] / TEXT_SIZE + dir[0] * LABEL_EMS, iconOffset[1] / TEXT_SIZE + dir[1] * LABEL_EMS],
  };
}

function spotIcon(kind: SpotKind): ImageData {
  const size = 44;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
  ctx.stroke();
  ctx.strokeStyle = SPOT_COLORS[kind];
  const glyph = 24;
  const scale = 22 / glyph;
  ctx.translate((size - glyph * scale) / 2, (size - glyph * scale) / 2);
  ctx.scale(scale, scale);
  ctx.lineWidth = 2.25;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of SPOT_GLYPHS[kind]) ctx.stroke(new Path2D(d));
  return ctx.getImageData(0, 0, size, size);
}

function noComparisonReason(s: StationCurrentConditions): string | null {
  if (s.network === "Snow Course") return "Monthly manual reading";
  if (s.swe === null) return "Not reporting";
  if (s.sweNormal === null) return "No median yet";
  if (s.sweNormal === 0) return "Median is 0\" today";
  return null;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function StationMapInner({
  stations,
  onVisibleStationsChange,
  flyTo,
  huc2Markers,
  huc4Markers,
  showStations = true,
  showHuc2 = false,
  showHuc4 = false,
  metric = "WTEQ",
  onStationSelect,
  onBasinSelect,
  spots = [],
  showSpots = true,
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredTripletRef = useRef<string | null>(null);
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const [mapLoaded, setMapLoaded] = useState(false);

  const updateVisibleStations = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !onVisibleStationsChange) return;
    try {
      if (!map.getLayer("station-circles")) return;
      const features = map.queryRenderedFeatures(undefined, { layers: ["station-circles"] });
      const triplets = new Set<string>();
      for (const f of features) {
        if (f.properties?.triplet) triplets.add(f.properties.triplet);
      }
      onVisibleStationsChange(triplets);
    } catch {
      // map layer may not be ready yet
    }
  }, [onVisibleStationsChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [-110, 44],
      zoom: 4,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: '<a href="https://openskimap.org" target="_blank" rel="noopener">OpenSkiMap</a>' }),
      "bottom-right"
    );
    mapRef.current = map;

    map.on("load", () => {
      // ── Terrain hillshade ──────────────────────────────────────────────
      map.addSource("terrain-dem", {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 15,
      });
      map.addLayer({
        id: "hillshade",
        type: "hillshade",
        source: "terrain-dem",
        paint: {
          "hillshade-exaggeration": 0.3,
          "hillshade-shadow-color": "#5a5a5a",
          "hillshade-highlight-color": "#ffffff",
          "hillshade-accent-color": "#4a4a4a",
        },
      });

      // ── HUC-4: colored fill + thin outline ────────────────────────────
      map.addSource("huc4-polygons", {
        type: "geojson",
        data: { type: "FeatureCollection" as const, features: [] },
      });
      map.addLayer({
        id: "huc4-fill",
        type: "fill",
        source: "huc4-polygons",
        paint: {
          "fill-color": ["coalesce", ["get", "fillColor"], theme.mediumGray],
          "fill-opacity": 0.35,
        },
        layout: { visibility: "none" },
      });
      map.addLayer({
        id: "huc4-outline",
        type: "line",
        source: "huc4-polygons",
        paint: {
          "line-color": ["coalesce", ["get", "fillColor"], theme.mediumGray],
          "line-width": 1,
          "line-opacity": 0.5,
        },
        layout: { visibility: "none" },
      });
      map.addSource("huc4-labels", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // ── HUC-2: bold outline only + large bold labels ───────────────────
      map.addSource("huc2-polygons", {
        type: "geojson",
        data: { type: "FeatureCollection" as const, features: [] },
      });
      map.addLayer({
        id: "huc2-fill",
        type: "fill",
        source: "huc2-polygons",
        paint: {
          "fill-color": ["coalesce", ["get", "fillColor"], theme.mediumGray],
          "fill-opacity": 0.35,
        },
        layout: { visibility: "none" },
      });
      map.addLayer({
        id: "huc2-outline",
        type: "line",
        source: "huc2-polygons",
        paint: {
          "line-color": ["coalesce", ["get", "fillColor"], theme.mediumGray],
          "line-width": 2.5,
          "line-opacity": 0.75,
        },
        layout: { visibility: "none" },
      });
      map.addSource("huc2-labels", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // ── Stations: always on top ────────────────────────────────────────
      map.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "station-circles",
        type: "circle",
        source: "stations",
        layout: {
          "circle-sort-key": ["get", "sortKey"],
        },
        paint: {
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
        },
      });
      map.addLayer({
        id: "station-labels",
        type: "symbol",
        source: "stations",
        minzoom: 6,
        layout: {
          "text-field": ["get", "label"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 8, 6, 9, 10, 12],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          "symbol-sort-key": ["get", "sortKey"],
        },
        paint: {
          "text-color": theme.white,
          "text-halo-color": "rgba(0,0,0,0.5)",
          "text-halo-width": 1,
        },
      });

      // ── Ski areas & backcountry spots ──────────────────────────────────
      map.addImage("spot-resort", spotIcon("resort"), { pixelRatio: 2 });
      map.addImage("spot-backcountry", spotIcon("backcountry"), { pixelRatio: 2 });
      map.addSource("spots", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "spot-icons",
        type: "symbol",
        source: "spots",
        minzoom: 7.5,
        layout: {
          "icon-image": ["concat", "spot-", ["get", "kind"]],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 7.5, 0.7, 12, 1],
          "icon-allow-overlap": true,
          "icon-offset": ["get", "iconOffset"],
          "text-field": ["step", ["zoom"], "", 10, ["get", "name"]],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": TEXT_SIZE,
          "text-anchor": ["get", "textAnchor"],
          "text-offset": ["get", "textOffset"],
          "text-optional": true,
        },
        paint: {
          "text-color": ["get", "color"],
          "text-halo-color": "rgba(255,255,255,0.95)",
          "text-halo-width": 1.5,
        },
      });

      // Basin labels — added last so they render above station dots
      map.addLayer({
        id: "huc4-label-text",
        type: "symbol",
        source: "huc4-labels",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 13,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": false,
          "text-padding": 6,
          visibility: "none",
        },
        paint: {
          "text-color": ["get", "textColor"],
          "text-halo-color": "rgba(255,255,255,0.95)",
          "text-halo-width": 2,
        },
      });
      map.addLayer({
        id: "huc2-label-text",
        type: "symbol",
        source: "huc2-labels",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 15,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": false,
          "text-padding": 8,
          visibility: "none",
        },
        paint: {
          "text-color": ["get", "textColor"],
          "text-halo-color": "rgba(255,255,255,0.95)",
          "text-halo-width": 2.5,
        },
      });

      // ── Interactions ───────────────────────────────────────────────────
      const clearHover = () => {
        hoveredTripletRef.current = null;
        hoverPopupRef.current?.remove();
      };
      const showHoverLabel = (key: string, feature: maplibregl.MapGeoJSONFeature) => {
        if (hoverPopupRef.current?.isOpen() && hoveredTripletRef.current === key) return;
        hoveredTripletRef.current = key;
        const props = feature.properties!;
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
        const html = `<div style="white-space: nowrap; line-height: 1.3;">
          <div style="font-family: var(--font-dm-sans), sans-serif; font-size: 11px; font-weight: 600; color: ${theme.black};">${escapeHtml(props.name as string)}</div>
          <div style="font-family: var(--font-ibm-plex-mono), monospace; font-size: 10px; color: ${theme.gray};">${escapeHtml(props.hoverDetail as string)}</div>
        </div>`;
        if (!hoverPopupRef.current) {
          hoverPopupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 4, className: "station-hover-popup" });
        }
        hoverPopupRef.current.setLngLat([lng, lat]).setHTML(html).addTo(map);
      };
      map.on("click", (e) => {
        if (!map.queryRenderedFeatures(e.point, { layers: ["spot-icons"] }).length) clearHover();
      });

      const basinClickHandler = (layerId: string) => (e: maplibregl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
        if (!features.length) return;
        const props = features[0].properties!;
        if (onBasinSelectRef.current && props.hucId) {
          onBasinSelectRef.current(props.hucId as string);
        }
      };

      map.on("click", "huc4-fill", basinClickHandler("huc4-fill"));
      map.on("click", "huc2-fill", basinClickHandler("huc2-fill"));
      map.on("mouseenter", "huc4-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "huc4-fill", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "huc2-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "huc2-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "station-circles", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["station-circles"] });
        if (!features.length) return;
        const props = features[0].properties!;
        if (onStationSelectRef.current && props.triplet) {
          onStationSelectRef.current(props.triplet as string);
        }
      });
      map.on("mouseenter", "station-circles", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const features = map.queryRenderedFeatures(e.point, { layers: ["station-circles"] });
        if (features.length && features[0].properties?.triplet) {
          prefetchStation(features[0].properties.triplet as string);
        }
      });
      map.on("mousemove", "station-circles", (e) => {
        const feature = e.features?.[0];
        if (feature) showHoverLabel(feature.properties!.triplet as string, feature);
        else clearHover();
      });
      map.on("mouseleave", "station-circles", () => {
        map.getCanvas().style.cursor = "";
        clearHover();
      });

      const showSpotLabel = (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (feature) showHoverLabel(`spot:${feature.properties!.id}`, feature);
      };
      map.on("mousemove", "spot-icons", showSpotLabel);
      map.on("click", "spot-icons", showSpotLabel);
      map.on("mouseleave", "spot-icons", clearHover);

      map.on("moveend", updateVisibleStations);
      map.on("zoomend", updateVisibleStations);
      updateVisibleStations();
      setMapLoaded(true);
    });

    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Map init runs once on mount; all mutable values accessed via refs
  }, []);

  const metricRef = useRef(metric);
  metricRef.current = metric;
  const onStationSelectRef = useRef(onStationSelect);
  onStationSelectRef.current = onStationSelect;
  const onBasinSelectRef = useRef(onBasinSelect);
  onBasinSelectRef.current = onBasinSelect;

  function metricDotLabel(m: string, s: StationCurrentConditions): string {
    const fmtChange = (v: number | null) => v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}"`;
    switch (m) {
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

  function hoverDetail(m: string, s: StationCurrentConditions): string {
    const elevation = `${s.elevation.toLocaleString()} ft`;
    if (m !== "WTEQ" && m !== "WTEQ_PCT") return `${metricDotLabel(m, s) || "—"} · ${elevation}`;
    const reason = noComparisonReason(s);
    if (reason) return `${reason} · ${elevation}`;
    return `${Math.round(s.pctOfNormal!)}% · ${s.swe!.toFixed(1)}" SWE · ${elevation}`;
  }

  function formatMetricValue(m: string, val: number | null): string {
    switch (m) {
      case "SNWD": return formatSnowDepth(val);
      case "PREC": return formatPrecip(val);
      case "TAVG": return formatTemp(val);
      default: return formatSwe(val);
    }
  }

  function metricLabel(m: string): string {
    switch (m) {
      case "SNWD": return "Snow Depth";
      case "PREC": return "Precip";
      case "TAVG": return "Temp";
      default: return "SWE";
    }
  }


// Update station data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const source = map.getSource("stations") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const isSweMetric = metric === "WTEQ" || metric === "WTEQ_PCT";
    source.setData({
      type: "FeatureCollection",
      features: stations.filter((s) => s.latitude && s.longitude).map((s) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [s.longitude, s.latitude] },
        properties: {
          triplet: s.triplet, name: s.name, state: s.state, elevation: s.elevation,
          swe: s.swe, snowDepth: s.snowDepth, precipAccum: s.precipAccum, temp: s.temp,
          pctOfNormal: s.pctOfNormal, sweChange1d: s.sweChange1d, sweChange3d: s.sweChange3d, sweChange7d: s.sweChange7d, depthChange1d: s.depthChange1d, depthChange3d: s.depthChange3d, depthChange7d: s.depthChange7d,
          color: getMetricMapColor(metric, s),
          inactive: isSweMetric && s.swe === null,
          hoverDetail: hoverDetail(metric, s),
          hollow: isSweMetric && s.pctOfNormal === null,
          label: isSweMetric && s.pctOfNormal === null ? "" : metricDotLabel(metric, s),
          sortKey: s.latitude,
        },
      })),
    });
    map.once("render", updateVisibleStations);
  }, [stations, mapLoaded, metric, updateVisibleStations]);

  // Update spot data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const source = map.getSource("spots") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: spots.map((spot) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [spot.longitude, spot.latitude] },
        properties: {
          ...spotPlacement(spot, stations),
          id: spot.id,
          kind: spot.kind,
          name: spot.name,
          color: SPOT_COLORS[spot.kind],
          hoverDetail: [SPOT_KIND_LABELS[spot.kind], spotElevationLabel(spot)].filter(Boolean).join(" · "),
        },
      })),
    });
  }, [spots, stations, mapLoaded]);

  // fly-to
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 11, duration: 1500 });
  }, [flyTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update HUC-4 layer data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const polySource = map.getSource("huc4-polygons") as maplibregl.GeoJSONSource | undefined;
    const labelSource = map.getSource("huc4-labels") as maplibregl.GeoJSONSource | undefined;
    if (!polySource || !labelSource) return;

    const markerMap = new Map((huc4Markers || []).map((b) => [b.huc, b]));
    polySource.setData({
      type: "FeatureCollection",
      features: (huc4Boundaries as GeoJSON.FeatureCollection).features.map((f) => {
        const huc = f.properties?.huc4;
        const marker = markerMap.get(huc);
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
    });
    const huc4CentroidMap = new Map<string, { latitude: number; longitude: number }>();
    for (const f of (huc4Boundaries as GeoJSON.FeatureCollection).features) {
      const huc = f.properties?.huc4;
      const centroid = computePolygonCentroid(f.geometry);
      if (huc && centroid) huc4CentroidMap.set(huc, centroid);
    }
    labelSource.setData({
      type: "FeatureCollection",
      features: (huc4Markers || []).filter((b) => b.medianPctOfNormal !== null).map((b) => {
        const centroid = huc4CentroidMap.get(b.huc) ?? { latitude: b.latitude, longitude: b.longitude };
        const color = getMapMarkerColor(b.medianPctOfNormal);
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [centroid.longitude, centroid.latitude] },
          properties: { label: `${Math.round(b.medianPctOfNormal!)}%`, textColor: color },
        };
      }),
    });
  }, [huc4Markers, mapLoaded]);

  // Update HUC-2 layer data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const polySource = map.getSource("huc2-polygons") as maplibregl.GeoJSONSource | undefined;
    const labelSource = map.getSource("huc2-labels") as maplibregl.GeoJSONSource | undefined;
    if (!polySource || !labelSource) return;

    const markerMap = new Map((huc2Markers || []).map((b) => [b.huc, b]));
    polySource.setData({
      type: "FeatureCollection",
      features: (huc2Boundaries as GeoJSON.FeatureCollection).features.map((f) => {
        const huc = f.properties?.huc2;
        const marker = markerMap.get(huc);
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
    });
    const huc2CentroidMap = new Map<string, { latitude: number; longitude: number }>();
    for (const f of (huc2Boundaries as GeoJSON.FeatureCollection).features) {
      const huc = f.properties?.huc2;
      const centroid = computePolygonCentroid(f.geometry);
      if (huc && centroid) huc2CentroidMap.set(huc, centroid);
    }
    labelSource.setData({
      type: "FeatureCollection",
      features: (huc2Markers || []).filter((b) => b.medianPctOfNormal !== null).map((b) => {
        const centroid = huc2CentroidMap.get(b.huc) ?? { latitude: b.latitude, longitude: b.longitude };
        const color = getMapMarkerColor(b.medianPctOfNormal);
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [centroid.longitude, centroid.latitude] },
          properties: { label: `${b.name}\n${Math.round(b.medianPctOfNormal!)}%`, textColor: color },
        };
      }),
    });
  }, [huc2Markers, mapLoaded]);

  // Layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const vis = (v: boolean) => (v ? "visible" : "none");
    if (map.getLayer("station-circles")) map.setLayoutProperty("station-circles", "visibility", vis(showStations));
    if (map.getLayer("station-labels")) map.setLayoutProperty("station-labels", "visibility", vis(showStations));
    if (map.getLayer("huc4-fill")) map.setLayoutProperty("huc4-fill", "visibility", vis(showHuc4));
    if (map.getLayer("huc4-outline")) map.setLayoutProperty("huc4-outline", "visibility", vis(showHuc4));
    if (map.getLayer("huc4-label-text")) map.setLayoutProperty("huc4-label-text", "visibility", vis(showHuc4));
    if (map.getLayer("huc2-fill")) map.setLayoutProperty("huc2-fill", "visibility", vis(showHuc2));
    if (map.getLayer("huc2-outline")) map.setLayoutProperty("huc2-outline", "visibility", vis(showHuc2));
    if (map.getLayer("huc2-label-text")) map.setLayoutProperty("huc2-label-text", "visibility", vis(showHuc2));
    if (map.getLayer("spot-icons")) map.setLayoutProperty("spot-icons", "visibility", vis(showSpots));
  }, [showStations, showHuc2, showHuc4, showSpots, mapLoaded]);

  return <div ref={containerRef} className="w-full h-full" />;
}

export default StationMapInner;
