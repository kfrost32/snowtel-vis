"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/useIsMobile";
import { X } from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import LegendItem from "@/components/LegendItem";
import { theme, snowColors, chartTooltipStyle, chartCursorStyle, percentileBands } from "@snotel/core/theme";
import { getWaterYearDay, waterYearDayToLabel, getCurrentWaterYear } from "@snotel/core/water-year";
import type { EnvelopeDay } from "@snotel/core/types";

interface EnvelopeChartProps {
  envelope: EnvelopeDay[];
  medianPeakDay: number;
  medianPeakValue: number;
  seasonMap: Map<number, number>;
  lastUpdated: string | null;
  formatValue: (value: number | null) => string;
  showPercentiles?: boolean;
  compareYears?: CompareYear[];
  onRemoveYear?: (year: number) => void;
}

export interface CompareYear {
  year: number;
  color: string;
  values: (number | null)[];
}

type Band = [number, number] | null;

interface ChartPoint {
  wyDay: number;
  current: number | null;
  median: number | null;
  max: number | null;
  min: number | null;
  maxYear: number | null;
  minYear: number | null;
  p30: number | null;
  p70: number | null;
  b0: Band;
  b1: Band;
  b2: Band;
  b3: Band;
  b4: Band;
  years: Record<number, number | null>;
}

function band(low: number | null | undefined, high: number | null | undefined): Band {
  return low == null || high == null ? null : [low, high];
}

const MOBILE_TOOLTIP_STYLE = {
  background: "rgba(255, 255, 255, 0.72)",
  backdropFilter: "blur(12px) saturate(140%)",
  WebkitBackdropFilter: "blur(12px) saturate(140%)",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  borderRadius: "8px",
  padding: "5px 8px",
  boxShadow: "0 2px 10px rgba(15, 23, 42, 0.08)",
};

interface TooltipPayloadEntry {
  payload?: ChartPoint;
}

function MedianPeakMark({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx === undefined || cy === undefined) return <g />;
  const size = 6;
  return (
    <g>
      <line x1={cx - size} y1={cy - size} x2={cx + size} y2={cy + size} stroke={snowColors.medianPeak} strokeWidth={2} />
      <line x1={cx + size} y1={cy - size} x2={cx - size} y2={cy + size} stroke={snowColors.medianPeak} strokeWidth={2} />
    </g>
  );
}

export default function EnvelopeChart({
  envelope,
  medianPeakDay,
  medianPeakValue,
  seasonMap,
  lastUpdated,
  formatValue,
  showPercentiles = false,
  compareYears = [],
  onRemoveYear,
}: EnvelopeChartProps) {
  const wy = getCurrentWaterYear();
  const isMobile = useIsMobile();
  const [tooltipCorner, setTooltipCorner] = useState<HTMLDivElement | null>(null);

  const chartData = useMemo((): ChartPoint[] => {
    return envelope.map((e) => ({
      wyDay: e.wyDay,
      current: seasonMap.get(e.wyDay) ?? null,
      median: e.median,
      max: e.max,
      min: e.min,
      maxYear: e.maxYear ?? null,
      minYear: e.minYear ?? null,
      p30: e.p30 ?? null,
      p70: e.p70 ?? null,
      b0: band(e.min, e.p10),
      b1: band(e.p10, e.p30),
      b2: band(e.p30, e.p70),
      b3: band(e.p70, e.p90),
      b4: band(e.p90, e.max),
      years: Object.fromEntries(compareYears.map((y) => [y.year, y.values[e.wyDay - 1] ?? null])),
    }));
  }, [envelope, seasonMap, compareYears]);

  const currentWyDay = useMemo(() => {
    if (!lastUpdated) return null;
    return getWaterYearDay(lastUpdated);
  }, [lastUpdated]);

  const hasMedian = chartData.some((d) => d.median !== null);
  const hasPercentiles = showPercentiles && chartData.some((d) => d.b2 !== null);

  function renderTooltip({ active, payload }: { active?: boolean; payload?: readonly TooltipPayloadEntry[] }) {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;

    const date = waterYearDayToLabel(point.wyDay, wy);

    const rows: { label: string; value: string | null; color: string }[] = [
      { label: "Current", value: point.current !== null ? formatValue(point.current) : null, color: theme.black },
      ...compareYears.map((y) => ({
        label: `WY ${y.year}`,
        value: point.years[y.year] != null ? formatValue(point.years[y.year]) : null,
        color: y.color,
      })),
      { label: "Median", value: point.median !== null ? formatValue(point.median) : null, color: snowColors.median },
      ...(!isMobile && hasPercentiles && point.p30 !== null && point.p70 !== null
        ? [{ label: "30–70th pct", value: `${formatValue(point.p30)}–${formatValue(point.p70)}`, color: snowColors.nearNormal }]
        : []),
      ...(isMobile
        ? []
        : [
            { label: point.maxYear ? `Max (WY ${point.maxYear})` : "Max", value: point.max !== null ? formatValue(point.max) : null, color: snowColors.envelopeMax },
            { label: point.minYear ? `Min (WY ${point.minYear})` : "Min", value: point.min !== null ? formatValue(point.min) : null, color: snowColors.envelopeMin },
          ]),
    ];

    const box = (
      <div style={isMobile ? MOBILE_TOOLTIP_STYLE : chartTooltipStyle}>
        <div className="font-mono text-[11px] mb-1 font-medium" style={{ color: theme.darkGray }}>
          {date}
        </div>
        {rows.map(({ label, value, color }) =>
          value !== null ? (
            <div key={label} className="flex items-center gap-2 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span style={{ color: theme.gray }}>{label}</span>
              <span className="ml-auto font-medium" style={{ color: theme.darkGray }}>
                {value}
              </span>
            </div>
          ) : null
        )}
      </div>
    );
    return isMobile && tooltipCorner ? createPortal(box, tooltipCorner) : box;
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-sm" style={{ color: theme.mediumGray }}>
        No envelope data available
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="relative flex-1 min-h-0">
        <div ref={setTooltipCorner} className="absolute top-0 right-0 z-10 pointer-events-none" />
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <XAxis
              dataKey="wyDay"
              type="number"
              domain={[1, 366]}
              tickFormatter={(day: number) => waterYearDayToLabel(day, wy)}
              ticks={[1, 32, 62, 93, 124, 152, 183, 213, 244, 274, 305, 336]}
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
            <CartesianGrid stroke={theme.borderGray} strokeDasharray="0" vertical={true} horizontalValues={undefined} verticalValues={[1, 32, 62, 93, 124, 152, 183, 213, 244, 274, 305, 336]} />
            <Tooltip content={renderTooltip} cursor={chartCursorStyle} />

            {currentWyDay !== null && (
              <ReferenceLine
                x={currentWyDay}
                stroke={theme.borderGray}
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            )}

            {hasPercentiles && percentileBands.map(({ key, color }) => (
              <Area
                key={key}
                dataKey={key}
                type="monotone"
                stroke="none"
                fill={color}
                fillOpacity={0.85}
                activeDot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}

            <Line
              dataKey="max"
              type="monotone"
              stroke={snowColors.envelopeMax}
              strokeWidth={1.25}
              dot={false}
              activeDot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              dataKey="min"
              type="monotone"
              stroke={snowColors.envelopeMin}
              strokeWidth={1.25}
              dot={false}
              activeDot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              dataKey="median"
              type="monotone"
              stroke={theme.white}
              strokeWidth={4}
              strokeOpacity={0.8}
              connectNulls
              dot={false}
              activeDot={false}
              legendType="none"
              tooltipType="none"
              isAnimationActive={false}
            />
            <Line
              dataKey="median"
              type="monotone"
              stroke={snowColors.median}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              connectNulls
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            {compareYears.map((y) => (
              <Line
                key={y.year}
                dataKey={(p: ChartPoint) => p.years[y.year]}
                name={`WY ${y.year}`}
                type="monotone"
                stroke={y.color}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: y.color, stroke: theme.white, strokeWidth: 1.5 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}

            {hasMedian && medianPeakValue > 0 && (
              <ReferenceDot x={medianPeakDay} y={medianPeakValue} shape={MedianPeakMark} ifOverflow="extendDomain" />
            )}

            <Line
              dataKey="current"
              type="monotone"
              stroke={theme.black}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: theme.black, stroke: theme.white, strokeWidth: 2 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 pt-1.5 pb-1 flex-wrap">
        <LegendItem>
          <div className="w-4 border-t-2" style={{ borderColor: theme.black }} />
          Current
        </LegendItem>
        {compareYears.map((y) => (
          <button
            key={y.year}
            onClick={() => onRemoveYear?.(y.year)}
            disabled={!onRemoveYear}
            className="flex items-center gap-1.5 font-mono text-[10px] enabled:cursor-pointer enabled:hover:opacity-70"
            style={{ color: theme.darkGray }}
            aria-label={`Remove WY ${y.year}`}
          >
            <div className="w-4 border-t-2" style={{ borderColor: y.color }} />
            WY {y.year}
            {onRemoveYear && <X size={10} style={{ color: theme.mediumGray }} />}
          </button>
        ))}
        {hasMedian && (
          <LegendItem>
            <div className="w-4 border-t border-dashed" style={{ borderColor: snowColors.median }} />
            Median
          </LegendItem>
        )}
        <LegendItem hideOnMobile>
          <div className="w-4 border-t" style={{ borderColor: snowColors.envelopeMax }} />
          Max
        </LegendItem>
        <LegendItem hideOnMobile>
          <div className="w-4 border-t" style={{ borderColor: snowColors.envelopeMin }} />
          Min
        </LegendItem>
        {hasMedian && (
          <LegendItem hideOnMobile>
            <span style={{ color: snowColors.medianPeak, fontSize: 12, lineHeight: 1 }}>✕</span>
            Median peak
          </LegendItem>
        )}
        {hasPercentiles && (
          <LegendItem>
            <div className="flex">
              {percentileBands.map(({ key, color }) => (
                <div key={key} className="w-1.5 h-2.5" style={{ background: color }} />
              ))}
            </div>
            <span className="max-md:hidden" data-export-reveal="inline">10/30/70/90th percentiles</span>
            <span className="md:hidden">Percentiles</span>
          </LegendItem>
        )}
      </div>
    </div>
  );
}
