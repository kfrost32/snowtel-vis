import { StyleSheet, Text, View } from "react-native";
import { formatSnowDepth, formatSwe } from "@snotel/core/formatting";
import { SNOW_QUALITY, stormTiming, type StormSummary } from "@snotel/core/storm";
import Section from "@/components/Section";
import { summaryStyles } from "@/components/Summary";
import { colors, numeric } from "@/theme";

export default function StormCard({ storm }: { storm: StormSummary }) {
  const quality = storm.quality && SNOW_QUALITY[storm.quality];
  return (
    <Section title="Storm total">
      <View style={[styles.main, summaryStyles.divider]}>
        <View>
          <Text style={[styles.total, numeric]}>+{formatSnowDepth(storm.newSnow)}</Text>
          <Text style={styles.secondary}>{storm.swe !== null ? `new snow · ${formatSwe(storm.swe)} SWE` : "new snow"}</Text>
        </View>
        {quality && storm.ratio !== null && (
          <View style={styles.quality}>
            <Text style={[styles.qualityLabel, { color: quality.color }]}>{quality.label}</Text>
            <Text style={styles.secondary}>{Math.round(storm.ratio)}:1 snow to liquid</Text>
          </View>
        )}
      </View>
      <Text style={styles.timing}>{stormTiming(storm)}</Text>
    </Section>
  );
}

const styles = StyleSheet.create({
  main: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 12 },
  total: { fontSize: 34, fontWeight: "700", letterSpacing: -0.5, color: colors.label },
  quality: { alignItems: "flex-end", gap: 2, paddingBottom: 2 },
  qualityLabel: { fontSize: 17, fontWeight: "600" },
  secondary: { fontSize: 13, color: colors.secondaryLabel },
  timing: { fontSize: 13, color: colors.secondaryLabel, paddingTop: 10 },
});
