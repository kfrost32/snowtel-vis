import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";

export default function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  title: { fontSize: 20, fontWeight: "700", color: colors.label, paddingHorizontal: 4 },
  card: { backgroundColor: colors.cell, borderRadius: 26, borderCurve: "continuous", padding: 16 },
});
