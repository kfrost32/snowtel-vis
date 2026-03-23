"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { theme, snowColors, yearColors, chartTooltipStyle, chartCursorStyle } from "@/lib/theme";
import { waterYearDayToLabel, getCurrentWaterYear } from "@/lib/water-year";
import { formatSwe } from "@/lib/formatting";
import type { EnvelopeData } from "@/hooks/useEnvelopeData";

interface EnvelopeChartProps {
  data: EnvelopeData;
}

interface ChartPoint {
  wyDay: number;
  min: number | null;
  max: number | null;
  median: number | null;
  p10: number | null;
  p90: number | null;
  [key: `y${number}`]: number | undefined;
}

const PAST_YEAR_COLORS = [
  "#94A3B8",
  "#A3B8CC",
  "#7DD3C0",
  "#C4B5FD",
  "#FCA5A5",
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as ChartPoint;
  if (!point) return null;

  const wy = getCurrentWaterYear();
  const label = waterYearDayToLabel(point.wyDay, wy);

  const entries = payload.filter((p: any) => p.value != null && p.dataKey !== "min" && p.dataKey !== "max" && p.dataKey !== "p10" && p.dataKey !== "p90");

  return (
    <div style={chartTooltipStyle}>
      <div className="font-mono text-[11px] mb-1.5 font-medium" style={{ color: theme.darkGray }}>
        {label}
      </div>
      {entries.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 font-mono text-[11px]">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: entry.stroke || entry.color }}
          />
          <span style={{ color: theme.gray }}>{entry.name}</span>
          <span className="ml-auto font-medium" style={{ color: theme.darkGray }}>
            {formatSwe(entry.value)}
          </span>
        </div>
      ))}
      {point.min != null && point.max != null && (
        <div className="flex items-center gap-2 font-mono text-[11px] mt-1 pt-1 border-t" style={{ borderColor: theme.borderGray }}>
          <span style={{ color: theme.mediumGray }}>Range</span>
          <span className="ml-auto" style={{ color: theme.mediumGray }}>
            {formatSwe(point.min)} – {formatSwe(point.max)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function EnvelopeChart({ data }: EnvelopeChartProps) {
  const { envelope, years, currentYear } = data;

  const pastYears = useMemo(() => years.filter((y) => y.waterYear !== currentYear), [years, currentYear]);
  const currentTrace = useMemo(() => years.find((y) => y.waterYear === currentYear), [years, currentYear]);

  const [hiddenYears, setHiddenYears] = useState<Set<number>>(new Set());

  const toggleYear = (wy: number) => {
    setHiddenYears((prev) => {
      const next = new Set(prev);
      if (next.has(wy)) {
        next.delete(wy);
      } else {
        next.add(wy);
      }
      return next;
    });
  };

  const chartData = useMemo(() => {
    const envelopeMap = new Map(envelope.map((d) => [d.wyDay, d]));

    const allDays = new Set<number>();
    envelope.forEach((d) => allDays.add(d.wyDay));
    years.forEach((y) => y.data.forEach((d) => allDays.add(d.wyDay)));

    const yearMaps = new Map<number, Map<number, number>>();
    years.forEach((y) => {
      yearMaps.set(y.waterYear, new Map(y.data.map((d) => [d.wyDay, d.swe])));
    });

    return Array.from(allDays)
      .sort((a, b) => a - b)
      .map((wyDay) => {
        const env = envelopeMap.get(wyDay);
        const point: ChartPoint = {
          wyDay,
          min: env?.min ?? null,
          max: env?.max ?? null,
          median: env?.median ?? null,
          p10: env?.p10 ?? null,
          p90: env?.p90 ?? null,
        };

        years.forEach((y) => {
          const swe = yearMaps.get(y.waterYear)?.get(wyDay);
          point[`y${y.waterYear}`] = swe;
        });

        return point;
      });
  }, [envelope, years]);

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
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="envelopeOuterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={snowColors.swe} stopOpacity={0.06} />
                <stop offset="100%" stopColor={snowColors.swe} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="envelopeInnerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={snowColors.swe} stopOpacity={0.12} />
                <stop offset="100%" stopColor={snowColors.swe} stopOpacity={0.04} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="wyDay"
              type="number"
              domain={[1, 366]}
              tickFormatter={(day: number) => waterYearDayToLabel(day, currentYear)}
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
              dataKey="max"
              type="monotone"
              stroke="none"
              fill="url(#envelopeOuterGrad)"
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
              name="Max"
            />
            <Area
              dataKey="p90"
              type="monotone"
              stroke="none"
              fill="url(#envelopeInnerGrad)"
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
              name="p90"
            />
            <Area
              dataKey="p10"
              type="monotone"
              stroke="none"
              fill={theme.white}
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
              name="p10"
            />
            <Area
              dataKey="min"
              type="monotone"
              stroke="none"
              fill={theme.white}
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
              name="min"
            />

            {pastYears.map((y, i) =>
              !hiddenYears.has(y.waterYear) ? (
                <Line
                  key={y.waterYear}
                  dataKey={`y${y.waterYear}`}
                  type="monotone"
                  stroke={PAST_YEAR_COLORS[i % PAST_YEAR_COLORS.length]}
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  dot={false}
                  activeDot={false}
                  connectNulls
                  isAnimationActive={false}
                  name={String(y.waterYear)}
                />
              ) : null
            )}

            <Line
              dataKey="median"
              type="monotone"
              stroke={snowColors.median}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              activeDot={false}
              connectNulls
              isAnimationActive={false}
              name="Median"
            />

            {currentTrace && !hiddenYears.has(currentYear) && (
              <Line
                dataKey={`y${currentYear}`}
                type="monotone"
                stroke={snowColors.swe}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: snowColors.swe, stroke: theme.white, strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
                name={String(currentYear)}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 mt-1">
        <button
          onClick={() => toggleYear(currentYear)}
          className="flex items-center gap-1.5 font-mono text-[11px] cursor-pointer hover:opacity-70 transition-opacity"
          style={{
            color: hiddenYears.has(currentYear) ? theme.mediumGray : theme.darkGray,
            opacity: hiddenYears.has(currentYear) ? 0.5 : 1,
          }}
        >
          <span className="w-3 h-0.5 rounded-full shrink-0" style={{ background: snowColors.swe }} />
          {currentYear}
        </button>

        <span className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: theme.gray }}>
          <span className="w-3 h-0.5 rounded-full shrink-0 border-b border-dashed" style={{ borderColor: snowColors.median }} />
          Median
        </span>

        <span className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: theme.mediumGray }}>
          <span className="w-3 h-2 rounded-sm shrink-0" style={{ background: snowColors.swe, opacity: 0.1 }} />
          Range
        </span>

        {pastYears.map((y, i) => (
          <button
            key={y.waterYear}
            onClick={() => toggleYear(y.waterYear)}
            className="flex items-center gap-1.5 font-mono text-[11px] cursor-pointer hover:opacity-70 transition-opacity"
            style={{
              color: hiddenYears.has(y.waterYear) ? theme.mediumGray : theme.gray,
              opacity: hiddenYears.has(y.waterYear) ? 0.4 : 1,
            }}
          >
            <span className="w-3 h-0.5 rounded-full shrink-0" style={{ background: PAST_YEAR_COLORS[i % PAST_YEAR_COLORS.length] }} />
            {y.waterYear}
          </button>
        ))}
      </div>
    </div>
  );
}
