import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";
import { SWRConfig } from "swr";
import { fetcher } from "@/lib/api";

export default function RootLayout() {
  const dark = useColorScheme() === "dark";
  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <SWRConfig value={{ fetcher, revalidateOnFocus: false, dedupingInterval: 60000, errorRetryCount: 2 }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="region"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetAllowedDetents: [0.5, 1],
              sheetInitialDetentIndex: 0,
              sheetGrabberVisible: true,
              sheetLargestUndimmedDetentIndex: 0,
            }}
          />
          <Stack.Screen
            name="layers"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetAllowedDetents: [0.6, 1],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="station"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetAllowedDetents: [0.5, 1],
              sheetInitialDetentIndex: 0,
              sheetGrabberVisible: true,
              sheetLargestUndimmedDetentIndex: 0,
            }}
          />
        </Stack>
      </SWRConfig>
    </ThemeProvider>
  );
}
