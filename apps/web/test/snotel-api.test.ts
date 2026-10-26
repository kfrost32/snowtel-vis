import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { fetchDailyData } from "../lib/snotel-api";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("REST daily values are re-dated to the SOAP convention", async () => {
  let requested: URL | null = null;
  globalThis.fetch = (async (input: string | URL) => {
    requested = new URL(input.toString());
    return new Response(
      JSON.stringify([
        {
          stationTriplet: "713:CO:SNTL",
          data: [
            {
              stationElement: { elementCode: "WTEQ" },
              values: [
                { date: "2026-10-21", value: 2.0, median: 0.4 },
                { date: "2026-10-22", value: 2.8, median: 0.4 },
                { date: "2026-10-23", value: 2.7, median: 0.6 },
              ],
            },
          ],
        },
      ])
    );
  }) as typeof fetch;

  const series = (await fetchDailyData(["713:CO:SNTL"], ["WTEQ"], "2026-10-22", "2026-10-24", { median: true })).get("713:CO:SNTL")!.WTEQ!;

  assert.equal(requested!.searchParams.get("beginDate"), "2026-10-21");
  assert.equal(requested!.searchParams.get("endDate"), "2026-10-23");
  assert.deepEqual(series.dates, ["2026-10-22", "2026-10-23", "2026-10-24"]);
  assert.deepEqual(series.values, [2.0, 2.8, 2.7]);
  assert.deepEqual(series.medians, [0.4, 0.4, 0.6]);
});

test("a station NRCS cannot serve does not sink the rest of its batch", async () => {
  globalThis.fetch = (async (input: string | URL) => {
    const triplets = new URL(input.toString()).searchParams.get("stationTriplets")!.split(",");
    if (triplets.includes("2:CO:SNTL")) return new Response("{}", { status: 500 });
    return new Response(
      JSON.stringify(triplets.map((t) => ({ stationTriplet: t, data: [{ stationElement: { elementCode: "WTEQ" }, values: [{ date: "2026-10-23", value: 1 }] }] })))
    );
  }) as typeof fetch;

  const data = await fetchDailyData(["1:CO:SNTL", "2:CO:SNTL", "3:CO:SNTL", "4:CO:SNTL"], ["WTEQ"], "2026-10-24", "2026-10-24", { batchSize: 2 });
  assert.deepEqual([...data.keys()].sort(), ["1:CO:SNTL", "3:CO:SNTL", "4:CO:SNTL"]);
});
