import { test } from "node:test";
import assert from "node:assert/strict";
import { lastStorm } from "../src/storm";
import type { HourlyObservation } from "../src/types";

function series(start: string, rows: [number | null, number | null][]): HourlyObservation[] {
  const t0 = Date.parse(start.replace(" ", "T") + ":00Z");
  return rows.map(([snowDepth, swe], i) => ({
    datetime: new Date(t0 + i * 3600_000).toISOString().slice(0, 16).replace("T", " "),
    snowDepth,
    swe,
    temp: 30,
  }));
}

const flat = (hours: number, depth: number, swe: number) => Array.from({ length: hours }, () => [depth, swe] as [number, number]);

test("measures a storm that pauses mid-way as one storm", () => {
  const rows = [
    ...flat(12, 6, 2.7),
    ...flat(6, 8, 2.9),
    ...flat(4, 12, 3.6),
    ...flat(2, 13, 3.8),
  ];
  const storm = lastStorm(series("2026-10-23 12:00", rows));
  assert.ok(storm);
  assert.equal(storm.newSnow, 7);
  assert.equal(storm.swe, 1.1);
  assert.equal(storm.quality, "heavy");
  assert.equal(Math.round(storm.ratio!), 6);
  assert.equal(storm.inProgress, true);
});

test("ignores depth jitter that adds no water", () => {
  const rows = Array.from({ length: 48 }, (_, i) => [i % 5 === 0 ? 9 : 7, 2.0] as [number, number]);
  assert.equal(lastStorm(series("2026-10-20 00:00", rows)), null);
});

test("returns the most recent of two storms and marks it ended", () => {
  const rows = [
    ...flat(6, 10, 3.0),
    ...flat(6, 16, 3.4),
    ...flat(30, 15, 3.4),
    ...flat(6, 19, 3.8),
    ...flat(12, 18, 3.8),
  ];
  const storm = lastStorm(series("2026-10-20 00:00", rows));
  assert.ok(storm);
  assert.equal(storm.newSnow, 4);
  assert.equal(storm.inProgress, false);
});

test("rates light, dry snow by its ratio", () => {
  const storm = lastStorm(series("2026-10-20 00:00", [...flat(6, 20, 5.0), ...flat(6, 30, 5.5), ...flat(12, 30, 5.5)]));
  assert.ok(storm);
  assert.equal(storm.quality, "light");
});
