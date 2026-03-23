"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MapPin, TrendingUp, TrendingDown, Mountain, ArrowRight } from "lucide-react";
import { theme, snowColors } from "@/lib/theme";
import { formatSwe, formatPctOfNormal, formatChange, formatElevation } from "@/lib/formatting";
import { getConditionColor } from "@/lib/colors";
import { urlTriplet } from "@/lib/stations";
import { useStationList } from "@/hooks/useStationList";
import { computeBasinSummaries, median } from "@/lib/basins";
import StatCard from "@/components/StatCard";
import Section from "@/components/Section";
import ConditionBadge from "@/components/ConditionBadge";
import PercentOfNormalGauge from "@/components/PercentOfNormalGauge";
import SparkLine from "@/components/SparkLine";

export default function Dashboard() {
  const { stations, loading } = useStationList();

  const stats = useMemo(() => {
    if (!stations.length) return null;

    const withData = stations.filter((s) => s.pctOfNormal !== null);
    const pctValues = withData.map((s) => s.pctOfNormal!);
    const medianPct = median(pctValues);
    const above = withData.filter((s) => s.pctOfNormal! > 100).length;
    const below = withData.filter((s) => s.pctOfNormal! < 100).length;

    return { total: stations.length, reporting: withData.length, medianPct, above, below };
  }, [stations]);

  const basinStats = useMemo(() => {
    if (!stations.length) return [];
    return computeBasinSummaries(stations, 2);
  }, [stations]);

  const topGainers = useMemo(() => {
    return [...stations]
      .filter((s) => s.sweChange7d !== null && s.sweChange7d > 0)
      .sort((a, b) => (b.sweChange7d ?? 0) - (a.sweChange7d ?? 0))
      .slice(0, 8);
  }, [stations]);

  const topLosers = useMemo(() => {
    return [...stations]
      .filter((s) => s.sweChange7d !== null && s.sweChange7d < 0)
      .sort((a, b) => (a.sweChange7d ?? 0) - (b.sweChange7d ?? 0))
      .slice(0, 8);
  }, [stations]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: snowColors.swe, borderTopColor: "transparent" }} />
          <p className="font-mono text-sm" style={{ color: theme.gray }}>Loading SNOTEL data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: theme.white }}>
      <div className="px-4 sm:px-6 pt-10 pb-6">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tighter font-sans mb-2" style={{ color: theme.black }}>
          SNOTEL Explorer
        </h1>
        <p className="font-mono text-sm max-w-2xl" style={{ color: theme.gray, lineHeight: 1.7 }}>
          Real-time snowpack monitoring across {stats?.total || "800+"} SNOTEL stations in the western United States. Data from USDA NRCS.
        </p>
        <div className="flex gap-3 mt-4">
          <Link
            href="/map"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-sans text-sm font-medium transition-colors duration-150 hover:opacity-90"
            style={{ background: theme.black, color: theme.white }}
          >
            <MapPin size={14} /> Open Map
          </Link>
          <Link
            href="/rankings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-sans text-sm font-medium border transition-colors duration-150 hover:bg-black/[0.02]"
            style={{ borderColor: theme.borderGray, color: theme.darkGray }}
          >
            <Mountain size={14} /> Rankings
          </Link>
        </div>
      </div>

      {stats && (
        <Section title="National Overview" showTopBorder>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Median % of Normal"
              value={formatPctOfNormal(stats.medianPct)}
              subtitle={{ text: stats.medianPct >= 100 ? "Above average" : "Below average", color: getConditionColor(stats.medianPct) }}
            />
            <StatCard
              label="Stations Reporting"
              value={stats.reporting.toString()}
              subtitle={{ text: `of ${stats.total} total`, color: theme.gray }}
            />
            <StatCard
              label="Above Normal"
              value={stats.above.toString()}
              subtitle={{ text: `${Math.round((stats.above / stats.reporting) * 100)}% of stations`, color: snowColors.above }}
            />
            <StatCard
              label="Below Normal"
              value={stats.below.toString()}
              subtitle={{ text: `${Math.round((stats.below / stats.reporting) * 100)}% of stations`, color: snowColors.below }}
            />
          </div>
        </Section>
      )}

      <Section title="Basin Conditions" description="Median percent of 1991-2020 normal by major basin (HUC-2)">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {basinStats.map((basin) => (
            <Link
              key={basin.huc}
              href={`/basins?basin=${basin.huc}`}
              className="p-4 rounded-lg border flex flex-col items-center hover:shadow-sm transition-shadow"
              style={{ borderColor: theme.borderGray, background: theme.offWhite }}
            >
              <PercentOfNormalGauge value={basin.medianPctOfNormal} size={100} />
              <div className="mt-2 text-sm font-semibold font-sans text-center" style={{ color: theme.black }}>
                {basin.name}
              </div>
              <div className="text-[11px] font-mono" style={{ color: theme.mediumGray }}>
                {basin.stationCount} stations
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Biggest Movers" description="Stations with the largest 7-day SWE changes">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} style={{ color: snowColors.above }} />
              <span className="font-sans text-sm font-medium" style={{ color: theme.darkGray }}>Top Gains (7-day)</span>
            </div>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.borderGray }}>
              {topGainers.map((s, i) => (
                <Link
                  key={s.triplet}
                  href={`/station/${urlTriplet(s.triplet)}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-black/[0.02] transition-colors"
                  style={{ borderTop: i > 0 ? `1px solid ${theme.borderGray}` : undefined }}
                >
                  <div className="min-w-0">
                    <div className="font-sans text-sm font-medium truncate" style={{ color: theme.darkGray }}>{s.name}</div>
                    <div className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>{s.state} · {formatElevation(s.elevation)}</div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="font-mono text-sm font-medium" style={{ color: snowColors.above }}>{formatChange(s.sweChange7d)}</div>
                    <div className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>{formatSwe(s.swe)} SWE</div>
                  </div>
                </Link>
              ))}
              {topGainers.length === 0 && (
                <div className="px-4 py-6 text-center font-mono text-sm" style={{ color: theme.mediumGray }}>No data</div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={16} style={{ color: snowColors.wellBelow }} />
              <span className="font-sans text-sm font-medium" style={{ color: theme.darkGray }}>Top Losses (7-day)</span>
            </div>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.borderGray }}>
              {topLosers.map((s, i) => (
                <Link
                  key={s.triplet}
                  href={`/station/${urlTriplet(s.triplet)}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-black/[0.02] transition-colors"
                  style={{ borderTop: i > 0 ? `1px solid ${theme.borderGray}` : undefined }}
                >
                  <div className="min-w-0">
                    <div className="font-sans text-sm font-medium truncate" style={{ color: theme.darkGray }}>{s.name}</div>
                    <div className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>{s.state} · {formatElevation(s.elevation)}</div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="font-mono text-sm font-medium" style={{ color: snowColors.wellBelow }}>{formatChange(s.sweChange7d)}</div>
                    <div className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>{formatSwe(s.swe)} SWE</div>
                  </div>
                </Link>
              ))}
              {topLosers.length === 0 && (
                <div className="px-4 py-6 text-center font-mono text-sm" style={{ color: theme.mediumGray }}>No data</div>
              )}
            </div>
          </div>
        </div>
      </Section>

      <div className="px-4 sm:px-6 py-8 border-t" style={{ borderColor: theme.borderGray }}>
        <Link
          href="/rankings"
          className="inline-flex items-center gap-2 font-sans text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: theme.darkGray }}
        >
          View all stations <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
