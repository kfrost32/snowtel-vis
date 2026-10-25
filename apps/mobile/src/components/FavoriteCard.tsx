import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import type { HourlyObservation, Station } from "@snotel/core/types";
import { urlTriplet } from "@snotel/core/stations";
import { formatDepthChange, formatElevation, formatSnowDepth, formatSwe } from "@snotel/core/formatting";
import { getDepthChangeColor } from "@snotel/core/colors";
import { lastStorm } from "@snotel/core/storm";
import { useStationConditions, useStationHourly } from "@/hooks/data";
import { toggleFavorite } from "@/lib/favorites";
import { DEPTH_COLOR } from "@/components/charts/RecentChart";
import { linePath } from "@/components/charts/useScrub";
import { colors, numeric } from "@/theme";

const CHART_HEIGHT = 88;
const AXIS_HEIGHT = 16;
const PLOT_BOTTOM = CHART_HEIGHT - AXIS_HEIGHT;
const CHART_PAD_TOP = 18;
const SMOOTH_HOURS = 2;
const DOT_INSET = 7;
const DATE_LABEL_HALF = 14;
const CHART_DAYS = 5;

function toTime(datetime: string): number {
  return Date.parse(datetime.replace(" ", "T") + ":00Z");
}

function lastDays(data: HourlyObservation[], days: number): HourlyObservation[] {
  if (!data.length) return data;
  const start = toTime(data[data.length - 1].datetime) - days * 24 * 60 * 60 * 1000;
  return data.filter((d) => toTime(d.datetime) >= start);
}

function smoothed(data: HourlyObservation[]): (number | null)[] {
  return data.map((_, i) => {
    const window = data.slice(Math.max(0, i - SMOOTH_HOURS), i + SMOOTH_HOURS + 1).flatMap((d) => (d.snowDepth === null ? [] : [d.snowDepth]));
    return window.length ? window.reduce((a, b) => a + b, 0) / window.length : null;
  });
}

function DepthSparkline({ data }: { data: HourlyObservation[] }) {
  const [width, setWidth] = useState(0);
  const values = useMemo(() => smoothed(data), [data]);
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return <View style={{ height: CHART_HEIGHT }} />;

  const min = Math.max(0, Math.min(...known) - 2);
  const max = Math.max(...known) + 1;
  const times = data.map((d) => toTime(d.datetime));
  const span = Math.max(times[times.length - 1] - times[0], 1);
  const x = (i: number) => ((times[i] - times[0]) / span) * (width - DOT_INSET);
  const y = (v: number) => CHART_PAD_TOP + (1 - (v - min) / (max - min)) * (PLOT_BOTTOM - CHART_PAD_TOP - 4);
  const line = linePath(values.map((v, i) => (v === null ? null : { x: x(i), y: y(v) })));
  const lastIndex = values.findLastIndex((v) => v !== null);
  const peakIndex = values.indexOf(Math.max(...known));
  const firstIndex = values.findIndex((v) => v !== null);
  const peakLabelX = Math.min(Math.max(x(peakIndex), 14), width - 14);
  const dayStarts = data.map((d, i) => (d.datetime.endsWith("00:00") && i > 0 ? i : -1)).filter((i) => i >= 0);
  const labeledDays = dayStarts.filter((i) => x(i) >= DATE_LABEL_HALF && x(i) <= width - DATE_LABEL_HALF);

  return (
    <View style={{ height: CHART_HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="depthFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={DEPTH_COLOR} stopOpacity={0.35} />
              <Stop offset="1" stopColor={DEPTH_COLOR} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {dayStarts.map((i) => (
            <Line key={`day-${i}`} x1={x(i)} x2={x(i)} y1={CHART_PAD_TOP - 6} y2={PLOT_BOTTOM} stroke={colors.separator} strokeWidth={StyleSheet.hairlineWidth} />
          ))}
          {labeledDays.map((i) => (
            <SvgText key={`label-${i}`} x={x(i)} y={CHART_HEIGHT - 3} fontSize={11} textAnchor="middle" fill={colors.tertiaryLabel}>
              {`${Number(data[i].datetime.slice(5, 7))}/${Number(data[i].datetime.slice(8, 10))}`}
            </SvgText>
          ))}
          <Path d={`${line}L${x(lastIndex)},${PLOT_BOTTOM}L${x(firstIndex)},${PLOT_BOTTOM}Z`} fill="url(#depthFill)" />
          <Path d={line} stroke={DEPTH_COLOR} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {firstIndex !== peakIndex && (
            <SvgText x={0} y={y(values[firstIndex]!) - 7} fontSize={11} fontWeight="600" fill={colors.secondaryLabel}>
              {formatSnowDepth(data[firstIndex].snowDepth ?? values[firstIndex])}
            </SvgText>
          )}
          {peakIndex !== lastIndex && (
            <>
              <Circle cx={x(peakIndex)} cy={y(values[peakIndex]!)} r={3} fill={colors.cell} stroke={DEPTH_COLOR} strokeWidth={2} />
              <SvgText x={peakLabelX} y={y(values[peakIndex]!) - 7} fontSize={11} fontWeight="600" textAnchor="middle" fill={colors.secondaryLabel}>
                {formatSnowDepth(data[peakIndex].snowDepth ?? values[peakIndex])}
              </SvgText>
            </>
          )}
          <Circle cx={x(lastIndex)} cy={y(values[lastIndex]!)} r={4.5} fill={DEPTH_COLOR} stroke={colors.cell} strokeWidth={2} />
        </Svg>
      )}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, numeric, color !== undefined && { color }]}>{value}</Text>
    </View>
  );
}

export default function FavoriteCard({ station, detail }: { station: Station; detail?: string }) {
  const conditions = useStationConditions(station.triplet);
  const hourly = useStationHourly(station.triplet);
  const storm = useMemo(() => (hourly ? lastStorm(hourly) : null), [hourly]);
  const recent = useMemo(() => (hourly ? lastDays(hourly, CHART_DAYS) : null), [hourly]);
  const change = conditions?.depthChange1d ?? null;

  return (
    <Link href={`/station/${urlTriplet(station.triplet)}`} asChild>
      <Link.Trigger>
        <Pressable style={styles.card}>
          <View style={styles.header}>
            <View style={styles.title}>
              <Text style={styles.name} numberOfLines={1}>{station.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[station.state, formatElevation(station.elevation), detail].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <Text style={[styles.depth, numeric]}>{formatSnowDepth(conditions?.snowDepth ?? null)}</Text>
          </View>

          <View style={styles.chart}>
            {recent && recent.length > 1 ? <DepthSparkline data={recent} /> : <View style={{ height: CHART_HEIGHT }} />}
          </View>

          <View style={styles.stats}>
            <Stat label="SWE" value={formatSwe(conditions?.swe ?? null)} />
            <Stat label="24h" value={formatDepthChange(change)} color={change ? getDepthChangeColor(change) : undefined} />
            <Stat label="Last storm" value={storm ? `+${formatSnowDepth(storm.newSnow)}` : "—"} />
          </View>
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        <Link.MenuAction
          icon="star.slash"
          onPress={() => {
            Haptics.selectionAsync();
            toggleFavorite(station.triplet);
          }}
        >
          Remove Favorite
        </Link.MenuAction>
      </Link.Menu>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cell, borderRadius: 26, borderCurve: "continuous", paddingTop: 16, paddingBottom: 14, gap: 10, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 18 },
  title: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: "600", color: colors.label },
  meta: { fontSize: 13, color: colors.secondaryLabel },
  depth: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, color: colors.label },
  chart: { paddingHorizontal: 18 },
  stats: { flexDirection: "row", marginHorizontal: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  stat: { flex: 1, gap: 2 },
  statLabel: { fontSize: 13, color: colors.secondaryLabel },
  statValue: { fontSize: 17, fontWeight: "600", color: colors.label },
});
