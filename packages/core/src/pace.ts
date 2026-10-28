import type { StationEnvelope } from "./types";
import { snowColors } from "./theme";
import { shiftDate } from "./water-year";

export type PaceTone = "ahead" | "behind" | "even";

export interface Pace {
  tone: PaceTone;
  weeks: number;
  date: string;
  abovePeak: boolean;
}

export const PACE_COLORS: Record<PaceTone, string> = {
  ahead: snowColors.above,
  behind: snowColors.below,
  even: snowColors.nearNormal,
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface CurvePoint {
  wyDay: number;
  level: number;
}

const risingCurves = new WeakMap<StationEnvelope, CurvePoint[]>();

function risingCurve(envelope: StationEnvelope): CurvePoint[] {
  let curve = risingCurves.get(envelope);
  if (!curve) {
    curve = [];
    for (const day of envelope.envelope) {
      if (day.wyDay > envelope.medianPeakDay) break;
      if (day.median !== null) curve.push({ wyDay: day.wyDay, level: Math.max(day.median, curve.at(-1)?.level ?? 0) });
    }
    risingCurves.set(envelope, curve);
  }
  return curve;
}

export function stationPace(envelope: StationEnvelope, asOf: string, wyDay: number, swe: number | null): Pace | null {
  const curve = risingCurve(envelope);
  if (swe === null || !curve.length) return null;
  if (swe > curve.at(-1)!.level) {
    return { tone: "ahead", weeks: 0, date: shiftDate(asOf, envelope.medianPeakDay - wyDay), abovePeak: true };
  }
  const target = Math.max(swe, curve[0].level);
  let first: number | null = null;
  let last = curve[0].wyDay;
  for (const point of curve) {
    if (point.level > target && first !== null) break;
    if (first === null && point.level >= target) first = point.wyDay;
    if (point.level <= target) last = point.wyDay;
  }
  const match = Math.min(Math.max(wyDay, first!), Math.max(first!, last));
  const days = match - wyDay;
  const weeks = Math.round(Math.abs(days) / 7);
  return { tone: weeks === 0 ? "even" : days > 0 ? "ahead" : "behind", weeks, date: shiftDate(asOf, days), abovePeak: false };
}

function partOfMonth(date: string): string {
  const day = new Date(`${date}T00:00:00`);
  day.setDate(day.getDate() - 1);
  const month = MONTHS[day.getMonth()];
  return day.getDate() <= 10 ? `early ${month}` : day.getDate() <= 20 ? `mid-${month}` : `late ${month}`;
}

export function describePace(name: string, pace: Pace): { headline: string; detail: string } {
  if (pace.abovePeak) {
    return { headline: "Already above a typical peak", detail: `${name} has more snow than it usually does at its ${partOfMonth(pace.date).replace(" ", "-")} peak.` };
  }
  if (pace.tone === "even") {
    return { headline: "Right around normal", detail: `${name} has about the usual amount of snow for this time of year.` };
  }
  const weeks = `${pace.weeks} ${pace.weeks === 1 ? "week" : "weeks"}`;
  return pace.tone === "ahead"
    ? { headline: `About ${weeks} ahead of normal`, detail: `${name} usually doesn't have this much snow until ${partOfMonth(pace.date)}.` }
    : { headline: `About ${weeks} behind normal`, detail: `${name} has about as much snow as a typical ${partOfMonth(pace.date)}.` };
}
