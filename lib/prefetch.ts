import { preload } from "swr";
import { urlTriplet } from "@/lib/stations";
import { fetcher } from "@/lib/swr-config";

export function prefetchStation(triplet: string) {
  const encoded = urlTriplet(triplet);
  preload(`/api/stations/${encoded}`, fetcher);
  preload(`/api/stations/${encoded}/hourly`, fetcher);
}
