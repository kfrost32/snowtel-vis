import { getAllStations, hasNwsForecast } from "@snotel/core/stations";
import { forecastWindowTotals, type ForecastTotals } from "@snotel/core/forecast";
import { fetchNwsForecast, fetchNwsPoint, POINT_MAX_AGE_MS, type NwsPoint } from "../apps/web/lib/nws";
import { readSnapshots, snapshotKeys, snapshotStoreConfigured, writeSnapshots, type Snapshot } from "../apps/web/lib/snapshot-store";

const CONCURRENCY = 6;
const ATTEMPTS = 2;
const MIN_COVERAGE = 0.5;

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (e) {
      if (attempt >= ATTEMPTS) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

async function main() {
  if (!snapshotStoreConfigured) throw new Error("Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL and KV_REST_API_TOKEN)");
  const started = Date.now();
  const stations = getAllStations().filter(hasNwsForecast);
  const totals: ForecastTotals["stations"] = {};
  const perStation: Record<string, Snapshot<unknown>> = {};
  const savedPoints = await readSnapshots<NwsPoint>(stations.map((s) => snapshotKeys.nwsPoint(s.triplet)));
  const points = new Map(
    stations.flatMap((s, i) => {
      const saved = savedPoints[i];
      return saved && Date.now() - saved.fetchedAt < POINT_MAX_AGE_MS ? [[s.triplet, saved.data] as const] : [];
    })
  );
  let updated = "";
  let failures = 0;
  let next = 0;

  const worker = async () => {
    while (next < stations.length) {
      const station = stations[next++];
      try {
        let point = points.get(station.triplet);
        if (!point) {
          point = await withRetry(() => fetchNwsPoint(station));
          perStation[snapshotKeys.nwsPoint(station.triplet)] = { data: point, fetchedAt: Date.now() };
        }
        const nwsPoint = point;
        const forecast = await withRetry(() => fetchNwsForecast(nwsPoint));
        totals[station.triplet] = forecastWindowTotals(forecast);
        perStation[snapshotKeys.forecast(station.triplet)] = { data: forecast, fetchedAt: Date.now() };
        if (forecast.updated > updated) updated = forecast.updated;
      } catch (e) {
        failures++;
        console.error(`${station.triplet}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const count = Object.keys(totals).length;
  if (count < stations.length * MIN_COVERAGE) throw new Error(`Only ${count}/${stations.length} forecasts fetched; keeping previous snapshot`);

  const entries = Object.entries(perStation);
  for (let i = 0; i < entries.length; i += 100) await writeSnapshots(Object.fromEntries(entries.slice(i, i + 100)));
  await writeSnapshots({ [snapshotKeys.forecasts]: { data: { updated, stations: totals } satisfies ForecastTotals, fetchedAt: Date.now() } });
  console.log(`Forecasts: ${count}/${stations.length} saved, ${failures} failed (${Math.round((Date.now() - started) / 1000)}s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
