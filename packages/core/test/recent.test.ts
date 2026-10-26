import { test } from "node:test";
import assert from "node:assert/strict";
import { latestDepth, stationDepth } from "../src/recent";
import { shiftDate } from "../src/water-year";
import { packReadings, unpackReadings } from "../src/readings";
import { getPlaceholderConditions } from "../src/stations";

const hourly = [
  { datetime: "2026-10-23 18:00", snowDepth: 6, temp: 30 },
  { datetime: "2026-10-24 12:00", snowDepth: 9, temp: 30 },
  { datetime: "2026-10-24 18:00", snowDepth: 13, temp: 30 },
  { datetime: "2026-10-24 19:00", snowDepth: null, temp: 30 },
];

test("latestDepth uses the last reading and the reading exactly 24 hours earlier", () => {
  assert.deepEqual(latestDepth(hourly), { depth: 13, depthAt: "2026-10-24 18:00", change24h: 7 });
});

test("stationDepth prefers whichever source has the newer reading", () => {
  const older = { depth: 9, depthAt: "2026-10-24 12:00", change24h: 3 };
  const newer = { depth: 15, depthAt: "2026-10-24 20:00", change24h: 9 };
  assert.equal(stationDepth(older, hourly)?.depthAt, "2026-10-24 18:00");
  assert.equal(stationDepth(newer, hourly), newer);
  assert.equal(stationDepth(undefined, null), null);
});

test("shiftDate crosses month and leap-day boundaries", () => {
  assert.equal(shiftDate("2026-10-31", 1), "2026-11-01");
  assert.equal(shiftDate("2028-03-01", -1), "2028-02-29");
  assert.equal(shiftDate("2026-10-24 00:00", 1), "2026-10-25");
});

test("packed readings unpack to the same conditions", () => {
  const station = getPlaceholderConditions().find((s) => s.network === "SNOTEL")!;
  const conditions = { ...station, swe: 4.3, sweNormal: 0.8, pctOfNormal: 537, snowDepth: 16, depthChange1d: 3, lastUpdated: "2026-10-26" };
  const unpacked = unpackReadings(packReadings([conditions])).find((s) => s.triplet === station.triplet);
  assert.deepEqual(unpacked, conditions);
});
