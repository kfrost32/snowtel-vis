"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StationCurrentConditions } from "@/lib/types";
import { getMapMarkerColor, getMetricMapColor, getStationMetricValue, getMetricColor } from "@/lib/colors";
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
  basinMarkers?: BasinMarker[];
  viewMode?: "stations" | "basins";
  basinLevel?: 2 | 4;
  metric?: string;
}

function StationMapInner({ stations, onVisibleStationsChange, flyTo, basinMarkers, viewMode = "stations", basinLevel = 2, metric = "WTEQ" }: StationMapProps) {
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
      const features = map.queryRenderedFeatures(undefined as any, {
        layers: ["station-circles"],
      });
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
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    mapRef.current = map;

    map.on("load", () => {
      map.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "cluster-circles",
        type: "circle",
        source: "stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": theme.mediumGray,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,
            20,
            20,
            100,
            26,
          ],
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": theme.white,
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "stations",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": theme.white,
        },
      });

      map.addLayer({
        id: "station-circles",
        type: "circle",
        source: "stations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3, 4,
            6, 6,
            10, 10,
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": theme.white,
          "circle-opacity": 0.9,
        },
      });

      map.addSource("basin-polygons", {
        type: "geojson",
        data: { type: "FeatureCollection" as const, features: [] },
      });

      map.addSource("basin-labels", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "basin-fill",
        type: "fill",
        source: "basin-polygons",
        paint: {
          "fill-color": ["coalesce", ["get", "fillColor"], theme.mediumGray],
          "fill-opacity": 0.35,
        },
        layout: { visibility: "none" },
      });

      map.addLayer({
        id: "basin-outline",
        type: "line",
        source: "basin-polygons",
        paint: {
          "line-color": ["coalesce", ["get", "fillColor"], theme.mediumGray],
          "line-width": 2,
          "line-opacity": 0.8,
        },
        layout: { visibility: "none" },
      });

      map.addLayer({
        id: "basin-label-text",
        type: "symbol",
        source: "basin-labels",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 14,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
          visibility: "none",
        },
        paint: {
          "text-color": theme.black,
          "text-halo-color": "rgba(255,255,255,0.9)",
          "text-halo-width": 2,
        },
      });

      map.on("click", "basin-fill", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["basin-fill"],
        });
        if (!features.length) return;
        const props = features[0].properties!;

        if (popupRef.current) popupRef.current.remove();

        const pct = props.medianPctOfNormal !== undefined && props.medianPctOfNormal !== "null"
          ? Number(props.medianPctOfNormal) : null;
        const color = props.fillColor || theme.mediumGray;
        const html = `
          <div style="font-family: var(--font-dm-sans), sans-serif; min-width: 180px;">
            <div style="font-weight: 600; font-size: 13px; color: ${theme.black}; margin-bottom: 4px;">
              ${props.name}
            </div>
            <div style="font-size: 11px; color: ${theme.mediumGray}; margin-bottom: 8px;">
              ${props.stationCount || ""} stations
            </div>
            <div>
              <div style="font-size: 10px; color: ${theme.mediumGray}; text-transform: uppercase; letter-spacing: 0.05em;">Median % Normal</div>
              <div style="font-size: 14px; font-weight: 600; font-family: var(--font-ibm-plex-mono), monospace; color: ${color};">${formatPctOfNormal(pct)}</div>
            </div>
            <a href="/basins?basin=${props.huc2}" style="display: inline-block; margin-top: 8px; font-size: 11px; color: #3B82F6; text-decoration: none; font-weight: 500;">
              View Basin →
            </a>
          </div>
        `;

        popupRef.current = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: "240px",
          offset: 10,
        })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map);
      });

      map.on("mouseenter", "basin-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "basin-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      updateVisibleStations();
      setMapLoaded(true);
    });

    map.on("click", "cluster-circles", (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["cluster-circles"],
      });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource("stations") as maplibregl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geom = features[0].geometry;
        if (geom.type === "Point") {
          map.easeTo({
            center: geom.coordinates as [number, number],
            zoom: zoom + 1,
          });
        }
      });
    });

    map.on("click", "station-circles", (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["station-circles"],
      });
      if (!features.length) return;
      const props = features[0].properties!;
      const geom = features[0].geometry;
      if (geom.type !== "Point") return;

      showPopup(map, geom.coordinates as [number, number], props);
    });

    map.on("mouseenter", "station-circles", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "station-circles", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("mouseenter", "cluster-circles", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "cluster-circles", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("moveend", updateVisibleStations);
    map.on("zoomend", updateVisibleStations);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const metricRef = useRef(metric);
  metricRef.current = metric;

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

  function showPopup(
    map: maplibregl.Map,
    coords: [number, number],
    props: Record<string, any>
  ) {
    if (popupRef.current) popupRef.current.remove();

    const triplet = props.triplet;
    const name = props.name;
    const state = props.state;
    const elevation = Number(props.elevation);
    const color = props.color;
    const m = metricRef.current;

    const swe = props.swe !== "null" && props.swe !== undefined ? Number(props.swe) : null;
    const pctOfNormal = props.pctOfNormal !== "null" && props.pctOfNormal !== undefined ? Number(props.pctOfNormal) : null;
    const snowDepth = props.snowDepth !== "null" && props.snowDepth !== undefined ? Number(props.snowDepth) : null;
    const precipAccum = props.precipAccum !== "null" && props.precipAccum !== undefined ? Number(props.precipAccum) : null;
    const temp = props.temp !== "null" && props.temp !== undefined ? Number(props.temp) : null;

    const primaryVal = m === "SNWD" ? snowDepth : m === "PREC" ? precipAccum : m === "TAVG" ? temp : swe;
    const primaryLabel = metricLabel(m);
    const primaryFormatted = formatMetricValue(m, primaryVal);

    const secondaryLabel = m === "WTEQ" ? "% Normal" : "SWE";
    const secondaryVal = m === "WTEQ" ? formatPctOfNormal(pctOfNormal) : formatSwe(swe);
    const secondaryColor = m === "WTEQ" ? color : theme.black;

    const html = `
      <div style="font-family: var(--font-dm-sans), sans-serif; min-width: 180px;">
        <div style="font-weight: 600; font-size: 13px; color: ${theme.black}; margin-bottom: 4px;">
          ${name}
        </div>
        <div style="font-size: 11px; color: ${theme.mediumGray}; margin-bottom: 8px;">
          ${state} · ${formatElevation(elevation)}
        </div>
        <div style="display: flex; gap: 12px; margin-bottom: 8px;">
          <div>
            <div style="font-size: 10px; color: ${theme.mediumGray}; text-transform: uppercase; letter-spacing: 0.05em;">${primaryLabel}</div>
            <div style="font-size: 14px; font-weight: 600; font-family: var(--font-ibm-plex-mono), monospace; color: ${color};">${primaryFormatted}</div>
          </div>
          <div>
            <div style="font-size: 10px; color: ${theme.mediumGray}; text-transform: uppercase; letter-spacing: 0.05em;">${secondaryLabel}</div>
            <div style="font-size: 14px; font-weight: 600; font-family: var(--font-ibm-plex-mono), monospace; color: ${secondaryColor};">${secondaryVal}</div>
          </div>
        </div>
        <a href="/station/${urlTriplet(triplet)}" style="font-size: 11px; color: #3B82F6; text-decoration: none; font-weight: 500;">
          View Details →
        </a>
      </div>
    `;

    popupRef.current = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "240px",
      offset: 10,
    })
      .setLngLat(coords)
      .setHTML(html)
      .addTo(map);
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("stations") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: stations
        .filter((s) => s.latitude && s.longitude)
        .map((s) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [s.longitude, s.latitude],
          },
          properties: {
            triplet: s.triplet,
            name: s.name,
            state: s.state,
            elevation: s.elevation,
            swe: s.swe,
            snowDepth: s.snowDepth,
            precipAccum: s.precipAccum,
            temp: s.temp,
            pctOfNormal: s.pctOfNormal,
            color: getMetricMapColor(metric, s),
          },
        })),
    };

    source.setData(geojson);

    setTimeout(updateVisibleStations, 100);
  }, [stations, mapLoaded, metric, updateVisibleStations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;

    map.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: 11,
      duration: 1500,
    });

    const waitForIdle = () => {
      const station = stationsRef.current.find((s) => s.triplet === flyTo.triplet);
      if (!station) return;

      showPopup(map, [station.longitude, station.latitude], {
        triplet: station.triplet,
        name: station.name,
        state: station.state,
        elevation: station.elevation,
        swe: station.swe,
        snowDepth: station.snowDepth,
        precipAccum: station.precipAccum,
        temp: station.temp,
        pctOfNormal: station.pctOfNormal,
        color: getMetricMapColor(metricRef.current, station),
      });
    };

    map.once("moveend", waitForIdle);
  }, [flyTo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const polySource = map.getSource("basin-polygons") as maplibregl.GeoJSONSource | undefined;
    const labelSource = map.getSource("basin-labels") as maplibregl.GeoJSONSource | undefined;
    if (!polySource || !labelSource) return;

    const markerMap = new Map(
      (basinMarkers || []).map((b) => [b.huc, b])
    );

    const boundaries = basinLevel === 4 ? huc4Boundaries : huc2Boundaries;
    const hucKey = basinLevel === 4 ? "huc4" : "huc2";

    const updatedPolygons: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: (boundaries as GeoJSON.FeatureCollection).features.map((f) => {
        const huc = f.properties?.[hucKey];
        const marker = markerMap.get(huc);
        return {
          ...f,
          properties: {
            ...f.properties,
            huc2: huc,
            fillColor: marker ? getMapMarkerColor(marker.medianPctOfNormal) : theme.mediumGray,
            medianPctOfNormal: marker?.medianPctOfNormal ?? null,
            stationCount: marker?.stationCount ?? 0,
            name: marker?.name ?? f.properties?.name ?? "",
          },
        };
      }),
    };
    polySource.setData(updatedPolygons);

    const labelFeatures: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: (basinMarkers || [])
        .filter((b) => b.medianPctOfNormal !== null)
        .map((b) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [b.longitude, b.latitude],
          },
          properties: {
            label: `${b.name}\n${Math.round(b.medianPctOfNormal!)}%`,
          },
        })),
    };
    labelSource.setData(labelFeatures);
  }, [basinMarkers, basinLevel, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const stationLayers = ["cluster-circles", "cluster-count", "station-circles"];
    const basinLayers = ["basin-fill", "basin-outline", "basin-label-text"];

    if (viewMode === "basins") {
      stationLayers.forEach((l) => {
        if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", "none");
      });
      basinLayers.forEach((l) => {
        if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", "visible");
      });
    } else {
      stationLayers.forEach((l) => {
        if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", "visible");
      });
      basinLayers.forEach((l) => {
        if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", "none");
      });
    }
  }, [viewMode, mapLoaded]);

  return <div ref={containerRef} className="w-full h-full" />;
}

export default StationMapInner;
