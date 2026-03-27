export const formatSwe = (value: number | null): string => {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}″`;
};

export const formatSnowDepth = (value: number | null): string => {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}″`;
};

export const formatTemp = (value: number | null): string => {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}°F`;
};

export const formatElevation = (value: number): string => {
  return `${value.toLocaleString()}′`;
};

export const formatPctOfNormal = (value: number | null): string => {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}%`;
};

export const formatPrecip = (value: number | null): string => {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}″`;
};

export const formatChange = (value: number | null): string => {
  if (value === null || value === undefined) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}″`;
};

export const formatDepthChange = (value: number | null): string => {
  if (value === null || value === undefined) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value}″`;
};

export const formatNumber = (value: number): string => {
  return value.toLocaleString();
};

export const formatPercent = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const formatDateFull = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export function calcDensity(swe: number | null, depth: number | null): number | null {
  if (swe === null || depth === null || depth <= 0) return null;
  if (swe <= 0) return null;
  return (swe / depth) * 100;
}

export const formatDensity = (density: number | null): string => {
  if (density === null) return "—";
  return `${density.toFixed(0)}%`;
};

export type DensityLevel = "light" | "average" | "heavy" | "veryHeavy";

export function getDensityLevel(density: number | null): DensityLevel | null {
  if (density === null) return null;
  if (density < 8) return "light";
  if (density <= 12) return "average";
  if (density <= 18) return "heavy";
  return "veryHeavy";
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getDensityLabel(density: number | null): string {
  if (density === null) return "No Data";
  const level = getDensityLevel(density);
  const labels: Record<DensityLevel, string> = {
    light: "Light / Dry",
    average: "Average",
    heavy: "Heavy / Wet",
    veryHeavy: "Very Heavy",
  };
  return labels[level!];
}