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
