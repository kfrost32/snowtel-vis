import { snowColors } from "./theme";
import type { ConditionLevel } from "./types";

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
