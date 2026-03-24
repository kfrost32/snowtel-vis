import { snowColors } from "./theme";
import type { ConditionLevel, StationCurrentConditions } from "./types";

export function getConditionLevel(pctOfNormal: number | null): ConditionLevel {
  if (pctOfNormal === null) return "nearNormal";
  if (pctOfNormal < 50) return "wellBelow";
  if (pctOfNormal < 75) return "below";
  if (pctOfNormal <= 125) return "nearNormal";
  if (pctOfNormal <= 150) return "above";
  return "wellAbove";
}

export function getConditionColor(pctOfNormal: number | null): string {
  const level = getConditionLevel(pctOfNormal);
  return snowColors[level];
}

export function getConditionLabel(pctOfNormal: number | null): string {
  if (pctOfNormal === null) return "No Data";
  const level = getConditionLevel(pctOfNormal);
  const labels: Record<ConditionLevel, string> = {
    wellBelow: "Well Below Normal",
    below: "Below Normal",
    nearNormal: "Near Normal",
    above: "Above Normal",
    wellAbove: "Well Above Normal",
  };
  return labels[level];
}

export function getMapMarkerColor(pctOfNormal: number | null): string {
  if (pctOfNormal === null) return "#94A3B8";
  if (pctOfNormal < 25) return "#991B1B";
  if (pctOfNormal < 50) return "#DC2626";
  if (pctOfNormal < 75) return "#F59E0B";
  if (pctOfNormal < 90) return "#84CC16";
  if (pctOfNormal <= 110) return "#22C55E";
  if (pctOfNormal <= 125) return "#3B82F6";
  if (pctOfNormal <= 150) return "#2563EB";
  return "#1D4ED8";
}

export function getMetricColor(metric: string, value: number | null): string {
  if (value === null) return "#94A3B8";

  if (metric === "WTEQ") {
    if (value <= 0) return "#CBD5E1";
    if (value < 5) return "#93C5FD";
    if (value < 15) return "#60A5FA";
    if (value < 30) return "#3B82F6";
    if (value < 50) return "#2563EB";
    return "#1D4ED8";
  }

  if (metric === "SNWD") {
    if (value <= 0) return "#CBD5E1";
    if (value < 12) return "#C4B5FD";
    if (value < 36) return "#A78BFA";
    if (value < 72) return "#8B5CF6";
    if (value < 120) return "#7C3AED";
    return "#6D28D9";
  }

  if (metric === "PREC") {
    if (value <= 0) return "#CBD5E1";
    if (value < 10) return "#A5F3FC";
    if (value < 20) return "#67E8F9";
    if (value < 35) return "#22D3EE";
    if (value < 50) return "#06B6D4";
    return "#0891B2";
  }

  if (metric === "TAVG") {
    if (value < 10) return "#1D4ED8";
    if (value < 25) return "#3B82F6";
    if (value < 32) return "#93C5FD";
    if (value < 40) return "#FDE68A";
    if (value < 55) return "#F59E0B";
    if (value < 70) return "#EF4444";
    return "#991B1B";
  }

  return getMapMarkerColor(value);
}

export type MetricKey = "WTEQ" | "SNWD" | "PREC" | "TAVG";

export function getStationMetricValue(
  station: { swe: number | null; snowDepth: number | null; precipAccum: number | null; temp: number | null; pctOfNormal: number | null },
  metric: string
): number | null {
  switch (metric) {
    case "WTEQ": return station.swe;
    case "SNWD": return station.snowDepth;
    case "PREC": return station.precipAccum;
    case "TAVG": return station.temp;
    default: return station.pctOfNormal;
  }
}

export function getDepthChangeColor(v: number | null): string {
  if (v === null) return "#94A3B8";
  if (v >= 6) return "#1D4ED8";
  if (v >= 2) return "#3B82F6";
  if (v > -2) return "#94A3B8";
  if (v > -6) return "#F59E0B";
  return "#DC2626";
}

export function getChangeColor(v: number | null): string {
  if (v === null) return "#94A3B8";
  if (v > 2) return "#1D4ED8";
  if (v > 0.5) return "#3B82F6";
  if (v > -0.5) return "#94A3B8";
  if (v > -2) return "#F59E0B";
  return "#DC2626";
}

export function getMetricMapColor(metric: string, station: StationCurrentConditions): string {
  if (metric === "WTEQ") return getMapMarkerColor(station.pctOfNormal);
  if (metric === "WTEQ_PCT") return getMapMarkerColor(station.pctOfNormal);
  if (metric === "CHANGE_1D") return getChangeColor(station.sweChange1d ?? null);
  if (metric === "CHANGE_3D") return getChangeColor(station.sweChange3d ?? null);
  if (metric === "CHANGE_7D") return getChangeColor(station.sweChange7d ?? null);
  if (metric === "SNWD_CHANGE_1D") return getDepthChangeColor(station.depthChange1d ?? null);
  if (metric === "SNWD_CHANGE_3D") return getDepthChangeColor(station.depthChange3d ?? null);
  if (metric === "SNWD_CHANGE_7D") return getDepthChangeColor(station.depthChange7d ?? null);
  return getMetricColor(metric, getStationMetricValue(station, metric));
}
