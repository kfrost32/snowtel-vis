import { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { computeBasinSummaries } from "@snotel/core/basins";
import { HUC2_NAMES, HUC4_NAMES } from "@snotel/core/huc-names";
import { statsAt } from "@snotel/core/station-stats";
import { getWaterYearDay } from "@snotel/core/water-year";
import { getConditionColor, getConditionLabel } from "@snotel/core/colors";
import { formatPctOfNormal, formatReadingEndOfDay, formatSwe } from "@snotel/core/formatting";
import DetailHeader from "@/components/DetailHeader";
import EnvelopeChart from "@/components/charts/EnvelopeChart";
import Section from "@/components/Section";
import StationRow from "@/components/StationRow";
import { Hero, Row } from "@/components/Summary";
import { useRegionDetail, useStationList } from "@/hooks/data";
import { colors } from "@/theme";

export default function RegionScreen() {
  const { huc } = useLocalSearchParams<{ huc: string }>();
  const level = huc.length === 2 ? 2 : 4;
  const { stations } = useStationList();
  const { envelope, seasonMap, years, loading } = useRegionDetail(huc);

  const basin = useMemo(
    () => (stations ? computeBasinSummaries(stations, level).find((b) => b.huc === huc) ?? null : null),
    [stations, level, huc]
  );
  const name = basin?.name ?? (level === 2 ? HUC2_NAMES : HUC4_NAMES)[huc] ?? `Region ${huc}`;
  const stats = useMemo(() => {
    if (!envelope || !basin?.asOf) return null;
    return statsAt(basin.asOf, seasonMap.get(getWaterYearDay(basin.asOf)) ?? null, basin.medianPctOfNormal, envelope, years);
  }, [envelope, basin, seasonMap, years]);
  const sorted = useMemo(
    () => [...(basin?.stations ?? [])].sort((a, b) => (b.pctOfNormal ?? -1) - (a.pctOfNormal ?? -1)),
    [basin]
  );

  const pct = basin?.medianPctOfNormal ?? null;
  const pctColor = pct !== null ? getConditionColor(pct) : colors.secondaryLabel;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <DetailHeader
        title={name}
        subtitle={[
          level === 2 ? "Region" : "Sub-region",
          basin && `${basin.indexStationCount} of ${basin.stationCount} stations`,
          basin?.asOf && formatReadingEndOfDay(basin.asOf),
        ]}
      />

      {!basin ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <>
          <Section>
            <Hero value={formatPctOfNormal(pct)} color={pctColor} caption={pct !== null ? getConditionLabel(pct) : "No median yet"} />
            <Row label="Average SWE" value={formatSwe(basin.avgSwe)} detail={stats ? `median ${formatSwe(stats.medianAtDay)}` : undefined} />
            <Row label="Percentile" value={stats?.percentile != null ? String(stats.percentile) : "—"} detail="vs. all years today" />
            <Row
              label="Median peak"
              value={formatPctOfNormal(stats?.pctOfMedianPeak ?? null)}
              detail={stats ? `${Math.abs(stats.daysUntilPeak)}d ${stats.daysUntilPeak >= 0 ? "to go" : "past"}` : undefined}
              last
            />
          </Section>

          {loading ? (
            <ActivityIndicator />
          ) : envelope ? (
            <Section title="Snow Water Equivalent">
              <EnvelopeChart
                envelope={envelope.envelope}
                seasonMap={seasonMap}
                todayWyDay={basin.asOf ? getWaterYearDay(basin.asOf) : null}
                peakDay={envelope.medianPeakDay}
                peakValue={envelope.medianPeakSwe}
                format={formatSwe}
                axisLabel={(v) => `${v}"`}
              />
            </Section>
          ) : null}

          <View style={styles.stations}>
            <Text style={styles.sectionTitle}>Stations</Text>
            <View style={styles.group}>
              {sorted.map((s, i) => (
                <StationRow key={s.triplet} station={s} conditions={s} last={i === sorted.length - 1} />
              ))}
            </View>
          </View>

          <Text style={styles.footer}>Regional index is total SWE over total median SWE for reporting stations · USDA NRCS</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 48, gap: 24 },
  loading: { marginTop: 40 },
  stations: { gap: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.label, paddingHorizontal: 4 },
  group: { borderRadius: 26, overflow: "hidden" },
  footer: { fontSize: 12, color: colors.tertiaryLabel, textAlign: "center", paddingHorizontal: 16 },
});
