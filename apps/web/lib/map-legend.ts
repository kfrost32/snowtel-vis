export interface LegendItem {
  label: string;
  color: string;
}

const PCT_LEGEND: LegendItem[] = [
  { label: "<50%", color: "#DC2626" },
  { label: "50–75%", color: "#F59E0B" },
  { label: "75–110%", color: "#22C55E" },
  { label: "110–150%", color: "#3B82F6" },
  { label: ">150%", color: "#1D4ED8" },
];

const CHANGE_LEGEND: LegendItem[] = [
  { label: "−2″+", color: "#DC2626" },
  { label: "−0.5″", color: "#F59E0B" },
  { label: "0", color: "#94A3B8" },
  { label: "+0.5″", color: "#3B82F6" },
  { label: "+2″+", color: "#1D4ED8" },
];

const DEPTH_CHANGE_LEGEND: LegendItem[] = [
  { label: "−6″+", color: "#DC2626" },
  { label: "−2″", color: "#F59E0B" },
  { label: "0", color: "#94A3B8" },
  { label: "+2″", color: "#3B82F6" },
  { label: "+6″+", color: "#1D4ED8" },
];

const METRIC_LABELS: Record<string, string> = {
  WTEQ: "SWE",
  WTEQ_PCT: "% of Median",
  CHANGE_1D: "1-Day Change",
  CHANGE_3D: "3-Day Change",
  CHANGE_7D: "7-Day Change",
  SNWD_CHANGE_1D: "Snow Depth 1-Day Δ",
  SNWD_CHANGE_3D: "Snow Depth 3-Day Δ",
  SNWD_CHANGE_7D: "Snow Depth 7-Day Δ",
  SNWD: "Snow Depth",
  PREC: "Season Precip",
  TAVG: "Temperature",
};

const LEGEND_TITLES: Record<string, string> = {
  WTEQ: "SWE, % of median",
  WTEQ_PCT: "SWE, % of median",
};

const METRIC_LEGEND: Record<string, LegendItem[]> = {
  WTEQ: PCT_LEGEND,
  WTEQ_PCT: PCT_LEGEND,
  CHANGE_1D: CHANGE_LEGEND,
  CHANGE_3D: CHANGE_LEGEND,
  CHANGE_7D: CHANGE_LEGEND,
  SNWD: [
    { label: '0"', color: "#CBD5E1" },
    { label: "1'", color: "#C4B5FD" },
    { label: "3'", color: "#A78BFA" },
    { label: "6'", color: "#8B5CF6" },
    { label: "10'+", color: "#6D28D9" },
  ],
  PREC: [
    { label: '0"', color: "#CBD5E1" },
    { label: '10"', color: "#A5F3FC" },
    { label: '20"', color: "#67E8F9" },
    { label: '35"', color: "#22D3EE" },
    { label: '50"+', color: "#0891B2" },
  ],
  SNWD_CHANGE_1D: DEPTH_CHANGE_LEGEND,
  SNWD_CHANGE_3D: DEPTH_CHANGE_LEGEND,
  SNWD_CHANGE_7D: DEPTH_CHANGE_LEGEND,
  TAVG: [
    { label: "<10°", color: "#1D4ED8" },
    { label: "25°", color: "#3B82F6" },
    { label: "32°", color: "#93C5FD" },
    { label: "40°", color: "#FDE68A" },
    { label: "55°+", color: "#EF4444" },
  ],
};

export function legendFor(metric: string): { title: string; items: LegendItem[] } {
  return {
    title: LEGEND_TITLES[metric] ?? METRIC_LABELS[metric] ?? metric,
    items: METRIC_LEGEND[metric] ?? METRIC_LEGEND.TAVG,
  };
}
