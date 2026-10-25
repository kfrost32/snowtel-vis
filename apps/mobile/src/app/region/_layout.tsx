import { Stack } from "expo-router";
import { colors } from "@/theme";

export default function RegionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.groupedBackground },
      }}
    >
      <Stack.Screen name="[huc]" dangerouslySingular />
    </Stack>
  );
}
