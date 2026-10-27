import { getAllStations, hasLiveReadings } from "@snotel/core/stations";
import type { StationCurrentConditions, StationSeasonData } from "@snotel/core/types";
import { fetchStationConditions, mergeConditions } from "../apps/web/lib/station-conditions";
import { fetchStationSeasons } from "../apps/web/lib/station-season";
import { fetchBcSeasons } from "../apps/web/lib/bc-snow";
import { averageSeason, basinMembers } from "../apps/web/lib/basin-season";
import { readSnapshot, snapshotKeys, snapshotStoreConfigured, writeSnapshots, type Snapshot } from "../apps/web/lib/snapshot-store";

const STATIONS_PER_CHUNK = 200;
const BATCH_SIZE = 40;
const TIMEOUT_MS = 120000;
const WRITES_PER_CALL = 100;
const MIN_BASIN_COVERAGE = 0.9;

async function writeAll(entries: [string, unknown][]): Promise<void> {
  const fetchedAt = Date.now();
  for (let i = 0; i < entries.length; i += WRITES_PER_CALL) {
    const chunk = entries.slice(i, i + WRITES_PER_CALL);
    await writeSnapshots(Object.fromEntries(chunk.map(([key, data]): [string, Snapshot<unknown>] => [key, { data, fetchedAt }])));
  }
}

async function refreshStationList(): Promise<void> {
  const started = Date.now();
  const previous = await readSnapshot<StationCurrentConditions[]>(snapshotKeys.stations);
  const stations = mergeConditions(await fetchStationConditions(), previous?.data ?? null);
  await writeAll([[snapshotKeys.stations, stations]]);
  const live = stations.filter(hasLiveReadings);
  console.log(`Station list: ${live.filter((s) => s.swe !== null).length}/${live.length} reporting SWE (${Math.round((Date.now() - started) / 1000)}s)`);
}

async function refreshSeasons(): Promise<Map<string, StationSeasonData>> {
  const triplets = getAllStations().filter((s) => s.network === "SNOTEL").map((s) => s.triplet);
  const seasons = new Map<string, StationSeasonData>();
  for (let i = 0; i < triplets.length; i += STATIONS_PER_CHUNK) {
    const started = Date.now();
    const chunk = triplets.slice(i, i + STATIONS_PER_CHUNK);
    try {
      const fetched = await fetchStationSeasons(chunk, { timeout: TIMEOUT_MS, batchSize: BATCH_SIZE });
      await writeAll([...fetched].map(([triplet, season]) => [snapshotKeys.season(triplet), season]));
      for (const [triplet, season] of fetched) seasons.set(triplet, season);
      console.log(`Seasons ${i + 1}-${i + chunk.length}: ${fetched.size} saved (${Math.round((Date.now() - started) / 1000)}s)`);
    } catch (e) {
      console.error(`Seasons ${i + 1}-${i + chunk.length} failed, keeping previous snapshots:`, (e as Error).message);
    }
  }
  try {
    const bc = await fetchBcSeasons();
    await writeAll([...bc].map(([triplet, season]) => [snapshotKeys.season(triplet), season]));
    console.log(`BC seasons: ${bc.size} saved`);
  } catch (e) {
    console.error("BC seasons failed, keeping previous snapshots:", (e as Error).message);
  }
  return seasons;
}

async function refreshBasins(seasons: Map<string, StationSeasonData>): Promise<void> {
  const entries: [string, unknown][] = [];
  for (const [huc, triplets] of basinMembers()) {
    const available = triplets.flatMap((t) => {
      const season = seasons.get(t)?.season;
      return season ? [season] : [];
    });
    if (available.length < triplets.length * MIN_BASIN_COVERAGE) continue;
    entries.push([snapshotKeys.basinSeason(huc), averageSeason(available)]);
  }
  await writeAll(entries);
  console.log(`Regions: ${entries.length} saved`);
}

async function main() {
  if (!snapshotStoreConfigured) {
    throw new Error("Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL and KV_REST_API_TOKEN)");
  }
  let failed = false;
  try {
    await refreshStationList();
  } catch (e) {
    failed = true;
    console.error("Station list failed, keeping previous snapshot:", (e as Error).message);
  }
  const seasons = await refreshSeasons();
  if (seasons.size === 0) failed = true;
  await refreshBasins(seasons);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
