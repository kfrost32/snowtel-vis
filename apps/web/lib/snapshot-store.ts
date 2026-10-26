import { Redis } from "@upstash/redis";

export interface Snapshot<T> {
  data: T;
  fetchedAt: number;
}

const PREFIX = "snotel:v1:";

export const snapshotKeys = {
  stations: "stations",
  recent: "recent",
  season: (triplet: string) => `season:${triplet}`,
  hourly: (triplet: string) => `hourly:${triplet}`,
  basinSeason: (huc: string) => `basin-season:${huc}`,
  nwsPoint: (triplet: string) => `nws-point:${triplet}`,
  forecast: (triplet: string) => `forecast:${triplet}`,
};

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export const snapshotStoreConfigured = redis !== null;

export async function readSnapshot<T>(key: string): Promise<Snapshot<T> | null> {
  if (!redis) return null;
  try {
    return await redis.get<Snapshot<T>>(PREFIX + key);
  } catch (e) {
    console.error(`Snapshot read failed for ${key}:`, (e as Error).message);
    return null;
  }
}

export async function writeSnapshots(entries: Record<string, Snapshot<unknown>>): Promise<void> {
  if (!redis) return;
  await redis.mset(Object.fromEntries(Object.entries(entries).map(([key, value]) => [PREFIX + key, value])));
}
