import { getStation } from "@snotel/core/stations";
import { summarizeForecast, type NwsGridProperties, type StationForecast } from "@snotel/core/forecast";
import { getSnapshot } from "./snapshot-cache";
import { snapshotKeys } from "./snapshot-store";

const NWS_URL = "https://api.weather.gov";
const USER_AGENT = "SNOTEL Explorer (https://snotel.hereandthere.club)";
const TIMEOUT_MS = 10000;
const POINT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const FORECAST_MAX_AGE_MS = 2 * 60 * 60 * 1000;

interface NwsPoint {
  gridDataUrl: string;
  timeZone: string;
}

async function nwsGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`NWS request failed: ${res.status}`);
  return res.json();
}

async function nwsPoint(triplet: string): Promise<NwsPoint> {
  const station = getStation(triplet);
  if (!station) throw new Error(`Unknown station ${triplet}`);
  const { data } = await getSnapshot<NwsPoint>({
    key: snapshotKeys.nwsPoint(triplet),
    maxAge: POINT_MAX_AGE_MS,
    load: async () => {
      const point = await nwsGet<{ properties: { forecastGridData: string; timeZone: string } }>(
        `${NWS_URL}/points/${station.latitude.toFixed(4)},${station.longitude.toFixed(4)}`
      );
      return { gridDataUrl: point.properties.forecastGridData, timeZone: point.properties.timeZone };
    },
  });
  return data;
}

export function getStationForecast(triplet: string) {
  return getSnapshot<StationForecast>({
    key: snapshotKeys.forecast(triplet),
    maxAge: FORECAST_MAX_AGE_MS,
    load: async () => {
      const point = await nwsPoint(triplet);
      const grid = await nwsGet<{ properties: NwsGridProperties }>(point.gridDataUrl);
      return summarizeForecast(grid.properties, point.timeZone);
    },
  });
}
