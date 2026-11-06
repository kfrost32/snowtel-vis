import { test } from "node:test";
import assert from "node:assert/strict";
import { getStation } from "@snotel/core/stations";
import type { StationCurrentConditions } from "@snotel/core/types";
import { stationSummary } from "../lib/station-share";

const station = getStation("669:CO:SNTL")!;
const conditions = (values: Partial<StationCurrentConditions>) =>
  ({ snowDepth: null, depthChange1d: null, swe: null, pctOfNormal: null, lastUpdated: "2026-11-05", ...values }) as StationCurrentConditions;
const summary = (values: Partial<StationCurrentConditions>, newSnow?: number) =>
  stationSummary({ station, conditions: conditions(values), storm: newSnow ? ({ newSnow } as never) : null });

test("reads conditions as a sentence", () => {
  const text = summary({ snowDepth: 5, depthChange1d: -1, swe: 1.2, pctOfNormal: 133 }, 8);
  assert.match(text, /^North Lost Trail \(SNOTEL, .+\) in Colorado has 5″ of snow on the ground, down 1″ in 24 hours, and 1\.2″ of snow water equivalent \(133% of median\) as of .+\. The latest storm added 8″\.$/);
});

test("handles missing and zero readings", () => {
  assert.match(summary({ snowDepth: 0, swe: 0.2 }), /has no snow on the ground and 0\.2″ of snow water equivalent as of/);
  assert.match(summary({ swe: 1.2, pctOfNormal: 90 }), /has 1\.2″ of snow water equivalent \(90% of median\) as of/);
  assert.match(summary({ snowDepth: 12, depthChange1d: 3 }), /has 12″ of snow on the ground, up 3″ in 24 hours as of/);
  assert.match(summary({}), /has no current snow readings\.$/);
  assert.match(stationSummary({ station, conditions: null, storm: null }), /has no current snow readings\.$/);
});
