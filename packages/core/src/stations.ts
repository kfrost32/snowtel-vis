import type { Station, StationCurrentConditions } from "./types";
import stationsGeoJson from "../data/stations.json";
import bcStations from "../data/bc-stations.json";

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

interface BcStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation_m: number | null;
}

const BC_NETWORK = "ASWS";

export interface StationSource {
  name: string;
  label: string;
  linkText: string;
  description: string;
  url: string;
}

interface NetworkInfo {
  label: string;
  liveReadings: boolean;
  nwsForecast: boolean;
  title: (station: Pick<Station, "name" | "state">) => string;
  source: (triplet: string) => StationSource;
  photoUrl: (triplet: string) => string | null;
}

const nrcsSiteNumber = (triplet: string) => triplet.split(":")[0];

const nrcsSource = (triplet: string): StationSource => ({
  name: "USDA NRCS SNOTEL",
  label: "NRCS",
  linkText: "NRCS station page",
  description: "NRCS automated snow telemetry",
  url: `https://wcc.sc.egov.usda.gov/nwcc/site?sitenum=${nrcsSiteNumber(triplet)}`,
});

const nrcsPhotoUrl = (triplet: string) => `https://www.wcc.nrcs.usda.gov/siteimages/${nrcsSiteNumber(triplet)}.jpg`;

const NRCS_NETWORK: NetworkInfo = {
  label: "SNOTEL",
  liveReadings: true,
  nwsForecast: true,
  title: (s) => `${s.name} SNOTEL, ${s.state}`,
  source: nrcsSource,
  photoUrl: nrcsPhotoUrl,
};

const NETWORKS: Record<string, NetworkInfo> = {
  SNOTEL: NRCS_NETWORK,
  "Snow Course": { ...NRCS_NETWORK, label: "Snow course", liveReadings: false, nwsForecast: false },
  [BC_NETWORK]: {
    label: "BC snow pillow",
    liveReadings: true,
    nwsForecast: false,
    title: (s) => `${s.name} snow pillow, BC`,
    source: () => ({
      name: "BC River Forecast Centre",
      label: "BC RFC",
      linkText: "BC snow survey data",
      description: "the BC River Forecast Centre",
      url: "https://www2.gov.bc.ca/gov/content/environment/air-land-water/water/water-science-data/water-data-tools/snow-survey-data",
    }),
    photoUrl: () => null,
  },
};

function network(station: Pick<Station, "network">): NetworkInfo {
  return NETWORKS[station.network] ?? NRCS_NETWORK;
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

  const nrcs = features
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
    });

  const bc = (bcStations as BcStation[]).map((s): Station => ({
    triplet: `${s.id}:BC:${BC_NETWORK}`,
    name: s.name,
    state: "BC",
    latitude: s.latitude,
    longitude: s.longitude,
    elevation: Math.round((s.elevation_m ?? 0) * M_TO_FT),
    huc: "",
    beginDate: "",
    network: BC_NETWORK,
  }));

  _stations = [...nrcs, ...bc].sort((a, b) => a.name.localeCompare(b.name));

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

export function hasLiveReadings(station: Pick<Station, "network">): boolean {
  return network(station).liveReadings;
}

export function isBcStation(station: Pick<Station, "network">): boolean {
  return station.network === BC_NETWORK;
}

export function hasNwsForecast(station: Pick<Station, "network"> | undefined): boolean {
  return station ? network(station).nwsForecast : false;
}

export function networkLabel(station: Pick<Station, "network">): string {
  return network(station).label;
}

export function stationTitle(station: Pick<Station, "name" | "state" | "network">): string {
  return network(station).title(station);
}

export function stationSource(station: Pick<Station, "triplet" | "network">): StationSource {
  return network(station).source(station.triplet);
}

export function stationPhotoUrl(station: Pick<Station, "triplet" | "network">): string | null {
  return network(station).photoUrl(station.triplet);
}

export { urlTriplet, parseTripletFromUrl };

let _placeholderConditions: StationCurrentConditions[] | null = null;

export function getPlaceholderConditions(): StationCurrentConditions[] {
  _placeholderConditions ??= getAllStations().map((s) => ({
    ...s,
    swe: null, sweNormal: null, pctOfNormal: null, snowDepth: null, temp: null, precipAccum: null,
    sweChange1d: null, sweChange3d: null, sweChange7d: null,
    depthChange1d: null, depthChange3d: null, depthChange7d: null,
    lastUpdated: "",
  }));
  return _placeholderConditions;
}
