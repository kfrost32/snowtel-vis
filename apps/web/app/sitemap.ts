import type { MetadataRoute } from "next";
import { basinPath } from "@snotel/core/basins";
import { SNOTEL_STATES, stateSlug } from "@snotel/core/constants";
import { getAllStations, getStationsByState, hasLiveReadings, stationPath } from "@snotel/core/stations";
import { allBasinHucs } from "@/lib/basin-share";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const states = SNOTEL_STATES.filter((state) => getStationsByState(state).some(hasLiveReadings));
  const paths = [
    "",
    "/basins",
    "/stations",
    ...states.map((state) => `/stations/${stateSlug(state)}`),
    ...allBasinHucs().map(basinPath),
    ...getAllStations().filter(hasLiveReadings).map((s) => stationPath(s.triplet)),
  ];
  return paths.map((path) => ({ url: `${SITE_URL}${path}` }));
}
