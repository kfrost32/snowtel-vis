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

export const formatDistance = (miles: number): string =>
  `${miles < 10 ? miles.toFixed(1) : Math.round(miles).toLocaleString()} mi`;

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

export const formatWeekday = (datetime: string): string =>
  new Date(datetime.replace(" ", "T")).toLocaleDateString("en-US", { weekday: "short" });

function readingDay(dateStr: string): Date {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() - 1);
  return date;
}

export const formatReadingDate = (dateStr: string): string => {
  const label = readingDay(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${label}, end of day`;
};

export const formatReadingDateShort = (dateStr: string): string =>
  readingDay(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const formatReadingEndOfDay = (dateStr: string): string => {
  const day = readingDay(dateStr);
  return `${day.getMonth() + 1}/${day.getDate()} end of day`;
};

export function formatHourlyTime(datetime: string, now = new Date()): string {
  const date = new Date(datetime.replace(" ", "T"));
  const time = date.toLocaleTimeString("en-US", { hour: "numeric" });
  if (date.toDateString() === now.toDateString()) return time;
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}

export const formatHour = (datetime: string): string =>
  new Date(datetime.replace(" ", "T")).toLocaleString("en-US", { weekday: "short", hour: "numeric" });

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

