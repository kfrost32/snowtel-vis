import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { findStation, getAllStations, hasLiveReadings, networkLabel, stationDataNote, stationPath, stationSource, urlTriplet } from "@snotel/core/stations";
import { findNearestStations } from "@snotel/core/geo";
import { STATE_NAMES, stateSlug } from "@snotel/core/constants";
import { SNOW_QUALITY } from "@snotel/core/storm";
import { formatDepthChange, formatDistance, formatElevation, formatPctOfNormal, formatSnowDepth, formatSwe } from "@snotel/core/formatting";
import { stationMetadata, stationShare, stationSummary } from "@/lib/station-share";
import { theme } from "@/lib/theme";
import MapPreviewLink from "@/components/MapPreviewLink";
import StationCharts from "@/components/StationCharts";

type Params = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const station = findStation((await params).slug);
  return station ? stationMetadata(station.triplet) : {};
}

export default async function StationPage({ params }: Params) {
  const { slug } = await params;
  const found = findStation(slug);
  if (!found) notFound();
  const { triplet } = found;
  if (`/station/${slug}` !== stationPath(triplet)) permanentRedirect(stationPath(triplet));
  const share = await stationShare(triplet);
  if (!share) notFound();
  const { station, conditions, storm } = share;
  const mapHref = `/?station=${urlTriplet(triplet)}`;
  const source = stationSource(station);
  const stateName = STATE_NAMES[station.state] ?? station.state;
  const dataNote = stationDataNote(station);
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
    <main className="min-h-screen px-4 py-8" style={{ background: theme.offWhite, color: theme.black }}>
      <article className="mx-auto max-w-3xl font-sans">
        <nav aria-label="Breadcrumb" className="text-xs" style={{ color: theme.mediumGray }}>
          <Link href="/stations" className="hover:underline underline-offset-2">Stations</Link>
          <span aria-hidden> / </span>
          <Link href={`/stations/${stateSlug(station.state)}`} className="hover:underline underline-offset-2">{stateName}</Link>
        </nav>
        <p className="mt-1 text-xs font-mono" style={{ color: theme.mediumGray }}>
          {networkLabel(station)} station · {stateName} · {formatElevation(station.elevation)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{station.name} snowpack</h1>
        <p className="mt-2 text-sm" style={{ color: theme.gray }}>
          {stationSummary(share)} Data from {source.description}.
        </p>
        {dataNote && <p className="mt-2 text-xs" style={{ color: theme.gray }}>{dataNote}</p>}

        <p className="mt-2 text-sm">
          <a href={source.url} className="underline underline-offset-2" style={{ color: theme.gray }}>{source.linkText}</a>
        </p>

        <div className="mt-4">
          <MapPreviewLink
            href={mapHref}
            label="Open on the map"
            bounds={[[station.longitude, station.latitude], [station.longitude, station.latitude]]}
            marker
          />
        </div>

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

        {hasLiveReadings(station) && (
          <div className="-mx-3 mt-3 flex flex-col">
            <StationCharts station={station} expanded />
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold">Nearby stations</h2>
          <ul className="mt-2 text-sm">
            {nearby.map((s) => (
              <li key={s.triplet} className="flex justify-between border-b py-2" style={{ borderColor: theme.borderGray }}>
                <Link href={stationPath(s.triplet)} className="hover:underline underline-offset-2">{s.name}, {s.state}</Link>
                <span className="font-mono text-xs" style={{ color: theme.mediumGray }}>{formatDistance(s.distance)} · {formatElevation(s.elevation)}</span>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
