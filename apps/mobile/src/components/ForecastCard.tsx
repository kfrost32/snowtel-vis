import { Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { Station } from "@snotel/core/types";
import { SymbolView, type SFSymbol } from "expo-symbols";
import {
  forecastDayLabel,
  forecastSky,
  forecastTotal,
  formatSnowfall,
  formatTempRange,
  forecastSourceLine,
  nwsForecastUrl,
  type ForecastSky,
  type StationForecast,
} from "@snotel/core/forecast";
import Section from "@/components/Section";
import { DEPTH_COLOR } from "@/components/charts/RecentChart";
import { colors, numeric } from "@/theme";

const BAR_HEIGHT = 40;
const MIN_SCALE = 1;

const SKY_SYMBOLS: Record<ForecastSky, { name: SFSymbol; color: string }> = {
  clear: { name: "sun.max.fill", color: "#F59E0B" },
  partly: { name: "cloud.sun.fill", color: "#8A9BA3" },
  cloudy: { name: "cloud.fill", color: "#8A9BA3" },
  snow: { name: "cloud.snow.fill", color: DEPTH_COLOR },
  rain: { name: "cloud.rain.fill", color: "#3B82F6" },
};

export default function ForecastCard({ forecast, station }: { forecast: StationForecast; station: Station }) {
  const total = forecastTotal(forecast);
  const scale = Math.max(MIN_SCALE, ...forecast.days.map((d) => d.snow));

  return (
    <Section title="Snow Forecast">
      <View style={styles.header}>
        <Text style={[styles.total, numeric]}>{total > 0 ? `+${formatSnowfall(total)}` : "No snow"}</Text>
        <Text style={styles.totalLabel}>next {forecast.days.length} days</Text>
      </View>

      <View style={styles.days}>
        {forecast.days.map((day, i) => {
          const sky = SKY_SYMBOLS[forecastSky(day)];
          const temps = formatTempRange(day);
          return (
            <View key={day.date} style={[styles.day, i === 0 && styles.todayTile]}>
              <Text style={[styles.dayLabel, i === 0 && styles.today]}>{forecastDayLabel(day.date, i)}</Text>
              <SymbolView name={sky.name} size={20} tintColor={sky.color} type="hierarchical" />
              <Text style={[styles.amount, numeric, day.snow === 0 && styles.muted]}>{day.snow > 0 ? formatSnowfall(day.snow) : "–"}</Text>
              <View style={styles.track}>
                <View style={[styles.bar, { height: Math.max(day.snow > 0 ? 3 : 0, (day.snow / scale) * BAR_HEIGHT) }]} />
              </View>
              <Text style={[styles.high, numeric]}>{temps.high}</Text>
              <Text style={[styles.low, numeric]}>{temps.low}</Text>
              <Text style={[styles.chance, numeric]}>{day.precipChance != null ? `${day.precipChance}%` : ""}</Text>
            </View>
          );
        })}
      </View>

      <Pressable onPress={() => WebBrowser.openBrowserAsync(nwsForecastUrl(station.latitude, station.longitude))} hitSlop={8}>
        <Text style={styles.source}>{forecastSourceLine(forecast)} <Text style={styles.sourceLink}>↗</Text></Text>
      </Pressable>
    </Section>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "baseline", gap: 8, paddingBottom: 12 },
  total: { fontSize: 34, fontWeight: "700", letterSpacing: -0.5, color: colors.label },
  totalLabel: { fontSize: 15, color: colors.secondaryLabel },
  days: { flexDirection: "row", gap: 4 },
  day: { flex: 1, alignItems: "center", gap: 5, paddingVertical: 10, borderRadius: 12, borderCurve: "continuous", backgroundColor: colors.fill },
  todayTile: { borderWidth: 1.5, borderColor: colors.separator },
  dayLabel: { fontSize: 12, color: colors.secondaryLabel },
  today: { fontWeight: "700", color: colors.label },
  amount: { fontSize: 12, fontWeight: "600", color: colors.label },
  muted: { color: colors.tertiaryLabel },
  track: { height: BAR_HEIGHT, width: "55%", justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 4, backgroundColor: DEPTH_COLOR },
  high: { fontSize: 13, fontWeight: "600", color: colors.label },
  low: { fontSize: 12, color: colors.secondaryLabel, marginTop: -3 },
  chance: { fontSize: 11, color: colors.tertiaryLabel },
  source: { fontSize: 12, color: colors.tertiaryLabel, paddingTop: 10 },
  sourceLink: { color: colors.tint },
});
