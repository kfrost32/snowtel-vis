import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { G, Line, Path, Text as SvgText } from "react-native-svg";
import type { HourlyObservation } from "@snotel/core/types";
import { snowColors } from "@snotel/core/theme";
import { formatHour, formatSnowDepth, formatTemp } from "@snotel/core/formatting";
import { colors } from "@/theme";
import Readout, { Legend } from "./Readout";
import { linePath, niceScale, useScrub } from "./useScrub";

const PANEL = 90;
const GAP = 14;
const AXIS_WIDTH = 34;
const AXIS_HEIGHT = 18;
const HEIGHT = PANEL * 2 + GAP + AXIS_HEIGHT;
const FREEZING = 32;
export const DEPTH_COLOR = "#7AA0DD";
const TEMP_COLOR = "#EA580C";

export default function RecentChart({ data }: { data: HourlyObservation[] }) {
  const [width, setWidth] = useState(0);
  const plotWidth = Math.max(width - AXIS_WIDTH, 1);
  const count = data.length;

  const depthScale = useMemo(() => niceScale(0, Math.max(10, ...data.map((d) => d.snowDepth ?? 0)), 2), [data]);
  const tempScale = useMemo(() => {
    const temps = data.map((d) => d.temp).filter((t): t is number => t !== null);
    return niceScale(Math.min(FREEZING, ...temps), Math.max(FREEZING, ...temps), 2);
  }, [data]);

  const x = (i: number) => (i / Math.max(count - 1, 1)) * plotWidth;
  const depthY = (v: number) => PANEL - (v / depthScale.max) * PANEL;
  const tempY = (v: number) => PANEL + GAP + PANEL - ((v - tempScale.min) / (tempScale.max - tempScale.min)) * PANEL;
  const { index, handlers } = useScrub((px) => Math.min(count - 1, Math.max(0, Math.round((px / plotWidth) * (count - 1)))));

  const focus = data[index ?? count - 1];
  const dayStarts = data.map((d, i) => (d.datetime.endsWith("00:00") ? i : -1)).filter((i) => i >= 0);

  if (!count) return null;

  const depthLine = linePath(data.map((d, i) => (d.snowDepth === null ? null : { x: x(i), y: depthY(d.snowDepth) })));
  const depthArea = depthLine ? `${depthLine}L${x(count - 1)},${PANEL}L${x(0)},${PANEL}Z` : "";

  return (
    <View>
      <Readout
        title={index === null ? "Latest" : formatHour(focus.datetime)}
        items={[
          { label: "Snow depth", value: formatSnowDepth(focus.snowDepth) },
          { label: "Temperature", value: formatTemp(focus.temp), color: focus.temp !== null && focus.temp > FREEZING ? TEMP_COLOR : colors.label },
        ]}
      />
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }} {...handlers}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {dayStarts.map((i) => (
              <G key={i}>
                <Line x1={x(i)} x2={x(i)} y1={0} y2={PANEL * 2 + GAP} stroke={colors.separator} strokeWidth={StyleSheet.hairlineWidth} />
                <SvgText x={x(i) + 3} y={HEIGHT - 4} fontSize={11} fill={colors.secondaryLabel}>
                  {new Date(data[i].datetime.replace(" ", "T")).toLocaleDateString("en-US", { weekday: "short" })}
                </SvgText>
              </G>
            ))}
            <Path d={depthArea} fill={DEPTH_COLOR} fillOpacity={0.25} />
            <Path d={depthLine} stroke={DEPTH_COLOR} strokeWidth={2} fill="none" />
            <SvgText x={plotWidth + 6} y={depthY(depthScale.max) + 10} fontSize={11} fill={colors.secondaryLabel}>{`${depthScale.max}"`}</SvgText>
            <SvgText x={plotWidth + 6} y={PANEL} fontSize={11} fill={colors.secondaryLabel}>0"</SvgText>

            <Line x1={0} x2={plotWidth} y1={tempY(FREEZING)} y2={tempY(FREEZING)} stroke={snowColors.median} strokeWidth={1} strokeDasharray="4 3" />
            <Path d={linePath(data.map((d, i) => (d.temp === null ? null : { x: x(i), y: tempY(d.temp) })))} stroke={TEMP_COLOR} strokeWidth={2} fill="none" />
            <SvgText x={plotWidth + 6} y={tempY(tempScale.max) + 10} fontSize={11} fill={colors.secondaryLabel}>{`${tempScale.max}°`}</SvgText>
            <SvgText x={plotWidth + 6} y={tempY(FREEZING) + 4} fontSize={11} fill={colors.secondaryLabel}>32°</SvgText>
            <SvgText x={plotWidth + 6} y={tempY(tempScale.min)} fontSize={11} fill={colors.secondaryLabel}>{`${tempScale.min}°`}</SvgText>

            {index !== null && (
              <Line x1={x(index)} x2={x(index)} y1={0} y2={PANEL * 2 + GAP} stroke={colors.label} strokeWidth={1} />
            )}
          </Svg>
        )}
      </View>
      <Legend
        items={[
          { label: "Snow depth", color: DEPTH_COLOR },
          { label: "Temperature", color: TEMP_COLOR },
          { label: "Freezing", color: snowColors.median, dashed: true },
        ]}
      />
    </View>
  );
}
