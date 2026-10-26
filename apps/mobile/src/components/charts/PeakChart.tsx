import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import type { WaterYearSummary } from "@snotel/core/types";
import { snowColors } from "@snotel/core/theme";
import { formatDate, formatSwe } from "@snotel/core/formatting";
import { getCurrentWaterYear } from "@snotel/core/water-year";
import { colors } from "@/theme";
import Readout, { Legend } from "./Readout";
import { niceScale, useScrub } from "./useScrub";
import { formatAxisLength } from "@snotel/core/units";

const HEIGHT = 160;
const AXIS_WIDTH = 30;
const AXIS_HEIGHT = 18;
const TOP_PAD = 8;
const PAST_COLOR = "#7AA0DD";

export default function PeakChart({ peaks, medianPeak }: { peaks: WaterYearSummary[]; medianPeak: number }) {
  const [width, setWidth] = useState(0);
  const currentWy = getCurrentWaterYear();
  const data = useMemo(() => [...peaks].sort((a, b) => a.waterYear - b.waterYear), [peaks]);
  const scale = useMemo(() => niceScale(0, Math.max(medianPeak, ...data.map((p) => p.peakSwe))), [data, medianPeak]);

  const plotWidth = Math.max(width - AXIS_WIDTH, 1);
  const plotHeight = HEIGHT - AXIS_HEIGHT - TOP_PAD;
  const slot = plotWidth / Math.max(data.length, 1);
  const y = (v: number) => TOP_PAD + plotHeight - (v / scale.max) * plotHeight;
  const { index, handlers } = useScrub((px) => Math.min(data.length - 1, Math.max(0, Math.floor(px / slot))));

  const focus = data[index ?? data.length - 1];
  const yTicks = Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, i) => i * scale.step);
  const labelEvery = Math.ceil(data.length / 5);

  if (!data.length) return null;

  return (
    <View>
      <Readout
        title={focus.waterYear === currentWy ? `WY ${focus.waterYear} so far` : `WY ${focus.waterYear}`}
        items={[
          { label: "Peak", value: formatSwe(focus.peakSwe) },
          { label: "Date", value: formatDate(focus.peakSweDate), color: colors.secondaryLabel },
          { label: "vs. median peak", value: medianPeak > 0 ? `${Math.round((focus.peakSwe / medianPeak) * 100)}%` : "—", color: colors.secondaryLabel },
        ]}
      />
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }} {...handlers}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {yTicks.map((t) => (
              <G key={t}>
                <Line x1={0} x2={plotWidth} y1={y(t)} y2={y(t)} stroke={colors.separator} strokeWidth={StyleSheet.hairlineWidth} />
                <SvgText x={plotWidth + 6} y={y(t) + 4} fontSize={11} fill={colors.secondaryLabel}>{formatAxisLength(t)}</SvgText>
              </G>
            ))}
            {data.map((p, i) => {
              const selected = index === i;
              const current = p.waterYear === currentWy;
              return (
                <Rect
                  key={p.waterYear}
                  x={i * slot + slot * 0.15}
                  y={y(p.peakSwe)}
                  width={slot * 0.7}
                  height={Math.max(TOP_PAD + plotHeight - y(p.peakSwe), 1)}
                  rx={Math.min(slot * 0.2, 2)}
                  fill={current ? colors.label : PAST_COLOR}
                  opacity={index === null || selected ? 1 : 0.45}
                />
              );
            })}
            {medianPeak > 0 && (
              <Line x1={0} x2={plotWidth} y1={y(medianPeak)} y2={y(medianPeak)} stroke={snowColors.medianPeak} strokeWidth={1.5} strokeDasharray="5 3" />
            )}
            {data.map((p, i) =>
              i % labelEvery === 0 ? (
                <SvgText key={p.waterYear} x={i * slot + slot / 2} y={HEIGHT - 4} fontSize={11} fill={colors.secondaryLabel} textAnchor="middle">
                  {String(p.waterYear)}
                </SvgText>
              ) : null
            )}
          </Svg>
        )}
      </View>
      <Legend
        items={[
          { label: "Past years", color: PAST_COLOR, swatch: <View style={[styles.bar, { backgroundColor: PAST_COLOR }]} /> },
          { label: "This year", color: colors.label, swatch: <View style={[styles.bar, { backgroundColor: colors.label }]} /> },
          { label: "Median peak", color: snowColors.medianPeak, dashed: true },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { width: 8, height: 10, borderRadius: 2 },
});
