"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { theme, snowColors, chartTooltipStyle, chartCursorStyle } from "@/lib/theme";
import { formatSwe, formatDateFull } from "@/lib/formatting";
import { getCurrentWaterYear } from "@/lib/water-year";
import type { WaterYearSummary } from "@/lib/types";

interface PeakSweChartProps {
  data: WaterYearSummary[];
}

interface ChartBar {
  waterYear: number;
  peakSwe: number;
  peakSweDate: string;
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
  const { chartData, average, min, max, currentWy } = useMemo(() => {
    const currentWy = getCurrentWaterYear();
    const sorted = [...data].sort((a, b) => a.waterYear - b.waterYear);
    const avg = sorted.length > 0
      ? sorted.reduce((sum, d) => sum + d.peakSwe, 0) / sorted.length
      : 0;
    const historical = sorted.filter((d) => d.waterYear !== currentWy);
    const minVal = historical.length > 0 ? Math.min(...historical.map((d) => d.peakSwe)) : null;
    const maxVal = historical.length > 0 ? Math.max(...historical.map((d) => d.peakSwe)) : null;

    const bars: ChartBar[] = sorted.map((d) => ({
      waterYear: d.waterYear,
      peakSwe: d.peakSwe,
      peakSweDate: d.peakSweDate,
    }));

    return { chartData: bars, average: avg, min: minVal, max: maxVal, currentWy };
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-sm" style={{ color: theme.mediumGray }}>
        No historical data available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
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
            <Tooltip content={<CustomTooltip />} cursor={chartCursorStyle} />
            <ReferenceLine
              y={average}
              stroke={theme.mediumGray}
              strokeDasharray="6 3"
              strokeWidth={1.5}
            />
            {max !== null && (
              <ReferenceLine y={max} stroke={snowColors.envelopeMax} strokeWidth={1} strokeDasharray="6 3" />
            )}
            {min !== null && (
              <ReferenceLine y={min} stroke={snowColors.envelopeMin} strokeWidth={1} strokeDasharray="6 3" />
            )}
            <Bar dataKey="peakSwe" radius={[2, 2, 0, 0]} maxBarSize={20} fillOpacity={0.85}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.waterYear}
                  fill={entry.waterYear === currentWy ? snowColors.currentYear : snowColors.swe}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 pt-1.5 pb-1 flex-wrap">
        <div className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.mediumGray }}>
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: snowColors.swe, opacity: 0.85 }} />
          Peak SWE
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.mediumGray }}>
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: snowColors.currentYear }} />
          Current year
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.mediumGray }}>
          <div className="w-4 border-t border-dashed" style={{ borderColor: theme.mediumGray }} />
          Avg {formatSwe(average)}
        </div>
        {max !== null && (
          <div className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.mediumGray }}>
            <div className="w-4 border-t border-dashed" style={{ borderColor: snowColors.envelopeMax }} />
            Max {formatSwe(max)}
          </div>
        )}
        {min !== null && (
          <div className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.mediumGray }}>
            <div className="w-4 border-t border-dashed" style={{ borderColor: snowColors.envelopeMin }} />
            Min {formatSwe(min)}
          </div>
        )}
      </div>
    </div>
  );
}
