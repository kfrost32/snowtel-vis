"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StationCurrentConditions } from "@/lib/types";
import { getMapMarkerColor, getMetricMapColor, getChangeColor } from "@/lib/colors";
import { computePolygonCentroid } from "@/lib/basins";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth, formatTemp, formatPrecip, formatChange, calcDensity, formatDensity, getDensityLabel } from "@/lib/formatting";
import { urlTriplet } from "@/lib/stations";
import { prefetchStation } from "@/lib/prefetch";
import { theme } from "@/lib/theme";
import huc2Boundaries from "@/data/huc2-boundaries.json";
import huc4Boundaries from "@/data/huc4-boundaries.json";

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
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const [mapLoaded, setMapLoaded] = useState(false);

  const updateVisibleStations = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !onVisibleStationsChange) return;
    try {
      if (!map.getLayer("station-circles")) return;
      const features = map.queryRenderedFeatures(undefined as any, { layers: ["station-circles"] });
      const triplets = new Set<string>();
      for (const f of features) {
        if (f.properties?.triplet) triplets.add(f.properties.triplet);
      }
      onVisibleStationsChange(triplets);
    } catch {
      // map may not be ready
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
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    map.on("load", () => {
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
          "fill-opacity": 0.2,
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
          "fill-opacity": 0.08,
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
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 6, 6, 10, 8, 16, 10, 20],
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 6, 1.5, 8, 2],
          "circle-stroke-color": theme.white,
          "circle-opacity": 0.95,
        },
      });
      map.addLayer({
        id: "station-labels",
        type: "symbol",
        source: "stations",
        minzoom: 6,
        layout: {
          "text-field": ["get", "label"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 6, 9, 10, 12],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": theme.white,
          "text-halo-color": "rgba(0,0,0,0.15)",
          "text-halo-width": 0.5,
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
      const basinClickHandler = (layerId: string) => (e: maplibregl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
        if (!features.length) return;
        const props = features[0].properties!;
        if (popupRef.current) popupRef.current.remove();

        const pct = props.medianPctOfNormal !== undefined && props.medianPctOfNormal !== "null"
          ? Number(props.medianPctOfNormal) : null;
        const color = props.fillColor || theme.mediumGray;
        const html = `
          <div style="font-family: var(--font-dm-sans), sans-serif; min-width: 180px;">
            <div style="font-weight: 600; font-size: 13px; color: ${theme.black}; margin-bottom: 4px;">${props.name}</div>
            <div style="font-size: 11px; color: ${theme.mediumGray}; margin-bottom: 8px;">${props.stationCount || ""} stations</div>
            <div>
              <div style="font-size: 10px; color: ${theme.mediumGray}; text-transform: uppercase; letter-spacing: 0.05em;">Median % Normal</div>
              <div style="font-size: 14px; font-weight: 600; font-family: var(--font-ibm-plex-mono), monospace; color: ${color};">${formatPctOfNormal(pct)}</div>
            </div>
          </div>
        `;
        popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "240px", offset: 10 })
          .setLngLat(e.lngLat).setHTML(html).addTo(map);

        if (onBasinSelectRef.current && props.hucId) {
          onBasinSelectRef.current(props.hucId as string);
        }
      };

      map.on("click", "huc4-fill", basinClickHandler("huc4-fill"));
      map.on("click", "huc2-fill", basinClickHandler("huc2-fill"));
      map.on("mouseenter", "huc4-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "huc4-fill", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "huc2-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "huc2-fill", () => { map.getCanvas().style.cursor = ""; });

      map.on("click", "station-circles", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["station-circles"] });
        if (!features.length) return;
        const props = features[0].properties!;
        const geom = features[0].geometry;
        if (geom.type !== "Point") return;
        showPopup(map, geom.coordinates as [number, number], props);
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
      map.on("mouseleave", "station-circles", () => { map.getCanvas().style.cursor = ""; });

      map.on("moveend", updateVisibleStations);
      map.on("zoomend", updateVisibleStations);
      updateVisibleStations();
      setMapLoaded(true);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const metricRef = useRef(metric);
  metricRef.current = metric;
  const onStationSelectRef = useRef(onStationSelect);
  onStationSelectRef.current = onStationSelect;
  const onBasinSelectRef = useRef(onBasinSelect);
  onBasinSelectRef.current = onBasinSelect;

  function metricDotLabel(m: string, s: StationCurrentConditions): string {
    const fmtChange = (v: number | null) => v === null ? "" : `${v > 0 ? "+" : ""}${v.toFixed(1)}"`;
    switch (m) {
      case "WTEQ": return s.swe !== null ? `${s.swe.toFixed(1)}"` : "";
      case "WTEQ_PCT": return s.pctOfNormal !== null ? `${Math.round(s.pctOfNormal)}%` : "";
      case "CHANGE_1D": return fmtChange(s.sweChange1d);
      case "CHANGE_7D": return fmtChange(s.sweChange7d);
      case "SNWD": return s.snowDepth !== null ? `${Math.round(s.snowDepth)}"` : "";
      case "PREC": return s.precipAccum !== null ? `${Math.round(s.precipAccum)}"` : "";
      case "TAVG": return s.temp !== null ? `${Math.round(s.temp)}°` : "";
      case "DENSITY": {
        const d = calcDensity(s.swe, s.snowDepth);
        return d !== null ? `${d.toFixed(0)}%` : "";
      }
      default: return "";
    }
  }

  function formatMetricValue(m: string, val: number | null): string {
    switch (m) {
      case "SNWD": return formatSnowDepth(val);
      case "PREC": return formatPrecip(val);
      case "TAVG": return formatTemp(val);
      case "DENSITY": return formatDensity(val);
      default: return formatSwe(val);
    }
  }

  function metricLabel(m: string): string {
    switch (m) {
      case "SNWD": return "Snow Depth";
      case "PREC": return "Precip";
      case "TAVG": return "Temp";
      case "DENSITY": return "Density";
      default: return "SWE";
    }
  }

  function parseVal(v: unknown): number | null {
    if (v === null || v === undefined || v === "null") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  function showPopup(map: maplibregl.Map, coords: [number, number], props: Record<string, any>) {
    if (popupRef.current) popupRef.current.remove();
    const m = metricRef.current;
    const color = props.color;
    const swe = parseVal(props.swe);
    const pctOfNormal = parseVal(props.pctOfNormal);
    const snowDepth = parseVal(props.snowDepth);
    const precipAccum = parseVal(props.precipAccum);
    const temp = parseVal(props.temp);
    const change1d = parseVal(props.sweChange1d);
    const change7d = parseVal(props.sweChange7d);

    const statRow = (label: string, val: string, valColor = theme.darkGray) =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-top:1px solid ${theme.borderGray};">
        <span style="font-size:10px;color:${theme.mediumGray};font-family:var(--font-ibm-plex-mono),monospace;">${label}</span>
        <span style="font-size:11px;font-weight:600;font-family:var(--font-ibm-plex-mono),monospace;color:${valColor};">${val}</span>
      </div>`;

    let rows = "";
    if (m === "WTEQ" || m === "WTEQ_PCT") {
      rows += statRow("SWE", formatSwe(swe));
      rows += statRow("% of Normal", formatPctOfNormal(pctOfNormal), color);
      rows += statRow("1-day change", formatChange(change1d), getChangeColor(change1d));
      rows += statRow("7-day change", formatChange(change7d), getChangeColor(change7d));
    } else if (m === "CHANGE_1D") {
      rows += statRow("1-day change", formatChange(change1d), color);
      rows += statRow("7-day change", formatChange(change7d), getChangeColor(change7d));
      rows += statRow("SWE", formatSwe(swe));
      rows += statRow("% of Normal", formatPctOfNormal(pctOfNormal));
    } else if (m === "CHANGE_7D") {
      rows += statRow("7-day change", formatChange(change7d), color);
      rows += statRow("1-day change", formatChange(change1d), getChangeColor(change1d));
      rows += statRow("SWE", formatSwe(swe));
      rows += statRow("% of Normal", formatPctOfNormal(pctOfNormal));
    } else if (m === "SNWD") {
      rows += statRow("Snow Depth", formatSnowDepth(snowDepth), color);
      rows += statRow("SWE", formatSwe(swe));
      rows += statRow("% of Normal", formatPctOfNormal(pctOfNormal));
    } else if (m === "PREC") {
      rows += statRow("Season Precip", formatPrecip(precipAccum), color);
      rows += statRow("SWE", formatSwe(swe));
      rows += statRow("% of Normal", formatPctOfNormal(pctOfNormal));
    } else if (m === "DENSITY") {
      const dens = calcDensity(swe, snowDepth);
      rows += statRow("Density", formatDensity(dens), color);
      rows += statRow("Quality", getDensityLabel(dens));
      rows += statRow("SWE", formatSwe(swe));
      rows += statRow("Depth", formatSnowDepth(snowDepth));
    } else {
      rows += statRow("Temperature", formatTemp(temp), color);
      rows += statRow("SWE", formatSwe(swe));
      rows += statRow("% of Normal", formatPctOfNormal(pctOfNormal));
    }

    const html = `
      <div style="font-family:var(--font-dm-sans),sans-serif;min-width:200px;">
        <div style="font-weight:600;font-size:13px;color:${theme.black};margin-bottom:2px;">${props.name}</div>
        <div style="font-size:10px;color:${theme.mediumGray};margin-bottom:8px;font-family:var(--font-ibm-plex-mono),monospace;">${props.state} · ${formatElevation(Number(props.elevation))}</div>
        ${rows}
      </div>
    `;
    popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "260px", offset: 10 })
      .setLngLat(coords).setHTML(html).addTo(map);
  }

  // Update station data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const source = map.getSource("stations") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: stations.filter((s) => s.latitude && s.longitude).map((s) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [s.longitude, s.latitude] },
        properties: {
          triplet: s.triplet, name: s.name, state: s.state, elevation: s.elevation,
          swe: s.swe, snowDepth: s.snowDepth, precipAccum: s.precipAccum, temp: s.temp,
          pctOfNormal: s.pctOfNormal, sweChange1d: s.sweChange1d, sweChange7d: s.sweChange7d,
          color: getMetricMapColor(metric, s),
          label: metricDotLabel(metric, s),
        },
      })),
    });
    setTimeout(updateVisibleStations, 100);
  }, [stations, mapLoaded, metric, updateVisibleStations]);

  // fly-to
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 11, duration: 1500 });
    map.once("moveend", () => {
      const station = stationsRef.current.find((s) => s.triplet === flyTo.triplet);
      if (!station) return;
      showPopup(map, [station.longitude, station.latitude], {
        triplet: station.triplet, name: station.name, state: station.state,
        elevation: station.elevation, swe: station.swe, snowDepth: station.snowDepth,
        precipAccum: station.precipAccum, temp: station.temp, pctOfNormal: station.pctOfNormal,
        sweChange1d: station.sweChange1d, sweChange7d: station.sweChange7d,
        color: getMetricMapColor(metricRef.current, station),
      });
    });
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
  }, [showStations, showHuc2, showHuc4, mapLoaded]);

  return <div ref={containerRef} className="w-full h-full" />;
}

export default StationMapInner;
