import { FORECAST_COLORS } from "@snotel/core/colors";
import { fahrenheitToCelsius, inchesToCm, isMetric } from "@snotel/core/units";

export interface LegendItem {
  label: string;
  color: string;
}

type Stop = [inches: number, color: string, prefix?: string, suffix?: string];

function inches(value: number, signed = false): string {
  const sign = signed && value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (!isMetric()) return `${sign}${abs}″`;
  const cm = inchesToCm(abs);
  return `${sign}${cm < 10 ? Math.round(cm * 10) / 10 : Math.round(cm)}cm`;
}

function feet(value: number): string {
  if (!isMetric()) return `${value}'`;
  const cm = inchesToCm(value * 12);
  return cm >= 100 ? `${Math.round(cm / 10) / 10}m` : `${Math.round(cm)}cm`;
}

function degrees(value: number): string {
  return `${Math.round(isMetric() ? fahrenheitToCelsius(value) : value)}°`;
}

function legend(stops: Stop[], format: (value: number) => string): LegendItem[] {
  return stops.map(([value, color, prefix = "", suffix = ""]) => ({ label: value === 0 ? "0" : `${prefix}${format(value)}${suffix}`, color }));
}

const PCT_LEGEND: LegendItem[] = [
  { label: "<50%", color: "#DC2626" },
  { label: "50–75%", color: "#F59E0B" },
  { label: "75–110%", color: "#22C55E" },
  { label: "110–150%", color: "#3B82F6" },
  { label: ">150%", color: "#1D4ED8" },
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
  FORECAST_3D: "Forecast snow, next 3 days",
  FORECAST_7D: "Forecast snow, next 7 days",
};

const LEGEND_TITLES: Record<string, string> = {
  WTEQ: "SWE, % of median",
  WTEQ_PCT: "SWE, % of median",
};

function legendItems(metric: string): LegendItem[] {
  const signed = (value: number) => inches(value, true);
  switch (metric) {
    case "WTEQ":
    case "WTEQ_PCT":
      return PCT_LEGEND;
    case "CHANGE_1D":
    case "CHANGE_3D":
    case "CHANGE_7D":
      return legend([[-2, "#DC2626", "", "+"], [-0.5, "#F59E0B"], [0, "#94A3B8"], [0.5, "#3B82F6"], [2, "#1D4ED8", "", "+"]], signed);
    case "SNWD_CHANGE_1D":
    case "SNWD_CHANGE_3D":
    case "SNWD_CHANGE_7D":
      return legend([[-6, "#DC2626", "", "+"], [-2, "#F59E0B"], [0, "#94A3B8"], [2, "#3B82F6"], [6, "#1D4ED8", "", "+"]], signed);
    case "SNWD":
      return legend([[0, "#CBD5E1"], [1, "#C7D6EE"], [3, "#A3BDE6"], [6, "#7AA0DD"], [10, "#2F5A9E", "", "+"]], feet);
    case "PREC":
      return legend([[0, "#CBD5E1"], [10, "#A5F3FC"], [20, "#67E8F9"], [35, "#22D3EE"], [50, "#0891B2", "", "+"]], (v) => inches(v));
    case "FORECAST_3D":
    case "FORECAST_7D":
      return legend(
        [[0, "#CBD5E1"], [1, FORECAST_COLORS[0], "<"], [1, FORECAST_COLORS[1]], [3, FORECAST_COLORS[2]], [6, FORECAST_COLORS[3]], [12, FORECAST_COLORS[4], "", "+"]],
        (v) => inches(v)
      );
    default:
      return legend([[10, "#1D4ED8", "<"], [25, "#3B82F6"], [32, "#93C5FD"], [40, "#FDE68A"], [55, "#EF4444", "", "+"]], degrees);
  }
}

export function legendFor(metric: string): { title: string; items: LegendItem[] } {
  return {
    title: LEGEND_TITLES[metric] ?? METRIC_LABELS[metric] ?? metric,
    items: legendItems(metric),
  };
}
