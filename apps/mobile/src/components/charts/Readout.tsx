import { StyleSheet, Text, View, type ColorValue } from "react-native";
import { colors, numeric } from "@/theme";

export interface ReadoutItem {
  label: string;
  value: string;
  color?: ColorValue;
}

export default function Readout({ title, items }: { title: string; items: ReadoutItem[] }) {
  return (
    <View style={styles.readout}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.values}>
        {items.map((item) => (
          <View key={item.label} style={styles.item}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={[styles.value, numeric, { color: item.color ?? colors.label }]}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function Legend({ items }: { items: { label: string; color: ColorValue; dashed?: boolean; swatch?: React.ReactNode }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          {item.swatch ?? (
            <View style={[styles.lineSwatch, { borderColor: item.color, borderStyle: item.dashed ? "dashed" : "solid" }]} />
          )}
          <Text style={styles.legendLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { marginBottom: 12, gap: 4 },
  title: { fontSize: 13, fontWeight: "600", color: colors.secondaryLabel },
  values: { flexDirection: "row", gap: 20, flexWrap: "wrap" },
  item: { gap: 1 },
  label: { fontSize: 12, color: colors.secondaryLabel },
  value: { fontSize: 20, fontWeight: "600" },
  legend: { flexDirection: "row", gap: 16, marginTop: 10, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendLabel: { fontSize: 12, color: colors.secondaryLabel },
  lineSwatch: { width: 16, borderTopWidth: 2 },
});
