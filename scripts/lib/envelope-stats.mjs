import fs from "fs";
import path from "path";

export const DAYS = 366;
const PERCENTILES = [10, 30, 70, 90];

const DAY_MS = 86400000;
const CALENDAR_START = Date.UTC(1999, 9, 1);

export function waterYear(dateStr) {
  return Number(dateStr.slice(0, 4)) + (Number(dateStr.slice(5, 7)) >= 10 ? 1 : 0);
}

export const lastCompleteWaterYear = waterYear(new Date().toISOString()) - 1;

export function calendarRow(dateStr) {
  const month = Number(dateStr.slice(5, 7));
  const day = Number(dateStr.slice(8, 10));
  return Math.round((Date.UTC(month >= 10 ? 1999 : 2000, month - 1, day) - CALENDAR_START) / DAY_MS);
}

function rowDate(row, wy) {
  const monthDay = new Date(CALENDAR_START + row * DAY_MS).toISOString().slice(5, 10);
  return `${Number(monthDay.slice(0, 2)) >= 10 ? wy - 1 : wy}-${monthDay}`;
}

export const round = (v) => (v === null || Number.isNaN(v) ? null : Math.round(v * 10) / 10);

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function medianPeak(yearArrays) {
  const values = [];
  const rows = [];
  for (const arr of yearArrays) {
    let max = 0, last = -1;
    arr.forEach((v, d) => {
      if (v > 0 && v >= max) { max = v; last = d; }
    });
    if (last === -1) continue;
    values.push(max);
    rows.push(last + 1);
  }
  return { peakDay: rows.length ? Math.round(median(rows)) : 1, peak: round(median(values)) ?? 0 };
}

export function buildSeries(byYear, medianValues, minValue, yearArrays) {
  const out = { median: [], max: [], min: [], maxYear: [], minYear: [], ...medianPeak(yearArrays) };
  for (const p of PERCENTILES) out[`p${p}`] = [];
  for (let d = 0; d < DAYS; d++) {
    const medianValue = d < medianValues.length ? medianValues[d] : null;
    let max = null, min = null, maxYear = null, minYear = null;
    const values = [];
    for (const [wy, v] of byYear(d)) {
      if (Number.isNaN(v) || v < minValue) continue;
      values.push(v);
      if (max === null || v > max) { max = v; maxYear = wy; }
      if (min === null || v < min) { min = v; minYear = wy; }
    }
    out.median.push(round(medianValue));
    out.max.push(round(max));
    out.min.push(round(min));
    out.maxYear.push(maxYear);
    out.minYear.push(minYear);
    values.sort((a, b) => a - b);
    for (const p of PERCENTILES) out[`p${p}`].push(round(percentile(values, p)));
  }
  return out;
}

export function yearlyPeaks(years) {
  const peaks = [];
  for (const [wy, arr] of [...years].sort((a, b) => a[0] - b[0])) {
    let peakSwe = 0, peakDay = -1;
    arr.forEach((v, d) => {
      if (v > peakSwe) { peakSwe = v; peakDay = d; }
    });
    if (peakDay === -1) continue;
    const peakSweDate = rowDate(peakDay, wy);
    peaks.push({ waterYear: wy, peakSwe: round(peakSwe), peakSweDate });
  }
  return peaks;
}

export function writeYears(outputDir, generated, dir, id, entries, minValue) {
  const years = {};
  for (const [wy, values] of entries) {
    const rounded = Array.from(values, (v) => (Number.isNaN(v) || v < minValue ? null : round(v)));
    if (rounded.some((v) => v !== null)) years[wy] = rounded;
  }
  fs.writeFileSync(path.join(outputDir, "years", dir, `${id}.json`), JSON.stringify({ generated, years }));
}
