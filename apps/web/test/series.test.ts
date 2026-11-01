import { test } from "node:test";
import assert from "node:assert/strict";
import { accumulationChanges } from "../lib/series";

test("precip windows end at the latest reported value", () => {
  const dates = ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"];
  assert.deepEqual(accumulationChanges([1.0, 1.2, 1.5, null], dates), { precipChange1d: 0.3, precipChange3d: null, precipChange7d: null });
});

test("precip windows skip readings from before the Oct 1 reset", () => {
  const dates = ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
  assert.deepEqual(accumulationChanges([26.1, 26.3, 26.3, 0, 0.4, 0.9], dates), { precipChange1d: 0.5, precipChange3d: null, precipChange7d: null });
});
