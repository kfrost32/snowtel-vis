import type { HourlyObservation } from "./types";
import { formatHourlyTime } from "./formatting";
import { snowColors } from "./theme";

const MIN_NEW_SNOW = 2;
const STORM_START_RISE = 1;
const STORM_GAP_MS = 12 * 60 * 60 * 1000;
const SWE_LAG_MS = 6 * 60 * 60 * 1000;
const IN_PROGRESS_MS = 3 * 60 * 60 * 1000;
const MIN_STORM_SWE = 0.1;
const RATIO_MIN_SNOW = 3;
const RATIO_MIN_SWE = 0.3;
const MAX_RATIO = 30;
const HEAVY_BELOW = 9;
const LIGHT_FROM = 15;

export type SnowQuality = "light" | "average" | "heavy";

export interface StormSummary {
  newSnow: number;
  swe: number | null;
  ratio: number | null;
  quality: SnowQuality | null;
  start: string;
  end: string;
  inProgress: boolean;
}

interface Reading {
  datetime: string;
  time: number;
  depth: number;
  swe: number | null;
}

interface Storm {
  start: number;
  peak: number;
  base: number;
  top: number;
}

function toTime(datetime: string): number {
  return Date.parse(datetime.replace(" ", "T") + ":00Z");
}

function smooth(values: number[]): number[] {
  return values.map((_, i) => {
    const window = values.slice(Math.max(0, i - 1), i + 2).sort((a, b) => a - b);
    return window[Math.floor(window.length / 2)];
  });
}

function sweGain(readings: Reading[], storm: Storm): number | null {
  const before = readings.slice(Math.max(0, storm.start - 2), storm.start + 1).flatMap((r) => (r.swe === null ? [] : [r.swe]));
  const lagEnd = readings[storm.peak].time + SWE_LAG_MS;
  const after = readings.slice(storm.peak).filter((r) => r.time <= lagEnd).flatMap((r) => (r.swe === null ? [] : [r.swe]));
  if (!before.length || !after.length) return null;
  const gain = Math.round((Math.max(...after) - Math.min(...before)) * 10) / 10;
  return gain >= 0 ? gain : null;
}

function qualityFor(ratio: number): SnowQuality {
  if (ratio < HEAVY_BELOW) return "heavy";
  return ratio < LIGHT_FROM ? "average" : "light";
}

export function lastStorm(observations: HourlyObservation[]): StormSummary | null {
  const readings: Reading[] = observations.flatMap((o) =>
    o.snowDepth === null ? [] : [{ datetime: o.datetime, time: toTime(o.datetime), depth: o.snowDepth, swe: o.swe ?? null }]
  );
  if (readings.length < 3) return null;
  const depth = smooth(readings.map((r) => r.depth));

  const storms: Storm[] = [];
  let open: Storm | null = null;
  let low = 0;
  for (let i = 1; i < readings.length; i++) {
    if (open) {
      if (depth[i] > open.top) {
        open.peak = i;
        open.top = depth[i];
      } else if (readings[i].time - readings[open.peak].time > STORM_GAP_MS) {
        storms.push(open);
        open = null;
        low = i;
      }
      continue;
    }
    if (depth[i] <= depth[low]) low = i;
    else if (depth[i] - depth[low] >= STORM_START_RISE) open = { start: low, peak: i, base: depth[low], top: depth[i] };
  }
  if (open) storms.push(open);

  for (const storm of storms.reverse()) {
    const newSnow = Math.round(storm.top - storm.base);
    const swe = sweGain(readings, storm);
    if (newSnow < MIN_NEW_SNOW || (swe !== null && swe < MIN_STORM_SWE)) continue;
    const raw = swe !== null && newSnow >= RATIO_MIN_SNOW && swe >= RATIO_MIN_SWE ? newSnow / swe : null;
    const ratio = raw !== null && raw <= MAX_RATIO ? raw : null;
    return {
      newSnow,
      swe,
      ratio,
      quality: ratio !== null ? qualityFor(ratio) : null,
      start: readings[storm.start].datetime,
      end: readings[storm.peak].datetime,
      inProgress: storm === open && readings[readings.length - 1].time - readings[storm.peak].time <= IN_PROGRESS_MS,
    };
  }
  return null;
}

export const SNOW_QUALITY: Record<SnowQuality, { label: string; color: string }> = {
  light: { label: "Light & dry", color: snowColors.lightSnow },
  average: { label: "Average density", color: snowColors.averageSnow },
  heavy: { label: "Heavy & wet", color: snowColors.heavySnow },
};

export function stormTiming(storm: StormSummary): string {
  const start = formatHourlyTime(storm.start);
  return storm.inProgress ? `Started ${start} · still building` : `${start} – ${formatHourlyTime(storm.end)}`;
}
