import type { Metadata } from "next";
import Link from "next/link";
import { SNOTEL_STATES, STATE_NAMES, stateSlug } from "@snotel/core/constants";
import { getConditionColor } from "@snotel/core/colors";
import { formatPctOfNormal } from "@snotel/core/formatting";
import { getStationsByState, hasLiveReadings } from "@snotel/core/stations";
import MapPreviewLink from "@/components/MapPreviewLink";
import { stationConditions, typicalPctOfNormal } from "@/lib/station-share";
import { theme } from "@/lib/theme";

export const dynamic = "force-dynamic";

const title = "SNOTEL stations by state · snotel.fyi";
const description = "Browse every SNOTEL and snow monitoring station by state, with current snow depth, snow water equivalent and percent of median.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/stations" },
  openGraph: { title, description, url: "/stations" },
  twitter: { title, description },
};

const WEST_BOUNDS: [[number, number], [number, number]] = [[-125, 31], [-103, 49]];

export default async function StationsPage() {
  const conditions = await stationConditions();
  const states = SNOTEL_STATES.map((state) => {
    const stations = getStationsByState(state).filter(hasLiveReadings);
    return { state, count: stations.length, pct: typicalPctOfNormal(stations, conditions) };
  }).filter((s) => s.count > 0).sort((a, b) => STATE_NAMES[a.state].localeCompare(STATE_NAMES[b.state]));

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: theme.offWhite, color: theme.black }}>
      <div className="mx-auto max-w-3xl font-sans">
        <h1 className="text-2xl font-semibold tracking-tight">SNOTEL stations by state</h1>
        <p className="mt-2 text-sm" style={{ color: theme.gray }}>
          Current snow depth, snow water equivalent and percent of median for {states.reduce((sum, s) => sum + s.count, 0).toLocaleString("en-US")} snow monitoring stations across western North America.
        </p>
        <div className="mt-4">
          <MapPreviewLink href="/" label="Open the map" bounds={WEST_BOUNDS} />
        </div>
        <ul className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border sm:grid-cols-2" style={{ borderColor: theme.borderGray, background: theme.borderGray }}>
          {states.map(({ state, count, pct }) => (
            <li key={state} style={{ background: theme.white }}>
              <Link href={`/stations/${stateSlug(state)}`} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[var(--c-hover)]">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{STATE_NAMES[state]}</span>
                  <span className="block text-xs font-mono" style={{ color: theme.mediumGray }}>{count} stations</span>
                </span>
                {pct !== null && (
                  <span className="text-sm font-mono font-medium" style={{ color: getConditionColor(pct) }}>{formatPctOfNormal(pct)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs" style={{ color: theme.mediumGray }}>Percentages show the middle station&apos;s snow water equivalent as a percent of its median for the date.</p>
      </div>
    </main>
  );
}
