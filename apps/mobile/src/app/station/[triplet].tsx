import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View, type ColorValue } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { STATE_NAMES } from "@snotel/core/constants";
import * as Haptics from "expo-haptics";
import { getStation, parseTripletFromUrl, stationDataNote, stationSource, urlTriplet } from "@snotel/core/stations";
import * as WebBrowser from "expo-web-browser";
import { DELTA_DAYS, envelopeStats, seasonDeltas, statsAt } from "@snotel/core/station-stats";
import { buildSeasonMap } from "@snotel/core/season";
import { getWaterYearDay } from "@snotel/core/water-year";
import { getChangeColor, getConditionColor, getConditionLabel, getDepthChangeColor } from "@snotel/core/colors";
import {
  formatChange,
  formatDepthChange,
  formatElevation,
  formatHourlyTime,
  formatPctOfNormal,
  formatPrecip,
  formatReadingEndOfDay,
  formatSnowDepth,
  formatSwe,
} from "@snotel/core/formatting";
import { noComparisonReason } from "@snotel/core/map-style";
import { lastStorm } from "@snotel/core/storm";
import EnvelopeChart from "@/components/charts/EnvelopeChart";
import PeakChart from "@/components/charts/PeakChart";
import RecentChart from "@/components/charts/RecentChart";
import DetailHeader, { HeaderButton } from "@/components/DetailHeader";
import Section from "@/components/Section";
import StormCard from "@/components/StormCard";
import ForecastCard from "@/components/ForecastCard";
import { Hero, PaceCard, Row, summaryStyles } from "@/components/Summary";
import { useStationConditions, useStationDetail, useStationForecast, useStationHourly } from "@/hooks/data";
import { toggleFavorite, useIsFavorite } from "@/lib/favorites";
import { webUrl } from "@/lib/api";
import { colors, numeric } from "@/theme";
import { formatAxisLength } from "@snotel/core/units";
import { useUnitsKey } from "@/lib/app-settings";

export default function StationScreen() {
  const units = useUnitsKey();
  const params = useLocalSearchParams<{ triplet: string }>();
  const triplet = parseTripletFromUrl(params.triplet);
  const station = getStation(triplet);
  const favorite = useIsFavorite(triplet);
  const conditions = useStationConditions(triplet);
  const hourly = useStationHourly(triplet);
  const { forecast } = useStationForecast(triplet);
  const { season, envelope, years, peaks, loading } = useStationDetail(triplet);

  const sweMap = useMemo(() => buildSeasonMap(season?.season ?? []), [season]);
  const depthMap = useMemo(() => buildSeasonMap(season?.season ?? [], (d) => d.snowDepth), [season]);
  const stats = useMemo(() => {
    if (season) return envelopeStats(season, envelope, years);
    if (!conditions || !envelope) return null;
    return statsAt(conditions.lastUpdated, conditions.swe, conditions.pctOfNormal, envelope, years);
  }, [season, conditions, envelope, years]);
  const deltas = useMemo(() => {
    const daily = season
      ? seasonDeltas(season.season)
      : {
          swe: [conditions?.sweChange1d ?? null, conditions?.sweChange3d ?? null, conditions?.sweChange7d ?? null],
          depth: [conditions?.depthChange1d ?? null, conditions?.depthChange3d ?? null, conditions?.depthChange7d ?? null],
        };
    return conditions?.depthAt ? { ...daily, depth: [conditions.depthChange1d ?? null, ...daily.depth.slice(1)] } : daily;
  }, [season, conditions]);
  const current = season?.current ?? conditions;
  const todayWyDay = current?.lastUpdated ? getWaterYearDay(current.lastUpdated) : null;

  const pct = current?.pctOfNormal ?? null;
  const pctColor = pct !== null ? getConditionColor(pct) : colors.secondaryLabel;
  const pctCaption = pct !== null ? getConditionLabel(pct) : (conditions && noComparisonReason(conditions)) ?? "No median yet";
  const depth = conditions?.depthAt ? conditions.snowDepth : current?.snowDepth ?? null;
  const depthChange = deltas.depth[0];
  const storm = useMemo(() => (hourly ? lastStorm(hourly) : null), [hourly]);

  const subtitle = station ? [STATE_NAMES[station.state] ?? station.state, formatElevation(station.elevation)] : undefined;

  const header = (
    <DetailHeader title={station?.name ?? "Station"} subtitle={subtitle}>
      <HeaderButton
        icon={favorite ? "star.fill" : "star"}
        tint={favorite ? colors.favorite : undefined}
        label={favorite ? "Remove from favorites" : "Add to favorites"}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          toggleFavorite(triplet);
        }}
      />
      <HeaderButton
        icon="square.and.arrow.up"
        label="Share"
        onPress={() => Share.share({ url: webUrl(`/station/${urlTriplet(triplet)}`) })}
      />
    </DetailHeader>
  );

  if (!station) {
    return (
      <View style={[styles.content, styles.fill]}>
        {header}
        <Text style={styles.secondary}>Station not found</Text>
      </View>
    );
  }

  const source = stationSource(station);
  const dataNote = stationDataNote(station);

  return (
    <ScrollView key={units} contentContainerStyle={styles.content}>
      {header}

      {dataNote && <Text style={styles.note}>{dataNote}</Text>}

      {loading && !current ? (
        <ActivityIndicator style={styles.loading} />
      ) : !current ? (
        <Text style={[styles.secondary, styles.loading]}>No current data for this station.</Text>
      ) : (
        <>
          <Section>
            {depth !== null ? (
              <Hero
                value={formatSnowDepth(depth)}
                label={conditions?.depthAt ? `snow depth · ${formatHourlyTime(conditions.depthAt)}` : "snow depth"}
                caption={depthChange !== null ? `${formatDepthChange(depthChange)} in 24h` : undefined}
                captionColor={getDepthChangeColor(depthChange)}
              />
            ) : (
              <Hero value={formatSwe(current.swe)} label="snow water equivalent" />
            )}
            <View style={styles.changeHeader}>
              <Text style={[styles.changeLabel, styles.changeFirst]} />
              {DELTA_DAYS.map((d) => (
                <Text key={d} style={styles.changeLabel}>{d === 1 ? "24h" : `${d} days`}</Text>
              ))}
            </View>
            <ChangeRow label="SWE" values={deltas.swe} format={formatChange} color={getChangeColor} />
            <ChangeRow label="Snow depth" values={deltas.depth} format={formatDepthChange} color={getDepthChangeColor} last />
          </Section>

          {storm && <StormCard storm={storm} />}

          {forecast && forecast.days.length > 0 && <ForecastCard forecast={forecast} station={station} />}

          {hourly && hourly.length > 0 && (
            <Section title="Last 7 Days">
              <RecentChart data={hourly} />
            </Section>
          )}

          <PaceCard name={station.name} stats={stats} />

          <Section title="Snowpack" footer={current.lastUpdated && `Daily readings as of ${formatReadingEndOfDay(current.lastUpdated)}`}>
            <Row label="Snow water equivalent" value={formatSwe(current.swe)} detail={stats ? `median ${formatSwe(stats.medianAtDay)}` : undefined} />
            <Row label="% of median" value={formatPctOfNormal(pct)} detail={pctCaption} valueColor={pctColor} />
            <Row label="Percentile" value={stats?.percentile != null ? String(stats.percentile) : "—"} detail="vs. all years today" />
            <Row
              label="Median peak"
              value={formatPctOfNormal(stats?.pctOfMedianPeak ?? null)}
              detail={stats ? `${Math.abs(stats.daysUntilPeak)}d ${stats.daysUntilPeak >= 0 ? "to go" : "past"}` : undefined}
            />
            <Row label="Precipitation" value={formatPrecip(current.precipAccum)} detail="water year" last />
          </Section>

          {envelope && (
            <Section title="Snow Water Equivalent">
              <EnvelopeChart
                envelope={envelope.envelope}
                seasonMap={sweMap}
                todayWyDay={todayWyDay}
                peakDay={envelope.medianPeakDay}
                peakValue={envelope.medianPeakSwe}
                format={formatSwe}
                axisLabel={formatAxisLength}
              />
            </Section>
          )}

          {envelope && envelope.depthEnvelope.some((d) => d.median !== null) && (
            <Section title="Snow Depth">
              <EnvelopeChart
                envelope={envelope.depthEnvelope}
                seasonMap={depthMap}
                todayWyDay={todayWyDay}
                peakDay={envelope.medianPeakDepthDay}
                peakValue={envelope.medianPeakDepth}
                format={formatSnowDepth}
                axisLabel={formatAxisLength}
              />
            </Section>
          )}

          {peaks.length > 0 && envelope && (
            <Section title="Peak SWE by Year">
              <PeakChart peaks={peaks} medianPeak={envelope.medianPeakSwe} />
            </Section>
          )}

          <Pressable onPress={() => WebBrowser.openBrowserAsync(source.url)} hitSlop={8}>
            <Text style={styles.footer}>
              {station.triplet} · Data from {source.name} · <Text style={styles.footerLink}>View on {source.label}</Text>
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function ChangeRow({
  label,
  values,
  format,
  color,
  last,
}: {
  label: string;
  values: (number | null)[];
  format: (v: number | null) => string;
  color: (v: number | null) => ColorValue;
  last?: boolean;
}) {
  return (
    <View style={[styles.changeRow, !last && summaryStyles.divider]}>
      <Text style={[summaryStyles.rowLabel, styles.changeFirst]}>{label}</Text>
      {values.map((v, i) => (
        <Text key={i} style={[styles.changeValue, numeric, { color: color(v) }]}>{format(v)}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 48, gap: 24 },
  fill: { flex: 1 },
  secondary: { fontSize: 15, color: colors.secondaryLabel },
  loading: { marginTop: 40, textAlign: "center" },
  changeHeader: { flexDirection: "row", paddingBottom: 6 },
  changeRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
  changeFirst: { flex: 1.4 },
  changeLabel: { flex: 1, fontSize: 12, fontWeight: "600", color: colors.secondaryLabel, textAlign: "right" },
  changeValue: { flex: 1, fontSize: 16, fontWeight: "600", textAlign: "right" },
  note: { fontSize: 13, color: colors.secondaryLabel },
  footer: { fontSize: 12, color: colors.tertiaryLabel, textAlign: "center" },
  footerLink: { color: colors.tint },
});
