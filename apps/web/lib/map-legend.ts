import { FORECAST_STOPS, NO_FORECAST_COLOR } from "@snotel/core/colors";
import { formatAxisTemp, inchesToCm, isMetric } from "@snotel/core/units";

export interface LegendItem {
  label: string;
  color: string;
}

type Stop = [value: number, color: string];

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

function legend(stops: Stop[], format: (value: number) => string, { openLow = false, openHigh = true } = {}): LegendItem[] {
  return stops.map(([value, color], i) => {
    const label = value === 0 ? "0" : format(value);
    const prefix = openLow && i === 0 ? "<" : "";
    const suffix = openHigh && i === stops.length - 1 ? "+" : "";
    return { label: `${prefix}${label}${suffix}`, color };
  });
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
  const plain = (value: number) => inches(value);
  switch (metric) {
    case "WTEQ":
    case "WTEQ_PCT":
      return PCT_LEGEND;
    case "CHANGE_1D":
    case "CHANGE_3D":
    case "CHANGE_7D":
      return legend([[-2, "#DC2626"], [-0.5, "#F59E0B"], [0, "#94A3B8"], [0.5, "#3B82F6"], [2, "#1D4ED8"]], signed).map((item, i) =>
        i === 0 ? { ...item, label: `${item.label}+` } : item
      );
    case "SNWD_CHANGE_1D":
    case "SNWD_CHANGE_3D":
    case "SNWD_CHANGE_7D":
      return legend([[-6, "#DC2626"], [-2, "#F59E0B"], [0, "#94A3B8"], [2, "#3B82F6"], [6, "#1D4ED8"]], signed).map((item, i) =>
        i === 0 ? { ...item, label: `${item.label}+` } : item
      );
    case "SNWD":
      return legend([[0, "#CBD5E1"], [1, "#C7D6EE"], [3, "#A3BDE6"], [6, "#7AA0DD"], [10, "#2F5A9E"]], feet);
    case "PREC":
      return legend([[0, "#CBD5E1"], [10, "#A5F3FC"], [20, "#67E8F9"], [35, "#22D3EE"], [50, "#0891B2"]], plain);
    case "FORECAST_3D":
    case "FORECAST_7D": {
      const [first, ...rest] = FORECAST_STOPS;
      return [
        { label: "0", color: NO_FORECAST_COLOR },
        ...legend([[rest[0].from, first.color]], plain, { openLow: true, openHigh: false }),
        ...legend(rest.map((stop): Stop => [stop.from, stop.color]), plain),
      ];
    }
    default:
      return legend([[10, "#1D4ED8"], [25, "#3B82F6"], [32, "#93C5FD"], [40, "#FDE68A"], [55, "#EF4444"]], formatAxisTemp, { openLow: true });
  }
}

export function legendFor(metric: string): { title: string; items: LegendItem[] } {
  return {
    title: LEGEND_TITLES[metric] ?? METRIC_LABELS[metric] ?? metric,
    items: legendItems(metric),
  };
}
