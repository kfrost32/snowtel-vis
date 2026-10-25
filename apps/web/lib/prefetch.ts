import { preload } from "swr";
import { endpoints } from "@snotel/core/endpoints";
import { fetcher } from "@/lib/swr-config";

export function prefetchStation(triplet: string) {
  preload(endpoints.stationSeason(triplet), fetcher);
  preload(endpoints.stationHourly(triplet), fetcher);
  preload(endpoints.stationEnvelope(triplet), fetcher);
}
