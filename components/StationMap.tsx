"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StationCurrentConditions } from "@/lib/types";
import { getMapMarkerColor, getMetricMapColor } from "@/lib/colors";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth, formatTemp, formatPrecip } from "@/lib/formatting";
import { urlTriplet } from "@/lib/stations";
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
      map.addLayer({
        id: "huc4-label-text",
        type: "symbol",
        source: "huc4-labels",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 11,
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-allow-overlap": false,
          visibility: "none",
        },
        paint: {
          "text-color": theme.darkGray,
          "text-halo-color": "rgba(255,255,255,0.85)",
          "text-halo-width": 1.5,
        },
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
      map.addLayer({
        id: "huc2-label-text",
        type: "symbol",
        source: "huc2-labels",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 14,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": false,
          visibility: "none",
        },
        paint: {
          "text-color": theme.black,
          "text-halo-color": "rgba(255,255,255,0.92)",
          "text-halo-width": 2,
        },
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
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4, 6, 6, 10, 10],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": theme.white,
          "circle-opacity": 0.95,
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
      map.on("mouseenter", "station-circles", () => { map.getCanvas().style.cursor = "pointer"; });
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

  function showPopup(map: maplibregl.Map, coords: [number, number], props: Record<string, any>) {
    if (popupRef.current) popupRef.current.remove();
    const triplet = props.triplet;
    const m = metricRef.current;
    const color = props.color;
    const swe = props.swe !== "null" && props.swe !== undefined ? Number(props.swe) : null;
    const pctOfNormal = props.pctOfNormal !== "null" && props.pctOfNormal !== undefined ? Number(props.pctOfNormal) : null;
    const snowDepth = props.snowDepth !== "null" && props.snowDepth !== undefined ? Number(props.snowDepth) : null;
    const precipAccum = props.precipAccum !== "null" && props.precipAccum !== undefined ? Number(props.precipAccum) : null;
    const temp = props.temp !== "null" && props.temp !== undefined ? Number(props.temp) : null;
    const primaryVal = m === "SNWD" ? snowDepth : m === "PREC" ? precipAccum : m === "TAVG" ? temp : swe;
    const secondaryVal = m === "WTEQ" ? formatPctOfNormal(pctOfNormal) : formatSwe(swe);
    const secondaryColor = m === "WTEQ" ? color : theme.black;

    const html = `
      <div style="font-family: var(--font-dm-sans), sans-serif; min-width: 180px;">
        <div style="font-weight: 600; font-size: 13px; color: ${theme.black}; margin-bottom: 4px;">${props.name}</div>
        <div style="font-size: 11px; color: ${theme.mediumGray}; margin-bottom: 8px;">${props.state} · ${formatElevation(Number(props.elevation))}</div>
        <div style="display: flex; gap: 12px; margin-bottom: 8px;">
          <div>
            <div style="font-size: 10px; color: ${theme.mediumGray}; text-transform: uppercase; letter-spacing: 0.05em;">${metricLabel(m)}</div>
            <div style="font-size: 14px; font-weight: 600; font-family: var(--font-ibm-plex-mono), monospace; color: ${color};">${formatMetricValue(m, primaryVal)}</div>
          </div>
          <div>
            <div style="font-size: 10px; color: ${theme.mediumGray}; text-transform: uppercase; letter-spacing: 0.05em;">${m === "WTEQ" ? "% Normal" : "SWE"}</div>
            <div style="font-size: 14px; font-weight: 600; font-family: var(--font-ibm-plex-mono), monospace; color: ${secondaryColor};">${secondaryVal}</div>
          </div>
        </div>
        <a href="/station/${urlTriplet(triplet)}" style="font-size: 11px; color: #3B82F6; text-decoration: none; font-weight: 500;">View Details →</a>
      </div>
    `;
    popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "240px", offset: 10 })
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
          pctOfNormal: s.pctOfNormal, color: getMetricMapColor(metric, s),
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
    labelSource.setData({
      type: "FeatureCollection",
      features: (huc4Markers || []).filter((b) => b.medianPctOfNormal !== null).map((b) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [b.longitude, b.latitude] },
        properties: { label: `${Math.round(b.medianPctOfNormal!)}%` },
      })),
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
    labelSource.setData({
      type: "FeatureCollection",
      features: (huc2Markers || []).filter((b) => b.medianPctOfNormal !== null).map((b) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [b.longitude, b.latitude] },
        properties: { label: `${b.name}\n${Math.round(b.medianPctOfNormal!)}%` },
      })),
    });
  }, [huc2Markers, mapLoaded]);

  // Layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const vis = (v: boolean) => (v ? "visible" : "none");
    if (map.getLayer("station-circles")) map.setLayoutProperty("station-circles", "visibility", vis(showStations));
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
