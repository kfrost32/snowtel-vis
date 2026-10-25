"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StationCurrentConditions } from "@snotel/core/types";
import { prefetchStation } from "@/lib/prefetch";
import { theme } from "@snotel/core/theme";
import { SPOT_ICON_SIZE, SPOT_KINDS, spotIconSvg, type Spot, type SpotKind } from "@snotel/core/spots";
import {
  BASEMAP_STYLE_URL,
  INITIAL_CENTER,
  INITIAL_ZOOM,
  SPOT_MINZOOM,
  STATION_LABEL_MINZOOM,
  TERRAIN_MAXZOOM,
  TERRAIN_TILES,
  hillshadePaint,
  stationCircleLayout,
  stationCirclePaint,
  stationFeatures,
  stationLabelLayout,
  stationLabelPaint,
  regionFillPaint,
  regionLabelLayout,
  regionLabelPaint,
  regionLabels,
  regionOutlinePaint,
  regionPolygons,
  spotFeatures,
  spotImageId,
  spotLayout,
  spotPaint,
  type RegionLevel,
  type RegionMarker,
} from "@snotel/core/map-style";
import huc2Boundaries from "@snotel/core/data/huc2-boundaries.json";
import huc4Boundaries from "@snotel/core/data/huc4-boundaries.json";

interface StationMapProps {
  stations: StationCurrentConditions[];
  onVisibleStationsChange?: (triplets: Set<string>) => void;
  flyTo?: { lng: number; lat: number; triplet: string } | null;
  huc2Markers?: RegionMarker[];
  huc4Markers?: RegionMarker[];
  showStations?: boolean;
  showHuc2?: boolean;
  showHuc4?: boolean;
  metric?: string;
  onStationSelect?: (triplet: string) => void;
  onBasinSelect?: (huc: string) => void;
  spots?: Spot[];
  showSpots?: boolean;
}

function addSpotIcon(map: maplibregl.Map, kind: SpotKind) {
  const image = new Image(SPOT_ICON_SIZE * 2, SPOT_ICON_SIZE * 2);
  image.onload = () => {
    if (!map.hasImage(spotImageId(kind))) map.addImage(spotImageId(kind), image, { pixelRatio: 2 });
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(spotIconSvg(kind, 2))}`;
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
      style: BASEMAP_STYLE_URL,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
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
        tiles: TERRAIN_TILES,
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: TERRAIN_MAXZOOM,
      });
      map.addLayer({
        id: "hillshade",
        type: "hillshade",
        source: "terrain-dem",
        paint: hillshadePaint,
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
        paint: regionFillPaint,
        layout: { visibility: "none" },
      });
      map.addLayer({
        id: "huc4-outline",
        type: "line",
        source: "huc4-polygons",
        paint: regionOutlinePaint[4],
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
        paint: regionFillPaint,
        layout: { visibility: "none" },
      });
      map.addLayer({
        id: "huc2-outline",
        type: "line",
        source: "huc2-polygons",
        paint: regionOutlinePaint[2],
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
        layout: stationCircleLayout,
        paint: stationCirclePaint,
      });
      map.addLayer({
        id: "station-labels",
        type: "symbol",
        source: "stations",
        minzoom: STATION_LABEL_MINZOOM,
        layout: stationLabelLayout,
        paint: stationLabelPaint,
      });

      // ── Ski areas & backcountry spots ──────────────────────────────────
      for (const kind of SPOT_KINDS) addSpotIcon(map, kind);
      map.addSource("spots", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "spot-icons",
        type: "symbol",
        source: "spots",
        minzoom: SPOT_MINZOOM,
        layout: spotLayout,
        paint: spotPaint,
      });

      // Basin labels — added last so they render above station dots
      map.addLayer({
        id: "huc4-label-text",
        type: "symbol",
        source: "huc4-labels",
        layout: { ...regionLabelLayout[4], visibility: "none" },
        paint: regionLabelPaint[4],
      });
      map.addLayer({
        id: "huc2-label-text",
        type: "symbol",
        source: "huc2-labels",
        layout: { ...regionLabelLayout[2], visibility: "none" },
        paint: regionLabelPaint[2],
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
  // Map init runs once on mount; all mutable values accessed via refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metricRef = useRef(metric);
  metricRef.current = metric;
  const onStationSelectRef = useRef(onStationSelect);
  onStationSelectRef.current = onStationSelect;
  const onBasinSelectRef = useRef(onBasinSelect);
  onBasinSelectRef.current = onBasinSelect;

  // Update station data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const source = map.getSource("stations") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(stationFeatures(stations, metric));
    map.once("render", updateVisibleStations);
  }, [stations, mapLoaded, metric, updateVisibleStations]);

  // Update spot data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const source = map.getSource("spots") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(spotFeatures(spots));
  }, [spots, mapLoaded]);

  // fly-to
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 11, duration: 1500 });
  }, [flyTo]);

  const updateRegions = useCallback((level: RegionLevel, markers: RegionMarker[] | undefined, boundaries: GeoJSON.FeatureCollection) => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const polySource = map.getSource(`huc${level}-polygons`) as maplibregl.GeoJSONSource | undefined;
    const labelSource = map.getSource(`huc${level}-labels`) as maplibregl.GeoJSONSource | undefined;
    if (!polySource || !labelSource) return;
    polySource.setData(regionPolygons(boundaries, markers ?? [], level));
    labelSource.setData(regionLabels(boundaries, markers ?? [], level));
  }, [mapLoaded]);

  useEffect(() => updateRegions(4, huc4Markers, huc4Boundaries as GeoJSON.FeatureCollection), [huc4Markers, updateRegions]);
  useEffect(() => updateRegions(2, huc2Markers, huc2Boundaries as GeoJSON.FeatureCollection), [huc2Markers, updateRegions]);

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
