import { useMemo } from "react";
import { Linking, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { getAllStations, getStation } from "@snotel/core/stations";
import { STATE_NAMES } from "@snotel/core/constants";
import { haversineDistance } from "@snotel/core/geo";
import { formatDistance } from "@snotel/core/formatting";
import type { Station } from "@snotel/core/types";
import FavoriteCard from "@/components/FavoriteCard";
import StationRow from "@/components/StationRow";
import { useStationList } from "@/hooks/data";
import { useFavorites } from "@/lib/favorites";
import { useUserLocation, type LocationStatus } from "@/lib/location";
import { colors } from "@/theme";

const NEARBY_COUNT = 50;
const CARD_RADIUS = 26;
const SNOTEL_STATIONS = getAllStations().filter((s) => s.network === "SNOTEL");
const BY_STATE = groupByState(SNOTEL_STATIONS);

function groupByState(stations: Station[]) {
  const groups = new Map<string, Station[]>();
  for (const s of stations) groups.set(s.state, [...(groups.get(s.state) ?? []), s]);
  return [...groups]
    .map(([state, members]) => ({ title: STATE_NAMES[state] ?? state, stations: members.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

interface Row {
  station: Station;
  distance: number | null;
}

interface Section {
  title: string;
  cards?: boolean;
  data: Row[];
}

export default function StationsScreen() {
  const favorites = useFavorites();
  const { stations } = useStationList();
  const { status, coords, request } = useUserLocation();
  const byTriplet = useMemo(() => new Map(stations?.map((s) => [s.triplet, s])), [stations]);

  const sections = useMemo((): Section[] => {
    const distanceTo = (s: Station) => (coords ? haversineDistance(coords.latitude, coords.longitude, s.latitude, s.longitude) : null);
    const favoriteRows = favorites.flatMap((t) => {
      const station = getStation(t);
      return station ? [{ station, distance: distanceTo(station) }] : [];
    });
    const result: Section[] = favoriteRows.length ? [{ title: "Favorites", cards: true, data: favoriteRows }] : [];
    if (coords) {
      const excluded = new Set(favorites);
      const nearby = SNOTEL_STATIONS.filter((s) => !excluded.has(s.triplet))
        .map((station) => ({ station, distance: distanceTo(station)! }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, NEARBY_COUNT);
      return [...result, { title: "Nearby", data: nearby }];
    }
    return [...result, ...BY_STATE.map(({ title, stations }) => ({ title, data: stations.map((station) => ({ station, distance: null })) }))];
  }, [coords, favorites]);

  return (
    <>
      <Stack.Title large>Stations</Stack.Title>
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.station.triplet}
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        initialNumToRender={20}
        ListHeaderComponent={coords ? undefined : <LocationPrompt status={status} onRequest={request} />}
        renderSectionHeader={({ section }) => <Text style={styles.title}>{section.title}</Text>}
        SectionSeparatorComponent={({ leadingItem, trailingSection }) => (leadingItem && trailingSection ? <View style={styles.sectionGap} /> : null)}
        renderItem={({ item, index, section }) => {
          const detail = item.distance !== null ? formatDistance(item.distance) : undefined;
          if (section.cards) {
            return (
              <View style={index > 0 && styles.cardGap}>
                <FavoriteCard station={item.station} detail={detail} />
              </View>
            );
          }
          const first = index === 0;
          const last = index === section.data.length - 1;
          return (
            <View style={[styles.cell, first && styles.cellFirst, last && styles.cellLast]}>
              <StationRow
                station={item.station}
                conditions={byTriplet.get(item.station.triplet)}
                detail={detail}
                last={last}
              />
            </View>
          );
        }}
        ListFooterComponent={
          favorites.length === 0 ? <Text style={styles.footer}>Long-press a station or tap the star on its page to pin it to the top.</Text> : undefined
        }
      />
    </>
  );
}

function LocationPrompt({ status, onRequest }: { status: LocationStatus; onRequest: () => void }) {
  if (status === "unknown" || status === "granted") return null;
  const denied = status === "denied";
  return (
    <View style={styles.prompt}>
      <SymbolView name="location.circle" size={28} tintColor={colors.tint} />
      <View style={styles.promptText}>
        <Text style={styles.promptTitle}>Sort by distance</Text>
        <Text style={styles.promptBody}>
          {denied ? "Location is off for SNOTEL. Turn it on in Settings to list the stations closest to you." : "Use your location to list the stations closest to you."}
        </Text>
        <Pressable onPress={denied ? () => Linking.openSettings() : onRequest} hitSlop={8}>
          <Text style={styles.promptButton}>{denied ? "Open Settings" : "Use My Location"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.groupedBackground },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 20, fontWeight: "700", color: colors.label, paddingHorizontal: 4, paddingBottom: 8 },
  sectionGap: { height: 24 },
  cardGap: { marginTop: 12 },
  cell: { overflow: "hidden" },
  cellFirst: { borderTopLeftRadius: CARD_RADIUS, borderTopRightRadius: CARD_RADIUS },
  cellLast: { borderBottomLeftRadius: CARD_RADIUS, borderBottomRightRadius: CARD_RADIUS },
  prompt: { flexDirection: "row", gap: 14, backgroundColor: colors.cell, borderRadius: CARD_RADIUS, padding: 18, marginBottom: 24 },
  promptText: { flex: 1, gap: 4, alignItems: "flex-start" },
  promptTitle: { fontSize: 17, fontWeight: "600", color: colors.label },
  promptBody: { fontSize: 15, color: colors.secondaryLabel },
  promptButton: { fontSize: 17, fontWeight: "600", color: colors.tint, paddingTop: 6 },
  footer: { fontSize: 13, color: colors.secondaryLabel, textAlign: "center", paddingHorizontal: 16, paddingTop: 24 },
});
