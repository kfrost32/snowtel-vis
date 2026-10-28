import { test } from "node:test";
import assert from "node:assert/strict";
import { describePace, stationPace } from "../src/pace";
import type { StationEnvelope } from "../src/types";

const PEAK_DAY = 180;
const AS_OF = "2027-01-08";

function envelope(median: (wyDay: number) => number | null = (d) => (d <= 30 ? 0 : (d - 30) * 0.2)): StationEnvelope {
  return {
    envelope: Array.from({ length: 365 }, (_, i) => ({ wyDay: i + 1, median: median(i + 1), max: null, min: null })),
    medianPeakDay: PEAK_DAY,
    medianPeakRow: PEAK_DAY,
    medianPeakSwe: 30,
    depthEnvelope: [],
    medianPeakDepthDay: 0,
    medianPeakDepth: 0,
  };
}

const days = (pace: ReturnType<typeof stationPace>) => pace && { tone: pace.tone, weeks: pace.weeks, date: pace.date };

test("matches today's SWE to the day a median year reaches it", () => {
  assert.deepEqual(days(stationPace(envelope(), AS_OF, 100, 14)), { tone: "even", weeks: 0, date: AS_OF });
  assert.deepEqual(days(stationPace(envelope(), AS_OF, 100, 10)), { tone: "behind", weeks: 3, date: "2026-12-19" });
  assert.deepEqual(days(stationPace(envelope(), AS_OF, 100, 18)), { tone: "ahead", weeks: 3, date: "2027-01-28" });
});

test("is on pace while the median is still flat at today's level, including small negative readings", () => {
  assert.equal(stationPace(envelope(), AS_OF, 20, 0)?.tone, "even");
  assert.equal(stationPace(envelope(), AS_OF, 20, -0.3)?.tone, "even");
  assert.deepEqual(days(stationPace(envelope(), AS_OF, 60, 0)), { tone: "behind", weeks: 4, date: "2026-12-09" });
});

test("flags SWE above a median year's peak and dates the peak", () => {
  assert.deepEqual(stationPace(envelope(), AS_OF, 100, 40), { tone: "ahead", weeks: 0, date: "2027-03-29", abovePeak: true });
});

test("has no pace without a reading or medians", () => {
  assert.equal(stationPace(envelope(), AS_OF, 100, null), null);
  assert.equal(stationPace(envelope(() => null), AS_OF, 100, 5), null);
});

test("describes pace in plain words with the part of the month", () => {
  const pace = (tone: "ahead" | "behind" | "even", weeks: number, date: string, abovePeak = false) => ({ tone, weeks, date, abovePeak });
  assert.deepEqual(describePace("Test Site", pace("even", 0, AS_OF)), { headline: "Right around normal", detail: "Test Site has about the usual amount of snow for this time of year." });
  assert.deepEqual(describePace("Test Site", pace("behind", 3, "2026-12-26")), { headline: "About 3 weeks behind normal", detail: "Test Site has about as much snow as a typical late December." });
  assert.deepEqual(describePace("Test Site", pace("ahead", 1, "2027-01-16")), { headline: "About 1 week ahead of normal", detail: "Test Site usually doesn't have this much snow until mid-January." });
  assert.deepEqual(describePace("Test Site", pace("ahead", 0, "2027-04-05", true)), { headline: "Already above a typical peak", detail: "Test Site has more snow than it usually does at its early-April peak." });
});
