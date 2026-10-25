import { getStation } from "@snotel/core/stations";
import { getCurrentWaterYear, getWaterYearStart } from "@snotel/core/water-year";
import type { DailyObservation, Station, StationSeasonData } from "@snotel/core/types";
import { fetchDailyData, generateDates, type BulkFetchOptions, type DailySeries } from "./snotel-api";
import { todayInDataTimezone } from "./station-conditions";

const SEASON_ELEMENTS = ["WTEQ", "SNWD", "PREC", "TMAX", "TMIN", "TAVG"];

function buildSeason(station: Station, series: Record<string, DailySeries>, wyStart: string, today: string): StationSeasonData {
  const wteq = series.WTEQ;
  const dates = wteq?.dates ?? generateDates(wyStart, today);
  const season: DailyObservation[] = dates.map((date, i) => ({
    date,
    swe: wteq?.values[i] ?? null,
    sweMedian: wteq?.medians[i] ?? null,
    snowDepth: series.SNWD?.values[i] ?? null,
    precip: series.PREC?.values[i] ?? null,
    tmax: series.TMAX?.values[i] ?? null,
    tmin: series.TMIN?.values[i] ?? null,
    tavg: series.TAVG?.values[i] ?? null,
  }));

  const latest = season.at(-1);
  const swe = latest?.swe ?? null;
  const median = latest?.sweMedian ?? null;
  return {
    station,
    current: {
      swe,
      sweNormal: median,
      pctOfNormal: swe !== null && median !== null && median > 0 ? Math.round((swe / median) * 100) : null,
      snowDepth: latest?.snowDepth ?? null,
      temp: latest?.tavg ?? null,
      precipAccum: latest?.precip ?? null,
      lastUpdated: latest?.date ?? null,
    },
    season,
  };
}

export async function fetchStationSeasons(triplets: string[], options: BulkFetchOptions = {}): Promise<Map<string, StationSeasonData>> {
  const wyStart = getWaterYearStart(getCurrentWaterYear());
  const today = todayInDataTimezone();
  const data = await fetchDailyData(triplets, SEASON_ELEMENTS, wyStart, today, { ...options, median: true });
  const seasons = new Map<string, StationSeasonData>();
  for (const [triplet, series] of data) {
    const station = getStation(triplet);
    if (station) seasons.set(triplet, buildSeason(station, series, wyStart, today));
  }
  return seasons;
}
