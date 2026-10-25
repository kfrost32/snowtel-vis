import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { ContentUnavailableView, Host } from "@expo/ui/swift-ui";
import { getStation } from "@snotel/core/stations";
import StationRow from "@/components/StationRow";
import { useStationList } from "@/hooks/data";
import { useFavorites } from "@/lib/favorites";
import { colors } from "@/theme";

export default function FavoritesScreen() {
  const favorites = useFavorites();
  const { stations } = useStationList();
  const byTriplet = useMemo(() => new Map(stations?.map((s) => [s.triplet, s])), [stations]);
  const items = favorites.map((t) => getStation(t)).filter((s) => s !== undefined);

  return (
    <>
      <Stack.Title large>Favorites</Stack.Title>
      {items.length === 0 ? (
        <Host style={styles.empty}>
          <ContentUnavailableView
            title="No Favorites"
            systemImage="star"
            description="Long-press a station or tap the star on its page to keep it here."
          />
        </Host>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scroll}>
          <View style={styles.group}>
            {items.map((s, i) => (
              <StationRow key={s.triplet} station={s} conditions={byTriplet.get(s.triplet)} last={i === items.length - 1} />
            ))}
          </View>
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
