"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { theme, snowColors, chartTooltipStyle, chartCursorStyle } from "@/lib/theme";
import { formatSwe, formatDateFull } from "@/lib/formatting";
import type { WaterYearSummary } from "@/lib/types";

interface PeakSweChartProps {
  data: WaterYearSummary[];
}

interface ChartBar {
  waterYear: number;
  peakSwe: number;
  peakSweDate: string;
  aboveAvg: boolean;
}

interface TooltipPayloadEntry {
  value: number;
  payload: ChartBar;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const bar = payload[0]?.payload;
  if (!bar) return null;

  return (
    <div style={chartTooltipStyle}>
      <div className="font-mono text-[11px] mb-1.5 font-medium" style={{ color: theme.darkGray }}>
        WY {bar.waterYear}
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px]">
        <span style={{ color: theme.gray }}>Peak SWE</span>
        <span className="ml-auto font-medium" style={{ color: theme.darkGray }}>
          {formatSwe(bar.peakSwe)}
        </span>
      </div>
      {bar.peakSweDate && (
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span style={{ color: theme.gray }}>Date</span>
          <span className="ml-auto font-medium" style={{ color: theme.darkGray }}>
            {formatDateFull(bar.peakSweDate)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function PeakSweChart({ data }: PeakSweChartProps) {
  const { chartData, average } = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.waterYear - b.waterYear);
    const avg = sorted.length > 0
      ? sorted.reduce((sum, d) => sum + d.peakSwe, 0) / sorted.length
      : 0;

    const bars: ChartBar[] = sorted.map((d) => ({
      waterYear: d.waterYear,
      peakSwe: d.peakSwe,
      peakSweDate: d.peakSweDate,
      aboveAvg: d.peakSwe >= avg,
    }));

    return { chartData: bars, average: avg };
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-sm" style={{ color: theme.mediumGray }}>
        No historical data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <XAxis
          dataKey="waterYear"
          tick={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
          axisLine={{ stroke: theme.borderGray }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}"`}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={chartCursorStyle}
        />
        <ReferenceLine
          y={average}
          stroke={theme.mediumGray}
          strokeDasharray="6 3"
          strokeWidth={1.5}
          label={{
            value: `Avg ${formatSwe(average)}`,
            position: "right",
            fill: theme.mediumGray,
            fontSize: 11,
            fontFamily: "var(--font-ibm-plex-mono)",
          }}
        />
        <Bar dataKey="peakSwe" radius={[2, 2, 0, 0]} maxBarSize={20}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.aboveAvg ? snowColors.swe : snowColors.below}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
