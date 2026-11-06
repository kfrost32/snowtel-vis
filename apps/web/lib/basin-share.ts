import type { Metadata } from "next";
import { basinName, basinPath, computeBasinSummaries, getStationHucs } from "@snotel/core/basins";
import { formatPctOfNormal } from "@snotel/core/formatting";
import { getAllStations } from "@snotel/core/stations";
import type { Station } from "@snotel/core/types";
import { stationConditions } from "./station-share";

function basinPrefixes(station: Station): string[] {
  if (!station.huc) return [];
  return [...new Set(getStationHucs(station).flatMap((h) => [h.slice(0, 2), h.slice(0, 4)]))];
}

export function basinStations(huc: string): Station[] {
  return getAllStations()
    .filter((s) => basinPrefixes(s).includes(huc))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function subBasinHucs(huc: string): string[] {
  if (huc.length !== 2) return [];
  return allBasinHucs().filter((h) => h.length === 4 && h.startsWith(huc));
}

export function allBasinHucs(): string[] {
  return [...new Set(getAllStations().flatMap(basinPrefixes))].filter((h) => basinName(h)).sort();
}

export async function basinMetadata(huc: string): Promise<Metadata> {
  const name = basinName(huc);
  if (!name) return {};
  const stations = basinStations(huc);
  if (stations.length === 0) return {};
  const title = `${name} basin: snowpack & SNOTEL stations · snotel.fyi`;
  const conditions = await stationConditions();
  const pct = computeBasinSummaries([...conditions.values()], huc.length as 2 | 4).find((b) => b.huc === huc)?.medianPctOfNormal ?? null;
  const description = `${pct === null ? `The ${name} basin has ${stations.length} snow monitoring stations.` : `Snowpack in the ${name} basin is at ${formatPctOfNormal(pct)} of median.`} Compare snow depth, snow water equivalent and 24-hour change at all ${stations.length} stations.`;
  const url = basinPath(huc);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { title, description },
  };
}
