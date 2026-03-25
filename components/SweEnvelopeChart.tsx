"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { theme, snowColors, chartTooltipStyle, chartCursorStyle } from "@/lib/theme";
import { getWaterYearDay, waterYearDayToLabel, getCurrentWaterYear } from "@/lib/water-year";
import { buildSeasonMap } from "@/lib/season";
import { formatSwe } from "@/lib/formatting";
import type { DailyObservation, StationEnvelope } from "@/lib/types";

interface SweEnvelopeChartProps {
  season?: DailyObservation[];
  envelope: StationEnvelope;
  lastUpdated: string | null;
  seasonMap?: Map<number, number>;
}

interface ChartPoint {
  wyDay: number;
  current: number | null;
  median: number | null;
  max: number | null;
  min: number | null;
  maxYear: number | null;
  minYear: number | null;
}

interface TooltipPayloadEntry {
  value: number | null;
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

  const wy = getCurrentWaterYear();
  const date = waterYearDayToLabel(point.wyDay, wy);

  const rows: { label: string; value: number | null; color: string }[] = [
    { label: "Current", value: point.current, color: theme.black },
    { label: "Median (′91-′20)", value: point.median, color: snowColors.median },
    { label: point.maxYear ? `Max (WY ${point.maxYear})` : "Max", value: point.max, color: theme.mediumGray },
    { label: point.minYear ? `Min (WY ${point.minYear})` : "Min", value: point.min, color: snowColors.envelopeMin },
  ];

  return (
    <div style={chartTooltipStyle}>
      <div className="font-mono text-[11px] mb-1.5 font-medium" style={{ color: theme.darkGray }}>
        {date}
      </div>
      {rows.map(({ label, value, color }) =>
        value !== null ? (
          <div key={label} className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span style={{ color: theme.gray }}>{label}</span>
            <span className="ml-auto font-medium" style={{ color: theme.darkGray }}>
              {formatSwe(value)}
            </span>
          </div>
        ) : null
      )}
    </div>
  );
}

function MedianPeakDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
  medianPeakDay: number;
}) {
  const { cx, cy, payload, medianPeakDay } = props;
  if (!cx || !cy || !payload || payload.wyDay !== medianPeakDay) return null;

  const size = 6;
  return (
    <g>
      <line x1={cx - size} y1={cy - size} x2={cx + size} y2={cy + size} stroke={snowColors.medianPeak} strokeWidth={2} />
      <line x1={cx + size} y1={cy - size} x2={cx - size} y2={cy + size} stroke={snowColors.medianPeak} strokeWidth={2} />
    </g>
  );
}

export default function SweEnvelopeChart({
  season,
  envelope,
  lastUpdated,
  seasonMap: externalSeasonMap,
}: SweEnvelopeChartProps) {
  const wy = getCurrentWaterYear();

  const seasonMap = useMemo(() => externalSeasonMap ?? buildSeasonMap(season ?? []), [season, externalSeasonMap]);

  const chartData = useMemo((): ChartPoint[] => {
    return envelope.envelope.map((e) => ({
      wyDay: e.wyDay,
      current: seasonMap.get(e.wyDay) ?? null,
      median: e.median,
      max: e.max,
      min: e.min,
      maxYear: e.maxYear ?? null,
      minYear: e.minYear ?? null,
    }));
  }, [envelope, seasonMap]);

  const currentWyDay = useMemo(() => {
    if (!lastUpdated) return null;
    return getWaterYearDay(lastUpdated);
  }, [lastUpdated]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-sm" style={{ color: theme.mediumGray }}>
        No envelope data available
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <XAxis
              dataKey="wyDay"
              type="number"
              domain={[1, 366]}
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
            <CartesianGrid stroke={theme.borderGray} strokeDasharray="0" vertical={true} horizontalValues={undefined} verticalValues={[1, 32, 62, 93, 124, 152, 183, 213, 244, 274, 305, 335]} />
            <Tooltip content={<CustomTooltip />} cursor={chartCursorStyle} />

            {currentWyDay !== null && (
              <ReferenceLine
                x={currentWyDay}
                stroke={theme.borderGray}
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            )}

            <Line
              dataKey="max"
              type="monotone"
              stroke={snowColors.envelopeMax}
              strokeWidth={1}
              dot={false}
              activeDot={false}
              connectNulls
              opacity={0.5}
            />
            <Line
              dataKey="min"
              type="monotone"
              stroke={snowColors.envelopeMin}
              strokeWidth={1}
              dot={false}
              activeDot={false}
              connectNulls
              opacity={0.5}
            />
            <Line
              dataKey="median"
              type="monotone"
              stroke={snowColors.median}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              connectNulls
              dot={(props) => (
                <MedianPeakDot
                  key={props.payload?.wyDay}
                  cx={props.cx}
                  cy={props.cy}
                  payload={props.payload}
                  medianPeakDay={envelope.medianPeakDay}
                />
              )}
              activeDot={false}
            />
            <Line
              dataKey="current"
              type="monotone"
              stroke={theme.black}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: theme.black, stroke: theme.white, strokeWidth: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 pt-1.5 pb-1 flex-wrap">
        <div className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.mediumGray }}>
          <div className="w-4 border-t-2" style={{ borderColor: theme.black }} />
          Current
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.mediumGray }}>
          <div className="w-4 border-t border-dashed" style={{ borderColor: snowColors.median }} />
          Median &#39;91–&#39;20
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.mediumGray }}>
          <div className="w-4 border-t" style={{ borderColor: snowColors.envelopeMax, opacity: 0.5 }} />
          Max
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.mediumGray }}>
          <div className="w-4 border-t" style={{ borderColor: snowColors.envelopeMin, opacity: 0.5 }} />
          Min
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.mediumGray }}>
          <span style={{ color: snowColors.medianPeak, fontSize: 12, lineHeight: 1 }}>✕</span>
          Median peak
        </div>
      </div>
    </div>
  );
}
