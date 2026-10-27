import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllStations, hasLiveReadings, isBcStation, networkLabel, parseTripletFromUrl, stationSource, urlTriplet } from "@snotel/core/stations";
import { findNearestStations } from "@snotel/core/geo";
import { STATE_NAMES } from "@snotel/core/constants";
import { SNOW_QUALITY } from "@snotel/core/storm";
import { formatDepthChange, formatDistance, formatElevation, formatPctOfNormal, formatReadingEndOfDay, formatSnowDepth, formatSwe } from "@snotel/core/formatting";
import { stationMetadata, stationShare } from "@/lib/station-share";
import { theme } from "@/lib/theme";
import StationRedirect from "./StationRedirect";

type Params = { params: Promise<{ triplet: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return stationMetadata(parseTripletFromUrl((await params).triplet));
}

export default async function StationPage({ params }: Params) {
  const triplet = parseTripletFromUrl((await params).triplet);
  const share = await stationShare(triplet);
  if (!share) notFound();
  const { station, conditions, storm } = share;
  const mapHref = `/?station=${urlTriplet(triplet)}`;
  const source = stationSource(station);
  const stateName = STATE_NAMES[station.state] ?? station.state;
  const nearby = findNearestStations(
    getAllStations().filter((s) => hasLiveReadings(s) && s.triplet !== triplet),
    station.latitude,
    station.longitude
  );
  const stats = [
    ["Snow depth", conditions?.snowDepth != null && formatSnowDepth(conditions.snowDepth)],
    ["24h change", conditions?.depthChange1d != null && formatDepthChange(conditions.depthChange1d)],
    ["SWE", conditions?.swe != null && formatSwe(conditions.swe)],
    ["% of median", conditions?.pctOfNormal != null && formatPctOfNormal(conditions.pctOfNormal)],
    ["Storm total", storm && `+${formatSnowDepth(storm.newSnow)}${storm.quality ? ` · ${SNOW_QUALITY[storm.quality].label}` : ""}`],
  ].filter((stat): stat is [string, string] => Boolean(stat[1]));

  return (
    <main className="min-h-screen px-4 py-10" style={{ background: theme.offWhite, color: theme.black }}>
      <StationRedirect href={mapHref} />
      <article className="mx-auto max-w-xl font-sans">
        <p className="text-xs font-mono" style={{ color: theme.mediumGray }}>
          {networkLabel(station)} station · {stateName} · {formatElevation(station.elevation)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{station.name} snowpack</h1>
        <p className="mt-2 text-sm" style={{ color: theme.gray }}>
          {isBcStation(station)
            ? `Current snow depth, snow water equivalent and storm totals for the ${station.name} automated snow pillow in ${stateName}, from the BC River Forecast Centre.`
            : `Current snow depth, snow water equivalent and storm totals for the ${station.name} SNOTEL station in ${stateName}, from NRCS automated snow telemetry.`}
          {conditions?.lastUpdated && ` Latest reading ${formatReadingEndOfDay(conditions.lastUpdated)}.`}
        </p>

        {stats.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-3" style={{ borderColor: theme.borderGray, background: theme.borderGray }}>
            {stats.map(([label, value]) => (
              <div key={label} className="px-3 py-2.5" style={{ background: theme.white }}>
                <dt className="text-xs" style={{ color: theme.mediumGray }}>{label}</dt>
                <dd className="text-base font-mono font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href={mapHref} className="font-medium underline underline-offset-2">Open on the map</Link>
          <a href={source.url} className="underline underline-offset-2" style={{ color: theme.gray }}>{isBcStation(station) ? "BC snow survey data" : "NRCS station page"}</a>
        </div>

        <section className="mt-8">
          <h2 className="text-sm font-semibold">Nearby stations</h2>
          <ul className="mt-2 text-sm">
            {nearby.map((s) => (
              <li key={s.triplet} className="flex justify-between border-b py-2" style={{ borderColor: theme.borderGray }}>
                <Link href={`/station/${urlTriplet(s.triplet)}`} className="hover:underline underline-offset-2">{s.name}, {s.state}</Link>
                <span className="font-mono text-xs" style={{ color: theme.mediumGray }}>{formatDistance(s.distance)} · {formatElevation(s.elevation)}</span>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
