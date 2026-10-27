import { getStation } from "@snotel/core/stations";
import { summarizeForecast, type NwsGridProperties, type StationForecast } from "@snotel/core/forecast";
import type { Station } from "@snotel/core/types";
import { getSnapshot } from "./snapshot-cache";
import { SITE_NAME, SITE_URL } from "./site";
import { readSnapshot, snapshotKeys, writeSnapshots } from "./snapshot-store";

const NWS_URL = "https://api.weather.gov";
const USER_AGENT = `${SITE_NAME} (${SITE_URL})`;
const TIMEOUT_MS = 10000;
export const POINT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const FORECAST_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export interface NwsPoint {
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

export async function fetchNwsPoint(station: Station): Promise<NwsPoint> {
  const point = await nwsGet<{ properties: { forecastGridData: string; timeZone: string } }>(
    `${NWS_URL}/points/${station.latitude.toFixed(4)},${station.longitude.toFixed(4)}`
  );
  return { gridDataUrl: point.properties.forecastGridData, timeZone: point.properties.timeZone };
}

export async function fetchNwsForecast(point: NwsPoint): Promise<StationForecast> {
  const grid = await nwsGet<{ properties: NwsGridProperties }>(point.gridDataUrl);
  return summarizeForecast(grid.properties, point.timeZone);
}

export async function cachedNwsPoint(station: Station): Promise<NwsPoint> {
  const key = snapshotKeys.nwsPoint(station.triplet);
  const saved = await readSnapshot<NwsPoint>(key);
  if (saved && Date.now() - saved.fetchedAt < POINT_MAX_AGE_MS) return saved.data;
  const point = await fetchNwsPoint(station);
  await writeSnapshots({ [key]: { data: point, fetchedAt: Date.now() } }).catch(() => {});
  return point;
}

export function getStationForecast(triplet: string) {
  return getSnapshot<StationForecast>({
    key: snapshotKeys.forecast(triplet),
    maxAge: FORECAST_MAX_AGE_MS,
    load: async () => {
      const station = getStation(triplet);
      if (!station) throw new Error(`Unknown station ${triplet}`);
      return fetchNwsForecast(await cachedNwsPoint(station));
    },
  });
}
