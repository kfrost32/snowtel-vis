import { StyleSheet, Text, View, type ColorValue } from "react-native";
import { colors, numeric } from "@/theme";

export function Hero({
  value,
  label,
  caption,
  color = colors.label,
  captionColor = color,
}: {
  value: string;
  label: string;
  caption?: string;
  color?: ColorValue;
  captionColor?: ColorValue;
}) {
  return (
    <View style={styles.hero}>
      <Text style={[styles.heroValue, numeric, { color }]}>{value}</Text>
      <View style={styles.heroCaption}>
        <Text style={styles.heroLabel}>{label}</Text>
        {caption && <Text style={[styles.heroCondition, { color: captionColor }]}>{caption}</Text>}
      </View>
    </View>
  );
}

export function Row({
  label,
  value,
  detail,
  valueColor,
  last,
}: {
  label: string;
  value: string;
  detail?: string;
  valueColor?: ColorValue;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>
        <Text style={[styles.rowValueText, numeric, valueColor !== undefined && { color: valueColor }]}>{value}</Text>
        {detail && <Text style={styles.rowDetail}>{detail}</Text>}
      </View>
    </View>
  );
}

export const summaryStyles = StyleSheet.create({
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  rowLabel: { flex: 1, fontSize: 16, color: colors.label },
});

const styles = StyleSheet.create({
  ...summaryStyles,
  hero: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingBottom: 12 },
  heroValue: { fontSize: 52, fontWeight: "700", letterSpacing: -1, lineHeight: 56 },
  heroCaption: { paddingBottom: 8, gap: 2 },
  heroLabel: { fontSize: 15, color: colors.secondaryLabel },
  heroCondition: { fontSize: 15, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 11, gap: 12 },
  rowValue: { alignItems: "flex-end" },
  rowValueText: { fontSize: 16, fontWeight: "600", color: colors.label },
  rowDetail: { fontSize: 12, color: colors.secondaryLabel },
});
