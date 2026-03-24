"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Mountain } from "lucide-react";
import { theme, snowColors } from "@/lib/theme";
import { parseTripletFromUrl, getStation, getAllStations, urlTriplet } from "@/lib/stations";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth, formatTemp, formatPrecip } from "@/lib/formatting";
import { getConditionColor, getConditionLabel } from "@/lib/colors";
import { findNearestStations } from "@/lib/geo";
import { useSeasonData } from "@/hooks/useSeasonData";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { useEnvelopeData } from "@/hooks/useEnvelopeData";
import Section from "@/components/Section";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatCard from "@/components/StatCard";
import ConditionBadge from "@/components/ConditionBadge";
import ChartCard from "@/components/ChartCard";
import SeasonChart from "@/components/SeasonChart";
import PeakSweChart from "@/components/PeakSweChart";
import EnvelopeChart from "@/components/EnvelopeChart";

export default function StationPage({ params }: { params: Promise<{ triplet: string }> }) {
  const { triplet: urlParam } = use(params);
  const triplet = parseTripletFromUrl(urlParam);
  const station = getStation(triplet);

  const { data: seasonData, loading: seasonLoading, error: seasonError } = useSeasonData(triplet);
  const { data: historicalData, loading: historicalLoading } = useHistoricalData(triplet);
  const { data: envelopeData, loading: envelopeLoading } = useEnvelopeData(triplet);

  const nearbyStations = useMemo(() => {
    if (!station) return [];
    const all = getAllStations().filter((s) => s.triplet !== triplet);
    return findNearestStations(all, station.latitude, station.longitude, 5);
  }, [station, triplet]);

  if (!station) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-sans text-lg font-medium mb-2" style={{ color: theme.darkGray }}>
            Station not found
          </p>
          <p className="font-mono text-sm mb-4" style={{ color: theme.gray }}>
            No station matches the triplet "{triplet}"
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-sans text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: theme.darkGray }}
          >
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const current = seasonData?.current;

  return (
    <div style={{ background: theme.white }}>
      <div className="px-4 sm:px-6 pt-6 pb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs hover:opacity-70 transition-opacity"
          style={{ color: theme.gray }}
        >
          <ArrowLeft size={12} /> All Stations
        </Link>
      </div>

      <div className="px-4 sm:px-6 pt-2 pb-8">
        <h1
          className="text-3xl sm:text-4xl font-semibold tracking-tighter font-sans mb-2"
          style={{ color: theme.black }}
        >
          {station.name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm" style={{ color: theme.gray }}>
          <span className="flex items-center gap-1.5">
            <MapPin size={13} /> {station.state}
          </span>
          <span className="flex items-center gap-1.5">
            <Mountain size={13} /> {formatElevation(station.elevation)}
          </span>
          <span>
            {station.latitude.toFixed(4)}°N, {Math.abs(station.longitude).toFixed(4)}°W
          </span>
        </div>
      </div>

      <Section title="Current Conditions" showTopBorder>
        {seasonLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {["SWE", "Snow Depth", "% of Normal", "Temperature", "Season Precip"].map((label) => (
              <div key={label} className="rounded-lg border p-4" style={{ borderColor: theme.borderGray }}>
                <div className="font-mono text-[11px] mb-2" style={{ color: theme.mediumGray }}>{label}</div>
                <div className="h-7 w-20 rounded animate-pulse" style={{ background: theme.borderGray }} />
              </div>
            ))}
          </div>
        ) : seasonError ? (
          <div className="text-center py-8">
            <p className="font-mono text-sm" style={{ color: theme.gray }}>{seasonError}</p>
          </div>
        ) : current ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard
              label="SWE"
              value={formatSwe(current.swe)}
              subtitle={current.sweNormal !== null ? {
                text: `Normal: ${formatSwe(current.sweNormal)}`,
                color: theme.gray,
              } : undefined}
            />
            <StatCard
              label="Snow Depth"
              value={formatSnowDepth(current.snowDepth)}
            />
            <StatCard
              label="% of Normal"
              value={formatPctOfNormal(current.pctOfNormal)}
              subtitle={{
                text: getConditionLabel(current.pctOfNormal),
                color: getConditionColor(current.pctOfNormal),
              }}
              labelAdornment={<ConditionBadge pctOfNormal={current.pctOfNormal} size="small" />}
            />
            <StatCard
              label="Temperature"
              value={formatTemp(current.temp)}
            />
            <StatCard
              label="Season Precip"
              value={formatPrecip(current.precipAccum)}
            />
          </div>
        ) : null}
      </Section>

      <Section title="Season to Date" description="Current water year SWE compared to 1991-2020 median">
        <ChartCard title="Snow Water Equivalent" height={360}>
          {seasonLoading ? (
            <LoadingSpinner />
          ) : seasonData && seasonData.season.length > 0 ? (
            <SeasonChart season={seasonData.season} />
          ) : (
            <div className="flex items-center justify-center h-full font-mono text-sm" style={{ color: theme.mediumGray }}>
              No season data available
            </div>
          )}
        </ChartCard>
      </Section>

      <Section title="Historical SWE Envelope" description="Current water year vs period of record min/max range and recent years">
        <ChartCard title={`Snow Water Equivalent — ${station.name}`} height={420} exportable={false}>
          {envelopeLoading ? (
            <LoadingSpinner />
          ) : envelopeData ? (
            <EnvelopeChart data={envelopeData} stationName={station.name} />
          ) : (
            <div className="flex items-center justify-center h-full font-mono text-sm" style={{ color: theme.mediumGray }}>
              No historical data available
            </div>
          )}
        </ChartCard>
      </Section>

      <Section title="Historical Peak SWE" description="Maximum SWE recorded each water year">
        <ChartCard
          title="Peak SWE by Water Year"
          height={320}
        >
          {historicalLoading ? (
            <LoadingSpinner />
          ) : (
            <PeakSweChart data={historicalData} />
          )}
        </ChartCard>
      </Section>

      <Section title="Nearby Stations">
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.borderGray }}>
          {nearbyStations.map((s, i) => (
            <Link
              key={s.triplet}
              href={`/station/${urlTriplet(s.triplet)}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-black/[0.02] transition-colors"
              style={{ borderTop: i > 0 ? `1px solid ${theme.borderGray}` : undefined }}
            >
              <div className="min-w-0">
                <div className="font-sans text-sm font-medium truncate" style={{ color: theme.darkGray }}>
                  {s.name}
                </div>
                <div className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>
                  {s.state} · {formatElevation(s.elevation)}
                </div>
              </div>
              <div className="shrink-0 ml-3 font-mono text-xs" style={{ color: theme.mediumGray }}>
                {s.distance.toFixed(1)} mi
              </div>
            </Link>
          ))}
          {nearbyStations.length === 0 && (
            <div className="px-4 py-6 text-center font-mono text-sm" style={{ color: theme.mediumGray }}>
              No nearby stations found
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
