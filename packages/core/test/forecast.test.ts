import { test } from "node:test";
import assert from "node:assert/strict";
import { forecastTotal, summarizeForecast } from "../src/forecast";

const grid = {
  updateTime: "2026-10-26T12:00:00+00:00",
  elevation: { value: 3528 },
  snowfallAmount: {
    values: [
      { validTime: "2026-10-31T04:00:00+00:00/PT6H", value: 60.96 },
      { validTime: "2026-10-31T18:00:00+00:00/PT6H", value: 25.4 },
    ],
  },
  probabilityOfPrecipitation: { values: [{ validTime: "2026-10-31T04:00:00+00:00/PT6H", value: 80 }] },
  snowLevel: { values: [{ validTime: "2026-10-31T04:00:00+00:00/PT6H", value: 2900 }] },
  temperature: { values: [{ validTime: "2026-10-31T04:00:00+00:00/PT1H", value: 0 }] },
};

test("splits an interval that crosses local midnight across both days", () => {
  const forecast = summarizeForecast(grid, "America/Denver", new Date("2026-10-26T18:00:00Z"));
  const byDate = Object.fromEntries(forecast.days.map((d) => [d.date, d]));
  assert.equal(byDate["2026-10-30"].snow, 0.8);
  assert.equal(byDate["2026-10-31"].snow, 2.6);
  assert.equal(forecastTotal(forecast), 3.4);
  assert.equal(forecast.gridElevation, 11575);
  assert.equal(byDate["2026-10-30"].high, 32);
});
