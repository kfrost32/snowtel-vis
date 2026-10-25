import { Stack } from "expo-router";
import { colors } from "@/theme";

export default function StationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.groupedBackground },
      }}
    >
      <Stack.Screen name="[triplet]" dangerouslySingular />
    </Stack>
  );
}
