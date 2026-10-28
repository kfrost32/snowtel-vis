import type { RecentDepth } from "@snotel/core/recent";
import type { HourlyObservation, Station, StationCurrentConditions, StationSeasonData } from "@snotel/core/types";
import { bcFeed } from "./bc-snow";
import { cdecFeed } from "./cdec-snow";

export interface DataFeed {
  name: string;
  network: string;
  fetchSeasons(): Promise<Map<string, StationSeasonData>>;
  fetchSeason(triplet: string): Promise<StationSeasonData | null>;
  fetchConditions(): Promise<StationCurrentConditions[]>;
  fetchHourly(triplet: string): Promise<HourlyObservation[]>;
  fetchRecentDepth(): Promise<Record<string, RecentDepth>>;
}

export const DATA_FEEDS: DataFeed[] = [bcFeed, cdecFeed];

export function feedFor(station: Pick<Station, "network">): DataFeed | undefined {
  return DATA_FEEDS.find((feed) => feed.network === station.network);
}

export async function fromEachFeed<T>(what: string, fetch: (feed: DataFeed) => Promise<T>): Promise<T[]> {
  const results = await Promise.all(
    DATA_FEEDS.map((feed) =>
      fetch(feed).catch((e) => {
        console.error(`${feed.name} ${what} fetch failed:`, (e as Error).message);
        return null;
      })
    )
  );
  return results.filter((result): result is Awaited<T> => result !== null);
}
