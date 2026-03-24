"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { theme, chartTooltipStyle } from "@/lib/theme";
import type { HourlyObservation } from "@/hooks/useHourlyData";

interface ChartPoint {
  label: string;
  snowDepth: number | null;
  temp: number | null;
}

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const depth = payload.find((p) => p.dataKey === "snowDepth");
  const temp = payload.find((p) => p.dataKey === "temp");
  return (
    <div style={chartTooltipStyle}>
      <div className="font-mono text-[11px] mb-1.5 font-medium" style={{ color: theme.darkGray }}>{label}</div>
      {depth?.value != null && (
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span style={{ color: theme.gray }}>Snow Depth</span>
          <span className="ml-auto font-medium" style={{ color: "#8B5CF6" }}>{depth.value}"</span>
        </div>
      )}
      {temp?.value != null && (
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span style={{ color: theme.gray }}>Temp</span>
          <span className="ml-auto font-medium" style={{ color: temp.value <= 32 ? "#3B82F6" : "#EF4444" }}>{temp.value}°F</span>
        </div>
      )}
    </div>
  );
}

interface DepthTempChartProps {
  data: HourlyObservation[];
}

export default function DepthTempChart({ data }: DepthTempChartProps) {
  const chartData: ChartPoint[] = data.map((d) => {
    const dt = new Date(d.datetime.replace(" ", "T"));
    const label = dt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", hour12: true });
    return { label, snowDepth: d.snowDepth, temp: d.temp };
  });

  const temps = chartData.map((d) => d.temp).filter((t): t is number => t !== null);
  const tempMin = temps.length ? Math.min(...temps) - 5 : -10;
  const tempMax = temps.length ? Math.max(...temps) + 5 : 80;

  // show ~every 24th label (daily tick)
  const tickInterval = Math.max(1, Math.floor(chartData.length / 7));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 4, right: 40, bottom: 0, left: -12 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
          axisLine={{ stroke: theme.borderGray }}
          tickLine={false}
          interval={tickInterval - 1}
        />
        <YAxis
          yAxisId="depth"
          tick={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}"`}
          width={32}
        />
        <YAxis
          yAxisId="temp"
          orientation="right"
          domain={[tempMin, tempMax]}
          tick={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}°`}
          width={32}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          yAxisId="temp"
          y={32}
          stroke="#93C5FD"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <Area
          yAxisId="depth"
          dataKey="snowDepth"
          type="stepAfter"
          stroke="#8B5CF6"
          strokeWidth={1.5}
          fill="#8B5CF6"
          fillOpacity={0.15}
          dot={false}
          connectNulls
        />
        <Line
          yAxisId="temp"
          dataKey="temp"
          stroke="#F59E0B"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
