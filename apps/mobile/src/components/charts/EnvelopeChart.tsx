import { useMemo, useState } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import Svg, { G, Line, Path, Text as SvgText } from "react-native-svg";
import type { EnvelopeDay } from "@snotel/core/types";
import { percentileBands, snowColors } from "@snotel/core/theme";
import { getCurrentWaterYear, waterYearDayToLabel } from "@snotel/core/water-year";
import { colors } from "@/theme";
import Readout, { Legend } from "./Readout";
import { linePath, niceScale, useScrub } from "./useScrub";

interface EnvelopeChartProps {
  envelope: EnvelopeDay[];
  seasonMap: Map<number, number>;
  todayWyDay: number | null;
  peakDay: number;
  peakValue: number;
  format: (v: number | null) => string;
  axisLabel: (v: number) => string;
}

const HEIGHT = 200;
const AXIS_WIDTH = 30;
const AXIS_HEIGHT = 18;
const TOP_PAD = 8;
const MONTH_TICKS = [1, 32, 62, 93, 124, 152, 183, 213, 244, 274, 305, 336];
const MONTH_LABELS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

type Accessor = (d: EnvelopeDay) => number | null | undefined;

const BANDS: [Accessor, Accessor][] = [
  [(e) => e.min, (e) => e.p10],
  [(e) => e.p10, (e) => e.p30],
  [(e) => e.p30, (e) => e.p70],
  [(e) => e.p70, (e) => e.p90],
  [(e) => e.p90, (e) => e.max],
];

export default function EnvelopeChart({ envelope, seasonMap, todayWyDay, peakDay, peakValue, format, axisLabel }: EnvelopeChartProps) {
  const dark = useColorScheme() === "dark";
  const [width, setWidth] = useState(0);
  const wy = getCurrentWaterYear();
  const plotWidth = Math.max(width - AXIS_WIDTH, 1);
  const plotHeight = HEIGHT - AXIS_HEIGHT - TOP_PAD;
  const dayCount = envelope.length || 365;

  const scale = useMemo(() => {
    let top = peakValue;
    for (const d of envelope) top = Math.max(top, d.max ?? 0);
    for (const v of seasonMap.values()) top = Math.max(top, v);
    return niceScale(0, top);
  }, [envelope, seasonMap, peakValue]);

  const x = (day: number) => ((day - 1) / (dayCount - 1)) * plotWidth;
  const y = (v: number) => TOP_PAD + plotHeight - (v / scale.max) * plotHeight;
  const series = (get: Accessor) => linePath(envelope.map((e) => (get(e) == null ? null : { x: x(e.wyDay), y: y(get(e)!) })));
  const band = (low: Accessor, high: Accessor) => {
    const pts = envelope.filter((e) => low(e) != null && high(e) != null);
    if (!pts.length) return "";
    const top = pts.map((e) => `${x(e.wyDay).toFixed(1)},${y(high(e)!).toFixed(1)}`);
    const bottom = [...pts].reverse().map((e) => `${x(e.wyDay).toFixed(1)},${y(low(e)!).toFixed(1)}`);
    return `M${top.join("L")}L${bottom.join("L")}Z`;
  };

  const { index, handlers } = useScrub((px) => Math.min(dayCount, Math.max(1, Math.round((px / plotWidth) * (dayCount - 1)) + 1)));
  const focusDay = index ?? todayWyDay;
  const focus = focusDay !== null ? envelope[focusDay - 1] : undefined;
  const yTicks = Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, i) => i * scale.step);

  return (
    <View>
      <Readout
        title={focusDay === null ? " " : index === null ? "Today" : waterYearDayToLabel(focusDay, wy)}
        items={[
          { label: "This year", value: format(focusDay !== null ? seasonMap.get(focusDay) ?? null : null) },
          { label: "Median", value: format(focus?.median ?? null), color: snowColors.median },
          ...(focus?.p30 != null && focus?.p70 != null
            ? [{ label: "Normal range", value: `${format(focus.p30)}–${format(focus.p70)}`, color: colors.secondaryLabel }]
            : []),
        ]}
      />
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }} {...handlers}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {yTicks.map((t) => (
              <G key={t}>
                <Line x1={0} x2={plotWidth} y1={y(t)} y2={y(t)} stroke={colors.separator} strokeWidth={StyleSheet.hairlineWidth} />
                <SvgText x={plotWidth + 6} y={y(t) + 4} fontSize={11} fill={colors.secondaryLabel}>{axisLabel(t)}</SvgText>
              </G>
            ))}
            {MONTH_TICKS.map((day, i) =>
              i % 2 === 0 ? (
                <SvgText key={day} x={x(day)} y={HEIGHT - 4} fontSize={11} fill={colors.secondaryLabel}>{MONTH_LABELS[i]}</SvgText>
              ) : null
            )}
            {BANDS.map(([low, high], i) => (
              <Path key={percentileBands[i].key} d={band(low, high)} fill={percentileBands[i].color} fillOpacity={dark ? 0.45 : 0.85} />
            ))}
            <Path d={series((e) => e.max)} stroke={snowColors.envelopeMax} strokeWidth={1.25} fill="none" />
            <Path d={series((e) => e.min)} stroke={snowColors.envelopeMin} strokeWidth={1.25} fill="none" />
            <Path d={series((e) => e.median)} stroke={snowColors.median} strokeWidth={1.5} strokeDasharray="6 3" fill="none" />
            {peakValue > 0 && (
              <G stroke={snowColors.medianPeak} strokeWidth={2}>
                <Line x1={x(peakDay) - 5} y1={y(peakValue) - 5} x2={x(peakDay) + 5} y2={y(peakValue) + 5} />
                <Line x1={x(peakDay) + 5} y1={y(peakValue) - 5} x2={x(peakDay) - 5} y2={y(peakValue) + 5} />
              </G>
            )}
            <Path
              d={linePath(envelope.map((e) => {
                const v = seasonMap.get(e.wyDay);
                return v === undefined ? null : { x: x(e.wyDay), y: y(v) };
              }))}
              stroke={colors.label}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
            {focusDay !== null && (
              <Line
                x1={x(focusDay)}
                x2={x(focusDay)}
                y1={TOP_PAD}
                y2={TOP_PAD + plotHeight}
                stroke={index !== null ? colors.label : colors.tertiaryLabel}
                strokeWidth={1}
                strokeDasharray={index !== null ? undefined : "3 3"}
              />
            )}
          </Svg>
        )}
      </View>
      <Legend
        items={[
          { label: "This year", color: colors.label },
          { label: "Median", color: snowColors.median, dashed: true },
          {
            label: "Percentiles",
            color: colors.label,
            swatch: (
              <View style={styles.bandSwatch}>
                {percentileBands.map((b) => (
                  <View key={b.key} style={[styles.bandCell, { backgroundColor: b.color }]} />
                ))}
              </View>
            ),
          },
          { label: "Median peak", color: snowColors.medianPeak, swatch: <Text style={styles.peakSwatch}>✕</Text> },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bandSwatch: { flexDirection: "row", borderRadius: 2, overflow: "hidden" },
  bandCell: { width: 5, height: 10 },
  peakSwatch: { fontSize: 11, fontWeight: "700", color: snowColors.medianPeak },
});
