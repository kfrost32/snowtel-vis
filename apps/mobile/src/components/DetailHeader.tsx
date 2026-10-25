import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ColorValue } from "react-native";
import { GlassView } from "expo-glass-effect";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { colors } from "@/theme";

interface DetailHeaderProps {
  title: string;
  subtitle?: (string | false | null | undefined)[];
  children?: ReactNode;
}

export default function DetailHeader({ title, subtitle = [], children }: DetailHeaderProps) {
  const details = subtitle.filter(Boolean).join(" · ");
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {details ? <Text style={styles.subtitle}>{details}</Text> : null}
      </View>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

export function HeaderButton({
  icon,
  tint,
  label,
  onPress,
}: {
  icon: SFSymbol;
  tint?: ColorValue;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}>
      <GlassView style={styles.button} glassEffectStyle="regular" isInteractive>
        <SymbolView name={icon} size={18} weight="semibold" tintColor={tint ?? colors.label} />
      </GlassView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 4 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 28, fontWeight: "700", color: colors.label, letterSpacing: 0.2 },
  subtitle: { fontSize: 15, color: colors.secondaryLabel },
  actions: { flexDirection: "row", gap: 8, paddingTop: 2 },
  button: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
