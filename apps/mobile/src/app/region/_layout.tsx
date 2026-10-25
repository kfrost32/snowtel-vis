import { Stack } from "expo-router";
import { colors } from "@/theme";

export default function RegionLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: true,
        contentStyle: { backgroundColor: colors.groupedBackground },
      }}
    >
      <Stack.Screen name="[huc]" dangerouslySingular />
    </Stack>
  );
}
