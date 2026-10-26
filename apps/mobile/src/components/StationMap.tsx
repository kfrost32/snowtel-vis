import { useMemo, useRef } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { Camera, GeoJSONSource, Images, Layer, Map, RasterDEMSource, type MapRef } from "@maplibre/maplibre-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SymbolLayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import type { StationCurrentConditions } from "@snotel/core/types";
import {
  BASEMAP_STYLE_URL,
  BASEMAP_STYLE_URL_DARK,
  SPOT_MINZOOM,
  STATION_LABEL_MINZOOM,
  TERRAIN_MAXZOOM,
  TERRAIN_TILES,
  WESTERN_US_BOUNDS,
  hillshadePaint,
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
  stationCircleLayout,
  stationCirclePaint,
  stationFeatures,
  stationLabelLayout,
  stationLabelPaint,
  type RegionLevel,
  type RegionMarker,
} from "@snotel/core/map-style";
import type { Spot } from "@snotel/core/spots";
import huc2Boundaries from "@snotel/core/data/huc2-boundaries.json";
import huc4Boundaries from "@snotel/core/data/huc4-boundaries.json";
import { nativePaint } from "@/lib/map-paint";

export type MapSelection = { kind: "station"; triplet: string } | { kind: "region"; huc: string };

interface StationMapProps {
  stations: StationCurrentConditions[];
  metric: string;
  regions: Record<RegionLevel, RegionMarker[]>;
  spots: Spot[];
  show: { stations: boolean; regions: boolean; subregions: boolean; spots: boolean };
  onSelect: (selection: MapSelection) => void;
  initialBounds?: [number, number, number, number] | null;
}

const BOUNDARIES: Record<RegionLevel, GeoJSON.FeatureCollection> = {
  2: huc2Boundaries as GeoJSON.FeatureCollection,
  4: huc4Boundaries as GeoJSON.FeatureCollection,
};

const { "hillshade-shadow-color": _shadow, "hillshade-highlight-color": _highlight, ...hillshadeBase } = hillshadePaint ?? {};
const HILLSHADE_PAINT = nativePaint({ ...hillshadeBase, "hillshade-exaggeration": 0.15 });
const CIRCLE_PAINT = nativePaint(stationCirclePaint);
const LABEL_PAINT = nativePaint(stationLabelPaint);
const FILL_PAINT = nativePaint(regionFillPaint);
const OUTLINE_PAINT = { 2: nativePaint(regionOutlinePaint[2]), 4: nativePaint(regionOutlinePaint[4]) };
const REGION_LABEL_PAINT = { 2: nativePaint(regionLabelPaint[2]), 4: nativePaint(regionLabelPaint[4]) };

const SPOT_IMAGES = {
  [spotImageId("resort")]: require("../../assets/map/spot-resort.png"),
  [spotImageId("backcountry")]: require("../../assets/map/spot-backcountry.png"),
};
const SPOT_PAINT = nativePaint(spotPaint);

const TAP_SLOP = 12;
const visibility = (on: boolean) => ({ visibility: on ? ("visible" as const) : ("none" as const) });

export default function StationMap({ stations, metric, regions, spots, show, onSelect, initialBounds }: StationMapProps) {
  const dark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapRef>(null);

  const stationData = useMemo(() => stationFeatures(stations, metric), [stations, metric]);
  const regionData = useMemo(
    () => ({
      2: { polygons: regionPolygons(BOUNDARIES[2], regions[2], 2), labels: regionLabels(BOUNDARIES[2], regions[2], 2) },
      4: { polygons: regionPolygons(BOUNDARIES[4], regions[4], 4), labels: regionLabels(BOUNDARIES[4], regions[4], 4) },
    }),
    [regions]
  );
  const spotData = useMemo(() => spotFeatures(spots), [spots]);

  const handlePress = async (point: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;
    const [x, y] = point;
    const box: [[number, number], [number, number]] = [[x - TAP_SLOP, y - TAP_SLOP], [x + TAP_SLOP, y + TAP_SLOP]];
    if (show.stations) {
      const [station] = await map.queryRenderedFeatures(box, { layers: ["station-circles"] });
      if (station?.properties?.triplet) {
        Haptics.selectionAsync();
        onSelect({ kind: "station", triplet: station.properties.triplet });
        return;
      }
    }
    const regionLayers = [show.subregions && "huc4-fill", show.regions && "huc2-fill"].filter(Boolean) as string[];
    if (!regionLayers.length) return;
    const [region] = await map.queryRenderedFeatures(point, { layers: regionLayers });
    if (region?.properties?.hucId) {
      Haptics.selectionAsync();
      onSelect({ kind: "region", huc: region.properties.hucId });
    }
  };

  return (
    <Map
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      mapStyle={dark ? BASEMAP_STYLE_URL_DARK : BASEMAP_STYLE_URL}
      logo={false}
      attributionPosition={{ bottom: insets.bottom + 64, left: 12 }}
      compassPosition={{ top: insets.top + 112, right: 16 }}
      touchPitch={false}
      onPress={(e) => handlePress(e.nativeEvent.point)}
    >
      <Camera
        initialViewState={{
          bounds: initialBounds ?? WESTERN_US_BOUNDS,
          padding: { top: insets.top + 48, bottom: insets.bottom + 48, left: 8, right: 8 },
        }}
      />
      <RasterDEMSource id="terrain-dem" tiles={TERRAIN_TILES} encoding="terrarium" tileSize={256} maxzoom={TERRAIN_MAXZOOM}>
        <Layer id="hillshade" type="hillshade" paint={HILLSHADE_PAINT} />
      </RasterDEMSource>

      {([4, 2] as const).map((level) => {
        const on = level === 2 ? show.regions : show.subregions;
        return (
          <GeoJSONSource key={`huc${level}`} id={`huc${level}-polygons`} data={regionData[level].polygons}>
            <Layer id={`huc${level}-fill`} type="fill" paint={FILL_PAINT} layout={visibility(on)} />
            <Layer id={`huc${level}-outline`} type="line" paint={OUTLINE_PAINT[level]} layout={visibility(on)} />
          </GeoJSONSource>
        );
      })}

      <GeoJSONSource id="stations" data={stationData}>
        <Layer id="station-circles" type="circle" layout={{ ...stationCircleLayout, ...visibility(show.stations) }} paint={CIRCLE_PAINT} />
        <Layer
          id="station-labels"
          type="symbol"
          minzoom={STATION_LABEL_MINZOOM}
          layout={{ ...stationLabelLayout, ...visibility(show.stations) }}
          paint={LABEL_PAINT}
        />
      </GeoJSONSource>

      <Images images={SPOT_IMAGES} />
      <GeoJSONSource id="spots" data={spotData}>
        <Layer id="spot-icons" type="symbol" minzoom={SPOT_MINZOOM} layout={{ ...spotLayout, ...visibility(show.spots) }} paint={SPOT_PAINT} />
      </GeoJSONSource>

      {([4, 2] as const).map((level) => (
        <GeoJSONSource key={`huc${level}-labels`} id={`huc${level}-labels`} data={regionData[level].labels}>
          <Layer
            id={`huc${level}-label-text`}
            type="symbol"
            layout={{ ...regionLabelLayout[level], ...visibility(level === 2 ? show.regions : show.subregions) }}
            paint={REGION_LABEL_PAINT[level]}
          />
        </GeoJSONSource>
      ))}
    </Map>
  );
}
