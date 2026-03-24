"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { theme, snowColors, chartTooltipStyle, chartCursorStyle } from "@/lib/theme";
import { getWaterYearDay, waterYearDayToLabel, getCurrentWaterYear } from "@/lib/water-year";
import { formatSwe } from "@/lib/formatting";
import type { DailyObservation } from "@/lib/types";

interface SeasonChartProps {
  season: DailyObservation[];
}

interface ChartPoint {
  wyDay: number;
  date: string;
  swe: number | null;
  sweMedian: number | null;
}

interface TooltipPayloadEntry {
  value: number;
  name: string;
  stroke?: string;
  color?: string;
  payload: ChartPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const date = new Date(point.date + "T00:00:00");
  const label = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div style={chartTooltipStyle}>
      <div className="font-mono text-[11px] mb-1.5 font-medium" style={{ color: theme.darkGray }}>
        {label}
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px]">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: snowColors.swe }}
        />
        <span style={{ color: theme.gray }}>SWE</span>
        <span className="ml-auto font-medium" style={{ color: theme.darkGray }}>
          {formatSwe(point.swe)}
        </span>
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px]">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: snowColors.median }}
        />
        <span style={{ color: theme.gray }}>Median</span>
        <span className="ml-auto font-medium" style={{ color: theme.darkGray }}>
          {formatSwe(point.sweMedian)}
        </span>
      </div>
    </div>
  );
}

export default function SeasonChart({ season }: SeasonChartProps) {
  const wy = getCurrentWaterYear();

  const chartData = useMemo(() => {
    return season
      .filter((d) => d.swe !== null || d.sweMedian !== null)
      .map((d): ChartPoint => ({
        wyDay: getWaterYearDay(d.date),
        date: d.date,
        swe: d.swe,
        sweMedian: d.sweMedian,
      }))
      .sort((a, b) => a.wyDay - b.wyDay);
  }, [season]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-sm" style={{ color: theme.mediumGray }}>
        No season data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="sweGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={snowColors.swe} stopOpacity={0.2} />
            <stop offset="100%" stopColor={snowColors.swe} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="wyDay"
          type="number"
          domain={[1, 365]}
          tickFormatter={(day: number) => waterYearDayToLabel(day, wy)}
          ticks={[1, 32, 62, 93, 124, 152, 183, 213, 244, 274, 305, 335]}
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
        <Area
          dataKey="swe"
          type="monotone"
          stroke={snowColors.swe}
          strokeWidth={2}
          fill="url(#sweGradient)"
          dot={false}
          activeDot={{ r: 4, fill: snowColors.swe, stroke: theme.white, strokeWidth: 2 }}
          connectNulls
        />
        <Line
          dataKey="sweMedian"
          type="monotone"
          stroke={snowColors.median}
          strokeWidth={1.5}
          strokeDasharray="6 3"
          dot={false}
          activeDot={false}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
