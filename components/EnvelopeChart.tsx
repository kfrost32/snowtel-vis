"use client";

import { useMemo, useState, useRef } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import { theme, snowColors, chartTooltipStyle, chartCursorStyle } from "@/lib/theme";
import { waterYearDayToLabel, waterYearDayToDate, getCurrentWaterYear, getWaterYearDay } from "@/lib/water-year";
import { formatSwe, formatPctOfNormal } from "@/lib/formatting";
import { getConditionColor } from "@/lib/colors";
import type { EnvelopeData } from "@/hooks/useEnvelopeData";

interface EnvelopeChartProps {
  data: EnvelopeData;
  stationName?: string;
}

interface ChartPoint {
  wyDay: number;
  min: number | null;
  max: number | null;
  median: number | null;
  p25: number | null;
  p75: number | null;
  [key: `y${number}`]: number | undefined;
}

const PAST_YEAR_COLORS = [
  "#94A3B8",
  "#A8BDCC",
  "#7DD3C0",
  "#C4B5FD",
  "#FCA5A5",
];

interface TooltipPayloadEntry {
  value: number;
  name: string;
  stroke?: string;
  color?: string;
  dataKey: string;
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
  const label = waterYearDayToLabel(point.wyDay, wy);

  const HIDDEN_KEYS = new Set(["min", "max", "p25", "p75"]);
  const entries = payload.filter((p) => p.value != null && !HIDDEN_KEYS.has(p.dataKey));

  return (
    <div style={chartTooltipStyle}>
      <div className="font-mono text-[11px] mb-1.5 font-medium" style={{ color: theme.darkGray }}>
        {label}
      </div>
      {entries.map((entry, i) => (
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
        <div
          className="flex items-center gap-2 font-mono text-[11px] mt-1 pt-1 border-t"
          style={{ borderColor: theme.borderGray }}
        >
          <span style={{ color: theme.mediumGray }}>Range</span>
          <span className="ml-auto" style={{ color: theme.mediumGray }}>
            {formatSwe(point.min)} – {formatSwe(point.max)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function EnvelopeChart({ data, stationName }: EnvelopeChartProps) {
  const { envelope, years, currentYear } = data;
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const pastYears = useMemo(
    () => years.filter((y) => y.waterYear !== currentYear).slice(-4),
    [years, currentYear]
  );
  const currentTrace = useMemo(
    () => years.find((y) => y.waterYear === currentYear),
    [years, currentYear]
  );

  const [hiddenYears, setHiddenYears] = useState<Set<number>>(new Set());

  const toggleYear = (wy: number) => {
    setHiddenYears((prev) => {
      const next = new Set(prev);
      if (next.has(wy)) next.delete(wy);
      else next.add(wy);
      return next;
    });
  };

  const todayWyDay = useMemo(() => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    return getWaterYearDay(dateStr);
  }, []);

  const todayDot = useMemo(() => {
    if (!currentTrace) return null;
    const sorted = [...currentTrace.data].sort((a, b) => a.wyDay - b.wyDay);
    const last = sorted[sorted.length - 1];
    if (!last) return null;
    return last;
  }, [currentTrace]);

  const medianAtToday = useMemo(() => {
    if (!todayDot) return null;
    const env = envelope.find((d) => d.wyDay === todayDot.wyDay);
    return env?.median ?? null;
  }, [envelope, todayDot]);

  const pctOfMedian = useMemo(() => {
    if (todayDot && medianAtToday && medianAtToday > 0) {
      return Math.round((todayDot.swe / medianAtToday) * 100);
    }
    return null;
  }, [todayDot, medianAtToday]);

  const medianPeak = useMemo(() => {
    const validDays = envelope.filter((d) => d.median !== null);
    if (validDays.length === 0) return null;
    return validDays.reduce((best, d) => (d.median! > best.median! ? d : best));
  }, [envelope]);

  const pctOfMedianPeak = useMemo(() => {
    if (!todayDot || !medianPeak?.median) return null;
    return Math.round((todayDot.swe / medianPeak.median) * 100);
  }, [todayDot, medianPeak]);

  const daysUntilMedianPeak = useMemo(() => {
    if (!medianPeak || !todayDot) return null;
    const diff = medianPeak.wyDay - todayDot.wyDay;
    return diff;
  }, [medianPeak, todayDot]);

  const currentPercentile = useMemo(() => {
    if (!todayDot) return null;
    const envDay = envelope.find((d) => d.wyDay === todayDot.wyDay);
    if (!envDay || envDay.min === null || envDay.max === null) return null;
    const { min, p10, median, p90, max } = envDay;
    if (min === null || p10 === null || median === null || p90 === null || max === null) return null;
    const v = todayDot.swe;
    if (v <= min) return 0;
    if (v >= max) return 100;
    const segments: [number, number, number, number][] = [
      [min, p10, 0, 10],
      [p10, median, 10, 50],
      [median, p90, 50, 90],
      [p90, max, 90, 100],
    ];
    for (const [lo, hi, pLo, pHi] of segments) {
      if (v >= lo && v <= hi) {
        if (hi === lo) return pLo;
        return Math.round(pLo + ((v - lo) / (hi - lo)) * (pHi - pLo));
      }
    }
    return null;
  }, [todayDot, envelope]);

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
          p25: env?.p10 ?? null,
          p75: env?.p90 ?? null,
        };

        years.forEach((y) => {
          const swe = yearMaps.get(y.waterYear)?.get(wyDay);
          point[`y${y.waterYear}`] = swe;
        });

        return point;
      });
  }, [envelope, years]);

  const handleExport = async () => {
    if (!chartRef.current || exporting) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");

      const attrEl = chartRef.current.querySelector("[data-export-attr]") as HTMLElement | null;
      const exportBtn = chartRef.current.querySelector("[data-export-btn]") as HTMLElement | null;

      if (attrEl) attrEl.style.display = "flex";
      if (exportBtn) exportBtn.style.display = "none";

      const dataUrl = await toPng(chartRef.current, {
        quality: 1,
        backgroundColor: "#FFFFFF",
        pixelRatio: 2,
      });

      if (attrEl) attrEl.style.display = "none";
      if (exportBtn) exportBtn.style.display = "";

      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const name = stationName ? stationName.toLowerCase().replace(/\s+/g, "-") : "snotel";
      const link = document.createElement("a");
      link.download = `swe-${name}-${today.replace(/[\s,]/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-sm" style={{ color: theme.mediumGray }}>
        No historical data available
      </div>
    );
  }

  const conditionColor = pctOfMedian !== null ? getConditionColor(pctOfMedian) : theme.mediumGray;
  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const stats = todayDot ? [
    {
      label: "% of Median",
      value: pctOfMedian !== null ? `${pctOfMedian}%` : "—",
      color: pctOfMedian !== null ? getConditionColor(pctOfMedian) : theme.mediumGray,
    },
    {
      label: "% Median Peak",
      value: pctOfMedianPeak !== null ? `${pctOfMedianPeak}%` : "—",
      color: theme.darkGray,
    },
    {
      label: daysUntilMedianPeak !== null && daysUntilMedianPeak > 0 ? "Days to Peak" : "Past Peak",
      value: daysUntilMedianPeak !== null
        ? daysUntilMedianPeak > 0
          ? String(daysUntilMedianPeak)
          : `${Math.abs(daysUntilMedianPeak)}d ago`
        : "—",
      color: theme.darkGray,
    },
    {
      label: "Percentile",
      value: currentPercentile !== null ? `${currentPercentile}` : "—",
      color: theme.darkGray,
    },
  ] : null;

  return (
    <div ref={chartRef} className="flex flex-col h-full bg-white">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0 flex-1">
          {stats ? (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className="font-sans text-3xl font-bold leading-none"
                style={{ color: pctOfMedian !== null ? getConditionColor(pctOfMedian) : theme.darkGray }}
              >
                {pctOfMedian !== null ? `${pctOfMedian}%` : "—"}
              </span>
              <span className="font-sans text-sm font-medium" style={{ color: theme.darkGray }}>
                of POR Median
              </span>
              <span className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>
                · {todayLabel}
              </span>
            </div>
          ) : (
            <div className="font-mono text-xs" style={{ color: theme.mediumGray }}>No current data</div>
          )}
          {stats && (
            <div className="flex items-center gap-4 mt-1.5">
              {stats.slice(1).map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: theme.mediumGray }}>{s.label}</span>
                  <span className="font-mono text-[11px] font-semibold" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          data-export-btn
          onClick={handleExport}
          disabled={exporting}
          className="shrink-0 p-1.5 rounded-md transition-colors duration-150 hover:bg-black/[0.05] cursor-pointer"
          style={{ color: theme.gray }}
          aria-label="Export chart as image"
          title="Save as image"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 0 0 3.5 13h7a1.5 1.5 0 0 0 1.5-1.5V10" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <defs>
              {/* max→p90: blue band (above normal) */}
              <linearGradient id="bandAbove" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.08} />
              </linearGradient>
              {/* p90→p10: green band (normal range) */}
              <linearGradient id="bandNormal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity={0.20} />
                <stop offset="100%" stopColor="#22C55E" stopOpacity={0.10} />
              </linearGradient>
              {/* p10→min: red band (below normal) */}
              <linearGradient id="bandBelow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0.06} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="wyDay"
              type="number"
              domain={[1, 366]}
              tickFormatter={(day: number) => waterYearDayToLabel(day, currentYear)}
              ticks={[1, 32, 62, 93, 124, 152, 183, 213, 244, 274, 305, 335]}
              tick={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
              axisLine={{ stroke: theme.borderGray }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}"`}
            />
            <Tooltip content={<CustomTooltip />} cursor={chartCursorStyle} />

            {/* max band (above-normal zone) */}
            <Area
              dataKey="max"
              type="monotone"
              stroke="#3B82F6"
              strokeWidth={1}
              strokeOpacity={0.4}
              fill="url(#bandAbove)"
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
              name="Max"
            />
            {/* p90 erases the above-normal fill below it, replaced by normal band */}
            <Area
              dataKey="p75"
              type="monotone"
              stroke="none"
              fill="url(#bandNormal)"
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
              name="p75"
            />
            {/* p10 erases the normal fill below it, replaced by below-normal band */}
            <Area
              dataKey="p25"
              type="monotone"
              stroke="none"
              fill="url(#bandBelow)"
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
              name="p25"
            />
            {/* min erases below-normal fill below it */}
            <Area
              dataKey="min"
              type="monotone"
              stroke="#EF4444"
              strokeWidth={1}
              strokeOpacity={0.4}
              fill="#FFFFFF"
              fillOpacity={1}
              activeDot={false}
              isAnimationActive={false}
              name="Min"
            />

            {pastYears.map((y, i) =>
              !hiddenYears.has(y.waterYear) ? (
                <Line
                  key={y.waterYear}
                  dataKey={`y${y.waterYear}`}
                  type="monotone"
                  stroke={PAST_YEAR_COLORS[i % PAST_YEAR_COLORS.length]}
                  strokeWidth={1}
                  strokeOpacity={0.45}
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
              stroke="#22C55E"
              strokeWidth={1.5}
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
                stroke={theme.black}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: theme.black, stroke: theme.white, strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
                name={String(currentYear)}
              />
            )}

            {medianPeak && medianPeak.median !== null && (
              <ReferenceDot
                x={medianPeak.wyDay}
                y={medianPeak.median}
                r={0}
                shape={(props: any) => {
                  const { cx, cy } = props;
                  const s = 5;
                  return (
                    <g>
                      <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke="#22C55E" strokeWidth={2} strokeLinecap="round" />
                      <line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} stroke="#22C55E" strokeWidth={2} strokeLinecap="round" />
                    </g>
                  );
                }}
              />
            )}

          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-2 mt-1 border-t" style={{ borderColor: theme.borderGray }}>
        <span className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.gray }}>
          <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
            <line x1="1" y1="1" x2="11" y2="11" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
            <line x1="11" y1="1" x2="1" y2="11" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Median Peak SWE
        </span>

        <span className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.gray }}>
          <span className="inline-block w-5 shrink-0" style={{ height: 1.5, background: "#3B82F6", opacity: 0.7, borderRadius: 1 }} />
          Max
        </span>

        <span className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.gray }}>
          <span className="inline-block w-5 shrink-0" style={{ height: 1.5, background: "#22C55E", borderRadius: 1 }} />
          Median ('91-'20)
        </span>

        <span className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.gray }}>
          <span className="inline-block w-5 shrink-0" style={{ height: 1.5, background: "#EF4444", opacity: 0.7, borderRadius: 1 }} />
          Min
        </span>

        <span className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: theme.mediumGray }}>
          <span className="inline-block w-5 h-2.5 rounded-sm shrink-0" style={{ background: "linear-gradient(to bottom, rgba(59,130,246,0.3), rgba(34,197,94,0.25), rgba(239,68,68,0.2))" }} />
          Stats. Shading
        </span>

        <button
          onClick={() => toggleYear(currentYear)}
          className="flex items-center gap-1.5 font-mono text-[10px] cursor-pointer hover:opacity-70 transition-opacity"
          style={{
            color: hiddenYears.has(currentYear) ? theme.mediumGray : theme.darkGray,
            opacity: hiddenYears.has(currentYear) ? 0.5 : 1,
          }}
        >
          <span className="inline-block w-5 shrink-0" style={{ height: 2, background: theme.black, borderRadius: 1 }} />
          {currentYear}
        </button>

        {pastYears.map((y, i) => (
          <button
            key={y.waterYear}
            onClick={() => toggleYear(y.waterYear)}
            className="flex items-center gap-1.5 font-mono text-[10px] cursor-pointer hover:opacity-70 transition-opacity"
            style={{
              color: hiddenYears.has(y.waterYear) ? theme.mediumGray : theme.gray,
              opacity: hiddenYears.has(y.waterYear) ? 0.4 : 1,
            }}
          >
            <span
              className="inline-block w-5 shrink-0"
              style={{ height: 1.5, background: PAST_YEAR_COLORS[i % PAST_YEAR_COLORS.length], borderRadius: 1 }}
            />
            {y.waterYear}
          </button>
        ))}
      </div>

      <div
        data-export-attr
        className="items-center justify-between pt-2.5 mt-2 border-t font-mono"
        style={{ display: "none", borderColor: theme.borderGray }}
      >
        <span style={{ color: theme.gray, fontSize: "10px" }}>SNOTEL Explorer · snotel.app</span>
        <span style={{ color: theme.mediumGray, fontSize: "10px" }}>Source: USDA NRCS</span>
      </div>
    </div>
  );
}
