import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Station, StationCurrentConditions } from "@snotel/core/types";
import { urlTriplet } from "@snotel/core/stations";
import { formatElevation, formatPctOfNormal, formatSwe } from "@snotel/core/formatting";
import { getConditionColor } from "@snotel/core/colors";
import { toggleFavorite, useIsFavorite } from "@/lib/favorites";
import { webUrl } from "@/lib/api";
import { colors, numeric } from "@/theme";

interface StationRowProps {
  station: Station;
  conditions?: StationCurrentConditions | null;
  last?: boolean;
}

export default function StationRow({ station, conditions, last }: StationRowProps) {
  const favorite = useIsFavorite(station.triplet);
  const href = `/station/${urlTriplet(station.triplet)}` as const;

  return (
    <Link href={href} asChild>
      <Link.Trigger>
        <Pressable style={styles.row}>
          <View style={styles.text}>
            <Text style={styles.name} numberOfLines={1}>{station.name}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {station.state} · {formatElevation(station.elevation)}
            </Text>
          </View>
          {conditions && (
            <View style={styles.values}>
              <Text style={[styles.pct, numeric, { color: getConditionColor(conditions.pctOfNormal) }]}>
                {formatPctOfNormal(conditions.pctOfNormal)}
              </Text>
              <Text style={[styles.meta, numeric]}>{formatSwe(conditions.swe)} SWE</Text>
            </View>
          )}
          {!last && <View style={styles.separator} />}
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        <Link.MenuAction
          icon={favorite ? "star.slash" : "star"}
          onPress={() => {
            Haptics.selectionAsync();
            toggleFavorite(station.triplet);
          }}
        >
          {favorite ? "Remove Favorite" : "Add to Favorites"}
        </Link.MenuAction>
        <Link.MenuAction
          icon="square.and.arrow.up"
          onPress={() => Share.share({ url: webUrl(`/station/${urlTriplet(station.triplet)}`) })}
        >
          Share
        </Link.MenuAction>
      </Link.Menu>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
    backgroundColor: colors.cell,
  },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 17, color: colors.label },
  meta: { fontSize: 13, color: colors.secondaryLabel },
  values: { alignItems: "flex-end", gap: 2 },
  pct: { fontSize: 17, fontWeight: "600" },
  separator: {
    position: "absolute",
    left: 16,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
});
