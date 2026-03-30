"use client";

import { useMemo } from "react";
import { theme, snowColors } from "@/lib/theme";
import { useStationList } from "@/hooks/useStationList";
import { useBasinEnvelopeData } from "@/hooks/useBasinEnvelopeData";
import { getConditionLevel, getConditionColor } from "@/lib/colors";
import { REGIONS, STATE_NAMES, SNOTEL_STATES } from "@/lib/constants";
import { formatSwe, formatPctOfNormal, formatDateFull } from "@/lib/formatting";
import { median } from "@/lib/basins";
import type { ConditionLevel } from "@/lib/types";

import StaleBanner from "@/components/StaleBanner";
import StatCard from "@/components/StatCard";
import ChartCard from "@/components/ChartCard";
import SweEnvelopeChart from "@/components/SweEnvelopeChart";

import ScrollReveal from "@/components/story/ScrollReveal";
import HeroCounter from "@/components/story/HeroCounter";
import ConditionBar from "@/components/story/ConditionBar";
import PctHistogram from "@/components/story/PctHistogram";
import RegionCard from "@/components/story/RegionCard";
import StateRankingChart from "@/components/story/StateRankingChart";
import TempScatter from "@/components/story/TempScatter";
import StationCaseStudy from "@/components/story/StationCaseStudy";
import Callout from "@/components/story/Callout";

export default function SnowYearStory() {
  const { stations, loading, fetchedAt: stationsFetchedAt, stale: stationsStale } = useStationList();

  const upperColorado = useBasinEnvelopeData("14");
  const pacificNW = useBasinEnvelopeData("17");
  const greatBasin = useBasinEnvelopeData("16");

  const stats = useMemo(() => {
    const reporting = stations.filter((s) => s.pctOfNormal !== null);
    if (reporting.length === 0) return null;

    const pctValues = reporting.map((s) => s.pctOfNormal!);
    const westMedianPct = median(pctValues);

    const conditionCounts: Record<ConditionLevel, number> = {
      wellBelow: 0,
      below: 0,
      nearNormal: 0,
      above: 0,
      wellAbove: 0,
    };
    for (const s of reporting) {
      conditionCounts[getConditionLevel(s.pctOfNormal)]++;
    }

    const belowNormalCount = reporting.filter((s) => s.pctOfNormal! < 90).length;
    const sorted = [...reporting].sort((a, b) => a.pctOfNormal! - b.pctOfNormal!);
    const lowestStation = sorted[0];
    const worstStations = sorted.slice(0, 5);

    const withBothSwe = reporting.filter((s) => s.swe !== null && s.sweNormal !== null);
    const avgDeficit =
      withBothSwe.length > 0
        ? withBothSwe.reduce((a, s) => a + (s.sweNormal! - s.swe!), 0) / withBothSwe.length
        : 0;

    const with7d = stations.filter((s) => s.sweChange7d !== null);
    const losing7d = with7d.filter((s) => s.sweChange7d! < 0);
    const losing7dPct = with7d.length > 0 ? (losing7d.length / with7d.length) * 100 : 0;

    const histogramBins: { bin: string; midpoint: number; count: number }[] = [];
    for (let i = 0; i <= 200; i += 10) {
      const binStations = reporting.filter((s) => {
        const v = s.pctOfNormal!;
        return i === 200 ? v >= 200 : v >= i && v < i + 10;
      });
      histogramBins.push({
        bin: `${i}`,
        midpoint: i + 5,
        count: binStations.length,
      });
    }

    const regionStats = Object.entries(REGIONS)
      .map(([key, { name, states }]) => {
        const regional = reporting.filter((s) => states.includes(s.state));
        if (regional.length === 0) return null;
        const sumSwe = regional.filter((s) => s.swe !== null && s.sweNormal !== null).reduce((a, s) => a + s.swe!, 0);
        const sumNormal = regional.filter((s) => s.swe !== null && s.sweNormal !== null).reduce((a, s) => a + s.sweNormal!, 0);
        const pct = sumNormal > 0 ? (sumSwe / sumNormal) * 100 : null;
        const belowCount = regional.filter((s) => s.pctOfNormal! < 90).length;
        return { key, name, pctOfNormal: pct, stationCount: regional.length, belowNormalCount: belowCount };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => (a.pctOfNormal ?? 999) - (b.pctOfNormal ?? 999));

    const stateStats = SNOTEL_STATES.map((st) => {
      const stStations = reporting.filter((s) => s.state === st);
      if (stStations.length === 0) return null;
      const sumSwe = stStations.filter((s) => s.swe !== null && s.sweNormal !== null).reduce((a, s) => a + s.swe!, 0);
      const sumNormal = stStations.filter((s) => s.swe !== null && s.sweNormal !== null).reduce((a, s) => a + s.sweNormal!, 0);
      const pct = sumNormal > 0 ? (sumSwe / sumNormal) * 100 : 0;
      return { state: st, stateName: STATE_NAMES[st] || st, pctOfNormal: pct, stationCount: stStations.length };
    })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.pctOfNormal - b.pctOfNormal);

    const withTemp = stations.filter((s) => s.temp !== null && s.pctOfNormal !== null);
    const scatterData = withTemp.map((s) => ({
      temp: s.temp!,
      pctOfNormal: s.pctOfNormal!,
      name: s.name,
    }));
    const avgTemp =
      withTemp.length > 0
        ? withTemp.reduce((a, s) => a + s.temp!, 0) / withTemp.length
        : null;
    const aboveFreezingPct =
      withTemp.length > 0
        ? (withTemp.filter((s) => s.temp! > 32).length / withTemp.length) * 100
        : 0;

    const totalDeficitAcreFeet = withBothSwe.reduce((a, s) => a + (s.sweNormal! - s.swe!), 0);

    return {
      westMedianPct,
      reportingCount: reporting.length,
      conditionCounts,
      belowNormalCount,
      lowestStation,
      worstStations,
      avgDeficit,
      losing7dPct,
      histogramBins,
      regionStats,
      stateStats,
      scatterData,
      avgTemp,
      aboveFreezingPct,
      totalDeficitAcreFeet,
      lastUpdated: reporting[0]?.lastUpdated,
    };
  }, [stations]);

  const basinSeasonMaps = useMemo(() => {
    const buildMap = (data: { currentSeason: { wyDay: number; swe: number }[] } | null) => {
      if (!data) return new Map<number, number>();
      const m = new Map<number, number>();
      for (const d of data.currentSeason) m.set(d.wyDay, d.swe);
      return m;
    };
    return {
      upperColorado: buildMap(upperColorado.data),
      pacificNW: buildMap(pacificNW.data),
      greatBasin: buildMap(greatBasin.data),
    };
  }, [upperColorado.data, pacificNW.data, greatBasin.data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.black }}>
        <div className="font-mono text-sm" style={{ color: theme.mediumGray }}>
          Loading data...
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen" style={{ background: theme.white }}>
      <StaleBanner fetchedAt={stationsFetchedAt} stale={stationsStale} />
      {/* Hero */}
      <section
        className="min-h-[90vh] flex flex-col items-center justify-center px-6 relative"
        style={{ background: theme.black }}
      >
        <div className="mb-6">
          <div
            className="font-mono text-xs uppercase tracking-widest text-center"
            style={{ color: theme.gray }}
          >
            Water Year 2026
          </div>
        </div>
        <HeroCounter
          value={Math.round(stats.westMedianPct)}
          label="of normal snowpack across the western United States"
        />
        <div
          className="mt-8 font-mono text-xs text-center"
          style={{ color: theme.gray }}
        >
          {stats.reportingCount} SNOTEL stations reporting
          {stats.lastUpdated ? ` · Updated ${formatDateFull(stats.lastUpdated)}` : ""}
        </div>
        <div className="absolute bottom-8 animate-bounce" style={{ color: theme.gray }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 14L4 8h12L10 14z" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* Scorecard */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" style={{ background: theme.offWhite }}>
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2
              className="font-sans font-bold text-2xl sm:text-3xl mb-3"
              style={{ color: theme.black }}
            >
              By the numbers
            </h2>
            <p className="font-sans text-base sm:text-lg mb-8 max-w-2xl" style={{ color: theme.gray }}>
              Water Year 2026 is shaping up to be one of the worst snow years on record across the West.
              Here&apos;s where things stand.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <StatCard
                label="West-wide median"
                value={formatPctOfNormal(stats.westMedianPct)}
                subtitle={{
                  text: "of normal snowpack",
                  color: getConditionColor(stats.westMedianPct),
                }}
              />
              <StatCard
                label="Well below normal"
                value={String(stats.conditionCounts.wellBelow)}
                subtitle={{
                  text: `of ${stats.reportingCount} stations`,
                  color: snowColors.wellBelow,
                }}
              />
              <StatCard
                label="Lowest station"
                value={formatPctOfNormal(stats.lowestStation.pctOfNormal)}
                subtitle={{
                  text: stats.lowestStation.name,
                  color: snowColors.wellBelow,
                }}
              />
              <StatCard
                label="Avg SWE deficit"
                value={formatSwe(stats.avgDeficit)}
                subtitle={{
                  text: "below normal per station",
                  color: snowColors.wellBelow,
                }}
              />
              <StatCard
                label="Losing snow (7d)"
                value={`${Math.round(stats.losing7dPct)}%`}
                subtitle={{
                  text: "of stations lost SWE",
                  color: snowColors.below,
                }}
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Distribution */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" style={{ borderTop: `1px solid ${theme.borderGray}` }}>
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2
              className="font-sans font-bold text-2xl sm:text-3xl mb-3"
              style={{ color: theme.black }}
            >
              A sea of red
            </h2>
            <p className="font-sans text-base sm:text-lg mb-8 max-w-2xl" style={{ color: theme.gray }}>
              This isn&apos;t a regional problem — it&apos;s everywhere. The vast majority of SNOTEL stations
              across the West are reporting below-normal snowpack.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <ChartCard
              title="Station conditions"
              description={`${stats.reportingCount} stations classified by snowpack relative to median`}
              exportable={false}
            >
              <ConditionBar counts={stats.conditionCounts} total={stats.reportingCount} />
            </ChartCard>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <div className="mt-6">
              <ChartCard
                title="Distribution"
                description="Number of stations at each percent-of-median level. The dashed line marks 100%."
                height={280}
              >
                <PctHistogram bins={stats.histogramBins} />
              </ChartCard>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Regional Breakdown */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" style={{ background: theme.offWhite }}>
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2
              className="font-sans font-bold text-2xl sm:text-3xl mb-3"
              style={{ color: theme.black }}
            >
              Region by region
            </h2>
            <p className="font-sans text-base sm:text-lg mb-8 max-w-2xl" style={{ color: theme.gray }}>
              Every region is feeling the impact, though some are hit harder than others.
              Ranked from worst to best.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {stats.regionStats.map((r) => (
                <RegionCard
                  key={r.key}
                  name={r.name}
                  pctOfNormal={r.pctOfNormal}
                  stationCount={r.stationCount}
                  belowNormalCount={r.belowNormalCount}
                />
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* State Rankings */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" style={{ borderTop: `1px solid ${theme.borderGray}` }}>
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2
              className="font-sans font-bold text-2xl sm:text-3xl mb-3"
              style={{ color: theme.black }}
            >
              State by state
            </h2>
            <p className="font-sans text-base sm:text-lg mb-8 max-w-2xl" style={{ color: theme.gray }}>
              Every SNOTEL state&apos;s snowpack ranked by percent of median.
              The dashed line marks where normal would be.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <ChartCard
              height={Math.max(stats.stateStats.length * 36, 300)}
            >
              <StateRankingChart data={stats.stateStats} />
            </ChartCard>
          </ScrollReveal>
        </div>
      </section>

      {/* Trajectory */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" style={{ background: theme.offWhite }}>
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="max-w-3xl">
              <h2
                className="font-sans font-bold text-2xl sm:text-3xl mb-3"
                style={{ color: theme.black }}
              >
                How we got here
              </h2>
              <p className="font-sans text-base sm:text-lg mb-8" style={{ color: theme.gray }}>
                The snowpack never built up. These basin-level charts show the current season&apos;s
                trajectory (blue line) against the historical envelope — the full range of what&apos;s been
                recorded. The dashed line is the 1991-2020 median.
              </p>
            </div>
          </ScrollReveal>
          <div className="space-y-6">
            {upperColorado.data && (
              <ScrollReveal delay={100}>
                <ChartCard
                  title="Upper Colorado River Basin"
                  description={`${upperColorado.data.stationCount} stations · The West's most critical water supply basin`}
                  height={300}
                >
                  <SweEnvelopeChart
                    envelope={upperColorado.data}
                    lastUpdated={stats.lastUpdated ?? null}
                    seasonMap={basinSeasonMaps.upperColorado}
                  />
                </ChartCard>
              </ScrollReveal>
            )}
            {pacificNW.data && (
              <ScrollReveal delay={200}>
                <ChartCard
                  title="Pacific Northwest"
                  description={`${pacificNW.data.stationCount} stations · Oregon & Washington's mountain snowpack`}
                  height={300}
                >
                  <SweEnvelopeChart
                    envelope={pacificNW.data}
                    lastUpdated={stats.lastUpdated ?? null}
                    seasonMap={basinSeasonMaps.pacificNW}
                  />
                </ChartCard>
              </ScrollReveal>
            )}
            {greatBasin.data && (
              <ScrollReveal delay={300}>
                <ChartCard
                  title="Great Basin"
                  description={`${greatBasin.data.stationCount} stations · Nevada & interior West`}
                  height={300}
                >
                  <SweEnvelopeChart
                    envelope={greatBasin.data}
                    lastUpdated={stats.lastUpdated ?? null}
                    seasonMap={basinSeasonMaps.greatBasin}
                  />
                </ChartCard>
              </ScrollReveal>
            )}
            {upperColorado.loading || pacificNW.loading || greatBasin.loading ? (
              <div className="flex items-center justify-center py-12 font-mono text-xs" style={{ color: theme.mediumGray }}>
                Loading basin data...
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Temperature */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" style={{ borderTop: `1px solid ${theme.borderGray}` }}>
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2
              className="font-sans font-bold text-2xl sm:text-3xl mb-3"
              style={{ color: theme.black }}
            >
              The temperature connection
            </h2>
            <p className="font-sans text-base sm:text-lg mb-8 max-w-2xl" style={{ color: theme.gray }}>
              Warmer temperatures mean rain instead of snow, and earlier melt. Each dot is a station —
              the pattern is clear.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {stats.avgTemp !== null && (
                <StatCard
                  label="Avg temperature"
                  value={`${Math.round(stats.avgTemp)}°F`}
                  size="small"
                  subtitle={{ text: "across all stations", color: theme.gray }}
                />
              )}
              <StatCard
                label="Above freezing"
                value={`${Math.round(stats.aboveFreezingPct)}%`}
                size="small"
                subtitle={{ text: "of stations > 32°F", color: snowColors.below }}
              />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <ChartCard
              title={<span>Temperature vs. snowpack {stats.lastUpdated && <span className="font-normal text-base" style={{ color: theme.gray }}>· {formatDateFull(stats.lastUpdated)}</span>}</span>}
              description="Each dot is a station's current temperature and snowpack. Stations in the bottom-right are warm with low snow — the most vulnerable to further loss."
              height={360}
            >
              <TempScatter data={stats.scatterData} />
            </ChartCard>
          </ScrollReveal>
        </div>
      </section>

      {/* Worst Stations */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" style={{ background: theme.offWhite }}>
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2
              className="font-sans font-bold text-2xl sm:text-3xl mb-3"
              style={{ color: theme.black }}
            >
              Ground level
            </h2>
            <p className="font-sans text-base sm:text-lg mb-8 max-w-2xl" style={{ color: theme.gray }}>
              The stations telling the most dramatic stories this season. These are the five lowest
              percent-of-normal readings in the network.
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.worstStations.map((s, i) => (
              <ScrollReveal key={s.triplet} delay={i * 80}>
                <StationCaseStudy station={s} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* What It Means */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" style={{ borderTop: `1px solid ${theme.borderGray}` }}>
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2
              className="font-sans font-bold text-2xl sm:text-3xl mb-3"
              style={{ color: theme.black }}
            >
              What it means
            </h2>
            <p className="font-sans text-base sm:text-lg mb-4 leading-relaxed" style={{ color: theme.gray }}>
              Snowpack is the West&apos;s largest reservoir. Mountain snow stores water through the winter
              and releases it slowly through spring and summer, feeding rivers, reservoirs, and
              groundwater that sustain cities, farms, and ecosystems.
            </p>
            <p className="font-sans text-base sm:text-lg leading-relaxed" style={{ color: theme.gray }}>
              When the snowpack is this far below normal, the consequences cascade through the rest of the year.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <Callout
              value={formatSwe(stats.avgDeficit)}
              caption="average SWE deficit per station — water that simply isn't there"
            />
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <h3
              className="font-sans font-semibold text-lg sm:text-xl mb-3 mt-8"
              style={{ color: theme.black }}
            >
              Summer water supply
            </h3>
            <p className="font-sans text-base sm:text-lg leading-relaxed" style={{ color: theme.gray }}>
              In much of the West, snowmelt provides 50-80% of annual water supply. With snowpack
              at {formatPctOfNormal(stats.westMedianPct)} of normal, reservoirs that depend on spring
              runoff face significantly reduced inflows. Irrigation districts, municipal water systems,
              and hydroelectric generation will all feel the impact.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <Callout
              value={`${Math.round(stats.belowNormalCount)}`}
              caption={`of ${stats.reportingCount} stations reading below normal — ${Math.round((stats.belowNormalCount / stats.reportingCount) * 100)}% of the network`}
              color={snowColors.below}
            />
          </ScrollReveal>

          <ScrollReveal delay={250}>
            <h3
              className="font-sans font-semibold text-lg sm:text-xl mb-3 mt-8"
              style={{ color: theme.black }}
            >
              Fire season
            </h3>
            <p className="font-sans text-base sm:text-lg leading-relaxed" style={{ color: theme.gray }}>
              Low snowpack means earlier snowmelt, which means drier fuels earlier in the year.
              The combination of reduced soil moisture and an extended dry season dramatically
              increases wildfire risk. Fire seasons that once started in July now threaten to begin
              in May or June.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <h3
              className="font-sans font-semibold text-lg sm:text-xl mb-3 mt-8"
              style={{ color: theme.black }}
            >
              Recreation and tourism
            </h3>
            <p className="font-sans text-base sm:text-lg leading-relaxed" style={{ color: theme.gray }}>
              Ski areas have faced shortened seasons and reduced terrain. Summer recreation —
              rafting, fishing, reservoir-based activities — depends on healthy snowmelt-fed rivers
              and lakes. Low-flow rivers mean warmer water temperatures, stressed fish populations,
              and reduced access.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <section className="px-4 sm:px-6 py-12 sm:py-16" style={{ background: theme.lightGray, borderTop: `1px solid ${theme.borderGray}` }}>
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <p className="font-mono text-xs mb-4" style={{ color: theme.gray }}>
              Data from the USDA Natural Resources Conservation Service (NRCS) SNOTEL network.
              Snowpack normals are based on the 1991-2020 median. All data is updated daily.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-sans font-medium text-sm transition-colors duration-150"
              style={{
                background: theme.black,
                color: theme.white,
              }}
            >
              Explore the live data
            </a>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
