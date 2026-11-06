import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STATE_NAMES, stateFromSlug, stateSlug } from "@snotel/core/constants";
import { formatPctOfNormal } from "@snotel/core/formatting";
import { getStationsByState, hasLiveReadings, networkLabel } from "@snotel/core/stations";
import MapPreviewLink from "@/components/MapPreviewLink";
import StationConditionsTable from "@/components/StationConditionsTable";
import { stationConditions, typicalPctOfNormal } from "@/lib/station-share";
import { theme } from "@/lib/theme";

type Params = { params: Promise<{ state: string }> };

export const revalidate = 3600;

function stateHeading(state: string, labels: string[]): string {
  return `${STATE_NAMES[state]} ${labels.includes("SNOTEL") ? "SNOTEL" : "snow"} stations`;
}

function stateStations(state: string) {
  return getStationsByState(state).filter(hasLiveReadings).sort((a, b) => a.name.localeCompare(b.name));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const state = stateFromSlug((await params).state);
  if (!state) return {};
  const stations = stateStations(state);
  if (stations.length === 0) return {};
  const heading = stateHeading(state, stations.map(networkLabel));
  const title = `${heading}: snow depth & SWE · snotel.fyi`;
  const pct = typicalPctOfNormal(stations, await stationConditions());
  const description = `${pct === null ? `${STATE_NAMES[state]} has ${stations.length} snow monitoring stations.` : `The middle snow station in ${STATE_NAMES[state]} is at ${formatPctOfNormal(pct)} of median.`} Compare snow depth, snow water equivalent and 24-hour change at all ${stations.length} stations.`;
  const url = `/stations/${stateSlug(state)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { title, description },
  };
}

export default async function StatePage({ params }: Params) {
  const state = stateFromSlug((await params).state);
  if (!state) notFound();
  const stations = stateStations(state);
  if (stations.length === 0) notFound();
  const conditions = await stationConditions();
  const pct = typicalPctOfNormal(stations, conditions);
  const labels = [...new Set(stations.map(networkLabel))];
  const lngs = stations.map((s) => s.longitude);
  const lats = stations.map((s) => s.latitude);

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: theme.offWhite, color: theme.black }}>
      <div className="mx-auto max-w-3xl font-sans">
        <nav aria-label="Breadcrumb" className="text-xs" style={{ color: theme.mediumGray }}>
          <Link href="/stations" className="hover:underline underline-offset-2">Stations</Link>
          <span aria-hidden> / </span>
          <span>{STATE_NAMES[state]}</span>
        </nav>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{stateHeading(state, labels)}</h1>
        <p className="mt-2 text-sm" style={{ color: theme.gray }}>
          Current conditions at {stations.length} {labels.join(" and ")} stations in {STATE_NAMES[state]}.
          {pct !== null && ` The middle station is at ${formatPctOfNormal(pct)} of its median snow water equivalent for the date.`}
        </p>
        <div className="mt-4">
          <MapPreviewLink
            href="/"
            label="Open the map"
            bounds={[[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]}
          />
        </div>
        <div className="mt-6">
          <StationConditionsTable stations={stations} conditions={conditions} />
        </div>
      </div>
    </main>
  );
}
