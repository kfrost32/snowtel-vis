import type { Station } from "./types";
import stationsGeoJson from "@/data/stations.json";

const STATE_ABBREV: Record<string, string> = {
  Alaska: "AK",
  Arizona: "AZ",
  California: "CA",
  Colorado: "CO",
  Idaho: "ID",
  Montana: "MT",
  Nevada: "NV",
  "New Mexico": "NM",
  Oregon: "OR",
  "South Dakota": "SD",
  Utah: "UT",
  Washington: "WA",
  Wyoming: "WY",
};

const M_TO_FT = 3.28084;

interface GeoJsonFeature {
  properties: {
    code: string;
    name: string;
    network: string;
    elevation_m: number;
    latitude: number;
    longitude: number;
    state: string;
    HUC: string;
    beginDate: string;
    endDate: string;
    csvData: boolean;
  };
}

let _stations: Station[] | null = null;
let _stationMap: Map<string, Station> | null = null;

function formatTriplet(code: string): string {
  return code.replace(/_/g, ":");
}

function urlTriplet(triplet: string): string {
  return triplet.replace(/:/g, "-");
}

function parseTripletFromUrl(urlTriplet: string): string {
  return urlTriplet.replace(/-/g, ":");
}

export function getAllStations(): Station[] {
  if (_stations) return _stations;

  const features = (stationsGeoJson as { features: GeoJsonFeature[] }).features;

  _stations = features
    .filter((f) => f.properties.csvData && (f.properties.network === "SNOTEL" || f.properties.network === "Snow Course"))
    .map((f): Station => {
      const p = f.properties;
      return {
        triplet: formatTriplet(p.code),
        name: p.name,
        state: STATE_ABBREV[p.state] || p.state,
        latitude: p.latitude,
        longitude: p.longitude,
        elevation: Math.round(p.elevation_m * M_TO_FT),
        huc: p.HUC,
        beginDate: (p.beginDate || "").split(/[T ]/)[0],
        network: p.network,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return _stations;
}

export function getStationMap(): Map<string, Station> {
  if (_stationMap) return _stationMap;
  _stationMap = new Map();
  for (const s of getAllStations()) {
    _stationMap.set(s.triplet, s);
  }
  return _stationMap;
}

export function getStation(triplet: string): Station | undefined {
  return getStationMap().get(triplet);
}

export function getStationsByState(state: string): Station[] {
  return getAllStations().filter((s) => s.state === state);
}

export { urlTriplet, parseTripletFromUrl };
