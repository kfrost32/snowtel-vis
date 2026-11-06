import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { basinName, basinPath, computeBasinSummaries, findBasinHuc } from "@snotel/core/basins";
import { getConditionColor } from "@snotel/core/colors";
import { formatPctOfNormal, formatSwe } from "@snotel/core/formatting";
import MapPreviewLink from "@/components/MapPreviewLink";
import StationConditionsTable from "@/components/StationConditionsTable";
import { basinMetadata, basinStations, subBasinHucs } from "@/lib/basin-share";
import { stationConditions } from "@/lib/station-share";
import { theme } from "@/lib/theme";

type Params = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const huc = findBasinHuc((await params).slug);
  return huc ? basinMetadata(huc) : {};
}

export default async function BasinPage({ params }: Params) {
  const { slug } = await params;
  const huc = findBasinHuc(slug);
  const name = huc && basinName(huc);
  if (!huc || !name) notFound();
  if (`/basins/${slug}` !== basinPath(huc)) permanentRedirect(basinPath(huc));
  const stations = basinStations(huc);
  if (stations.length === 0) notFound();

  const conditions = await stationConditions();
  const summary = computeBasinSummaries([...conditions.values()], huc.length as 2 | 4).find((b) => b.huc === huc);
  const parent = huc.length === 4 ? huc.slice(0, 2) : null;
  const parentName = parent && basinName(parent);
  const subBasins = subBasinHucs(huc);
  const lngs = stations.map((s) => s.longitude);
  const lats = stations.map((s) => s.latitude);

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: theme.offWhite, color: theme.black }}>
      <div className="mx-auto max-w-3xl font-sans">
        <nav aria-label="Breadcrumb" className="text-xs" style={{ color: theme.mediumGray }}>
          <Link href="/basins" className="hover:underline underline-offset-2">Basins</Link>
          {parent && parentName && (
            <>
              <span aria-hidden> / </span>
              <Link href={basinPath(parent)} className="hover:underline underline-offset-2">{parentName}</Link>
            </>
          )}
        </nav>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{name} basin snowpack</h1>
        <p className="mt-2 text-sm" style={{ color: theme.gray }}>
          Current conditions at {stations.length} stations in the {name} basin, from NRCS data.
        </p>

        {summary && (
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-3" style={{ borderColor: theme.borderGray, background: theme.borderGray }}>
            <div className="px-3 py-2.5" style={{ background: theme.white }}>
              <dt className="text-xs" style={{ color: theme.mediumGray }}>% of median</dt>
              <dd className="text-base font-mono font-medium" style={{ color: getConditionColor(summary.medianPctOfNormal) }}>{formatPctOfNormal(summary.medianPctOfNormal)}</dd>
            </div>
            <div className="px-3 py-2.5" style={{ background: theme.white }}>
              <dt className="text-xs" style={{ color: theme.mediumGray }}>Average SWE</dt>
              <dd className="text-base font-mono font-medium">{formatSwe(summary.avgSwe)}</dd>
            </div>
            <div className="px-3 py-2.5" style={{ background: theme.white }}>
              <dt className="text-xs" style={{ color: theme.mediumGray }}>Stations in index</dt>
              <dd className="text-base font-mono font-medium">{summary.indexStationCount} of {summary.stationCount}</dd>
            </div>
          </dl>
        )}

        <div className="mt-4">
          <MapPreviewLink
            href={`/?basin=${huc}`}
            label="Open on the map"
            bounds={[[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]}
          />
        </div>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Stations</h2>
          <StationConditionsTable stations={stations} conditions={conditions} showState />
        </section>

        {subBasins.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold">Sub-basins</h2>
            <ul className="grid grid-cols-1 gap-x-4 text-sm sm:grid-cols-2">
              {subBasins.map((sub) => (
                <li key={sub} className="border-b py-2" style={{ borderColor: theme.borderGray }}>
                  <Link href={basinPath(sub)} className="underline-offset-2 hover:underline">{basinName(sub)}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
