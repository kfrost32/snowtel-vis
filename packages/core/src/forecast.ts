const HOUR_MS = 3600_000;
const MM_PER_INCH = 25.4;
const FEET_PER_METER = 3.28084;
export const FORECAST_DAYS = 7;

export interface ForecastDay {
  date: string;
  snow: number;
  precipChance: number | null;
  snowLevel: number | null;
  high: number | null;
  low: number | null;
  sky?: number | null;
}

export type ForecastSky = "clear" | "partly" | "cloudy" | "snow" | "rain";

export interface StationForecast {
  updated: string;
  gridElevation: number | null;
  days: ForecastDay[];
}

interface GridSeries {
  uom?: string;
  values: { validTime: string; value: number | null }[];
}

export interface NwsGridProperties {
  updateTime: string;
  elevation?: { value: number | null };
  snowfallAmount?: GridSeries;
  probabilityOfPrecipitation?: GridSeries;
  snowLevel?: GridSeries;
  temperature?: GridSeries;
  skyCover?: GridSeries;
}

function parseInterval(validTime: string): { start: number; hours: number } {
  const [start, duration] = validTime.split("/");
  const days = Number(duration.match(/(\d+)D/)?.[1] ?? 0);
  const hours = Number(duration.match(/T.*?(\d+)H/)?.[1] ?? 0);
  return { start: Date.parse(start), hours: Math.max(days * 24 + hours, 1) };
}

function hourly(series: GridSeries | undefined, spread: boolean): Map<number, number> {
  const result = new Map<number, number>();
  for (const { validTime, value } of series?.values ?? []) {
    if (value === null) continue;
    const { start, hours } = parseInterval(validTime);
    for (let h = 0; h < hours; h++) result.set(start + h * HOUR_MS, spread ? value / hours : value);
  }
  return result;
}

export function summarizeForecast(grid: NwsGridProperties, timeZone: string, now = new Date()): StationForecast {
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone });
  const dayOf = (time: number) => localDate.format(new Date(time));
  const today = dayOf(now.getTime());
  const days = new Map<string, { snow: number; pop: number[]; level: number[]; temp: number[]; sky: number[] }>();
  const bucket = (time: number) => {
    const day = dayOf(time);
    if (day < today) return null;
    if (!days.has(day)) {
      if (days.size >= FORECAST_DAYS) return null;
      days.set(day, { snow: 0, pop: [], level: [], temp: [], sky: [] });
    }
    return days.get(day)!;
  };

  const snow = hourly(grid.snowfallAmount, true);
  const pop = hourly(grid.probabilityOfPrecipitation, false);
  const level = hourly(grid.snowLevel, false);
  const temp = hourly(grid.temperature, false);
  const sky = hourly(grid.skyCover, false);
  const times = [...new Set([...snow.keys(), ...pop.keys(), ...level.keys(), ...temp.keys(), ...sky.keys()])].sort((a, b) => a - b);

  for (const time of times) {
    const day = bucket(time);
    if (!day) continue;
    day.snow += (snow.get(time) ?? 0) / MM_PER_INCH;
    if (pop.has(time)) day.pop.push(pop.get(time)!);
    if (level.has(time)) day.level.push(level.get(time)! * FEET_PER_METER);
    if (temp.has(time)) day.temp.push((temp.get(time)! * 9) / 5 + 32);
    if (sky.has(time)) day.sky.push(sky.get(time)!);
  }

  const elevation = grid.elevation?.value;
  return {
    updated: grid.updateTime,
    gridElevation: elevation == null ? null : Math.round(elevation * FEET_PER_METER),
    days: [...days].map(([date, d]) => ({
      date,
      snow: Math.round(d.snow * 10) / 10,
      precipChance: d.pop.length ? Math.max(...d.pop) : null,
      snowLevel: d.level.length ? Math.round(Math.min(...d.level) / 100) * 100 : null,
      high: d.temp.length ? Math.round(Math.max(...d.temp)) : null,
      low: d.temp.length ? Math.round(Math.min(...d.temp)) : null,
      sky: d.sky.length ? Math.round(d.sky.reduce((a, b) => a + b, 0) / d.sky.length) : null,
    })),
  };
}

export function forecastTotal(forecast: StationForecast): number {
  return Math.round(forecast.days.reduce((sum, d) => sum + d.snow, 0) * 10) / 10;
}

const WET_DAY_CHANCE = 40;

export function formatSnowfall(inches: number): string {
  if (inches <= 0) return "0″";
  return `${inches < 1 ? inches.toFixed(1) : Math.round(inches)}″`;
}

export function forecastDayLabel(date: string, index: number): string {
  if (index === 0) return "Today";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

export function snowLevelNote(forecast: StationForecast, stationElevation: number): { text: string; rain: boolean } | null {
  const levels = forecast.days
    .filter((d) => (d.precipChance ?? 0) >= WET_DAY_CHANCE || d.snow > 0)
    .map((d) => d.snowLevel)
    .filter((v): v is number => v !== null);
  if (!levels.length) return null;
  const highest = Math.max(...levels);
  const station = `${stationElevation.toLocaleString()}′`;
  if (highest > stationElevation) {
    return { text: `Snow level up to ${highest.toLocaleString()}′, above the station (${station}). Rain possible.`, rain: true };
  }
  return { text: `Snow level ${Math.min(...levels).toLocaleString()}–${highest.toLocaleString()}′, below the station (${station}).`, rain: false };
}

export function forecastSky(day: ForecastDay): ForecastSky {
  if (day.snow >= 0.1) return "snow";
  if ((day.precipChance ?? 0) >= 50) return (day.high ?? 0) > 33 ? "rain" : "cloudy";
  if (day.sky == null) return (day.precipChance ?? 0) >= 25 ? "cloudy" : "clear";
  if (day.sky < 30) return "clear";
  return day.sky < 70 ? "partly" : "cloudy";
}

export function formatTempRange(day: ForecastDay): { high: string; low: string } {
  return { high: day.high == null ? "–" : `${day.high}°`, low: day.low == null ? "–" : `${day.low}°` };
}

export function forecastSourceLine(forecast: StationForecast): string {
  const updated = new Date(forecast.updated).toLocaleString("en-US", { weekday: "short", hour: "numeric" });
  const terrain = forecast.gridElevation ? ` · terrain around ${forecast.gridElevation.toLocaleString()}′` : "";
  return `NWS point forecast${terrain} · Updated ${updated}`;
}

export function nwsForecastUrl(latitude: number, longitude: number): string {
  return `https://forecast.weather.gov/MapClick.php?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`;
}
