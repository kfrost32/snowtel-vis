import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { Host, Picker, Text as SwiftText } from "@expo/ui/swift-ui";
import { controlSize, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { getPlaceholderConditions, urlTriplet } from "@snotel/core/stations";
import { computeBasinSummaries } from "@snotel/core/basins";
import { filterStations } from "@snotel/core/filters";
import { regionMarkers } from "@snotel/core/map-style";
import { getAllSpots } from "@snotel/core/spots";
import { dataAsOfLabel, withRecentDepth } from "@snotel/core/recent";
import StationMap from "@/components/StationMap";
import { useRecentConditions, useStationList } from "@/hooks/data";
import { activeFilterCount, updateMapSettings, useMapSettings } from "@/lib/map-settings";
import { colors } from "@/theme";

const METRICS = [
  { key: "WTEQ_PCT", label: "% Median" },
  { key: "WTEQ", label: "SWE" },
  { key: "SNWD", label: "Depth" },
  { key: "SNWD_CHANGE_1D", label: "24h" },
];

const SPOTS = getAllSpots();

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const settings = useMapSettings();
  const { stations: daily, loading, stale } = useStationList();
  const recent = useRecentConditions();
  const stations = useMemo(() => (daily ? withRecentDepth(daily, recent) : null), [daily, recent]);
  const metric = settings.metric;
  const caption = useMemo(() => (daily ? dataAsOfLabel(metric, daily, recent) : null), [metric, daily, recent]);
  const filterCount = activeFilterCount(settings);
  const scrim = useColorScheme() === "dark" ? "#000000" : "#FFFFFF";

  const visible = useMemo(
    () => filterStations(stations ?? getPlaceholderConditions(), settings, stations !== null),
    [stations, settings]
  );
  const regions = useMemo(
    () => ({
      2: stations ? regionMarkers(computeBasinSummaries(stations, 2)) : [],
      4: stations ? regionMarkers(computeBasinSummaries(stations, 4)) : [],
    }),
    [stations]
  );

  return (
    <View style={styles.container}>
      <StationMap
        stations={visible}
        metric={metric}
        regions={regions}
        spots={SPOTS}
        show={{
          stations: settings.showStations,
          regions: settings.showRegions,
          subregions: settings.showSubregions,
          spots: settings.showSpots,
        }}
        onSelect={(s) => router.push(s.kind === "station" ? `/station/${urlTriplet(s.triplet)}` : `/region/${s.huc}`)}
      />
      <Svg style={[styles.scrim, { height: insets.top + 96 }]} pointerEvents="none">
        <Defs>
          <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={scrim} stopOpacity={0.9} />
            <Stop offset="0.6" stopColor={scrim} stopOpacity={0.7} />
            <Stop offset="1" stopColor={scrim} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#scrim)" />
      </Svg>
      <View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Host matchContents={{ vertical: true }} style={styles.picker}>
          <Picker
            selection={metric}
            onSelectionChange={(metric: string) => updateMapSettings({ metric })}
            modifiers={[pickerStyle("segmented"), controlSize("large")]}
          >
            {METRICS.map((m) => (
              <SwiftText key={m.key} modifiers={[tag(m.key)]}>{m.label}</SwiftText>
            ))}
          </Picker>
        </Host>
        <View style={styles.row} pointerEvents="box-none">
          {(loading || stale) ? (
            <GlassView style={styles.status} glassEffectStyle="regular">
              <ActivityIndicator size="small" />
              <Text style={styles.statusText}>Updating conditions</Text>
            </GlassView>
          ) : caption ? (
            <GlassView style={styles.status} glassEffectStyle="regular">
              <Text style={styles.statusText}>{caption}</Text>
            </GlassView>
          ) : <View />}
          <Pressable onPress={() => router.push("/layers")} accessibilityRole="button" accessibilityLabel="Map layers and filters" hitSlop={6}>
            <GlassView style={styles.layersButton} glassEffectStyle="regular" isInteractive>
              <SymbolView name="square.3.layers.3d" size={20} tintColor={colors.label} />
              {filterCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{filterCount}</Text>
                </View>
              )}
            </GlassView>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrim: { position: "absolute", top: 0, left: 0, right: 0 },
  top: { position: "absolute", left: 16, right: 16, gap: 10 },
  picker: { alignSelf: "stretch" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
  },
  statusText: { fontSize: 13, fontWeight: "500", color: colors.label },
  layersButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
});
