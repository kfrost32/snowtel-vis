import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { ContentUnavailableView, Host } from "@expo/ui/swift-ui";
import { getAllStations } from "@snotel/core/stations";
import StationRow from "@/components/StationRow";
import { useStationList } from "@/hooks/data";
import { colors } from "@/theme";
import { useUnitsKey } from "@/lib/app-settings";

const MAX_RESULTS = 50;

export default function SearchScreen() {
  const units = useUnitsKey();
  const [query, setQuery] = useState("");
  const { stations } = useStationList();
  const byTriplet = useMemo(() => new Map(stations?.map((s) => [s.triplet, s])), [stations]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return getAllStations()
      .filter((s) => s.name.toLowerCase().includes(q) || s.state.toLowerCase() === q || s.triplet.toLowerCase().startsWith(q))
      .slice(0, MAX_RESULTS);
  }, [query]);

  return (
    <>
      <Stack.Title large>Search</Stack.Title>
      <Stack.SearchBar placement="automatic" placeholder="Stations, states" onChangeText={(e) => setQuery(e.nativeEvent.text)} />
      {query.trim() && results.length === 0 ? (
        <Host style={styles.empty}>
          <ContentUnavailableView title="No Results" systemImage="magnifyingglass" description={`No stations match “${query.trim()}”.`} />
        </Host>
      ) : (
        <ScrollView key={units} contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" style={styles.scroll}>
          {results.length > 0 && (
            <View style={styles.group}>
              {results.map((s, i) => (
                <StationRow key={s.triplet} station={s} conditions={byTriplet.get(s.triplet)} last={i === results.length - 1} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.groupedBackground },
  group: { margin: 16, borderRadius: 26, overflow: "hidden" },
  empty: { flex: 1, backgroundColor: colors.groupedBackground },
});
