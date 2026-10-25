import { getAllStations } from "@snotel/core/stations";
import { getStationHucs } from "@snotel/core/basins";
import { getWaterYearDay } from "@snotel/core/water-year";

export interface BasinSeasonPoint {
  wyDay: number;
  swe: number;
}

export function basinMembers(): Map<string, string[]> {
  const members = new Map<string, Set<string>>();
  for (const station of getAllStations()) {
    if (station.network !== "SNOTEL") continue;
    for (const huc of getStationHucs(station)) {
      for (const prefix of [huc.slice(0, 2), huc.slice(0, 4)]) {
        if (!members.has(prefix)) members.set(prefix, new Set());
        members.get(prefix)!.add(station.triplet);
      }
    }
  }
  return new Map([...members].map(([huc, triplets]) => [huc, [...triplets]]));
}

export function averageSeason(seasons: { date: string; swe: number | null }[][]): BasinSeasonPoint[] {
  const sums = new Map<number, { sum: number; n: number }>();
  for (const season of seasons) {
    for (const { date, swe } of season) {
      if (swe === null) continue;
      const wyDay = getWaterYearDay(date);
      const acc = sums.get(wyDay) ?? { sum: 0, n: 0 };
      acc.sum += swe;
      acc.n++;
      sums.set(wyDay, acc);
    }
  }
  return [...sums]
    .sort(([a], [b]) => a - b)
    .map(([wyDay, { sum, n }]) => ({ wyDay, swe: Math.round((sum / n) * 10) / 10 }));
}
