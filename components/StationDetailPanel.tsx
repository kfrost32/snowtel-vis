"use client";

import { useMemo } from "react";
import { X, MapPin, Mountain } from "lucide-react";
import { theme, snowColors } from "@/lib/theme";
import { getStation, getAllStations } from "@/lib/stations";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth, formatTemp, formatPrecip } from "@/lib/formatting";
import { getConditionColor, getConditionLabel } from "@/lib/colors";
import { findNearestStations } from "@/lib/geo";
import { useSeasonData } from "@/hooks/useSeasonData";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { useEnvelopeData } from "@/hooks/useEnvelopeData";
import StatCard from "@/components/StatCard";
import ConditionBadge from "@/components/ConditionBadge";
import ChartCard from "@/components/ChartCard";
import SeasonChart from "@/components/SeasonChart";
import PeakSweChart from "@/components/PeakSweChart";
import EnvelopeChart from "@/components/EnvelopeChart";

interface StationDetailPanelProps {
  triplet: string;
  onClose: () => void;
  onStationClick: (triplet: string) => void;
}

export default function StationDetailPanel({ triplet, onClose, onStationClick }: StationDetailPanelProps) {
  const station = getStation(triplet);
  const { data: seasonData, loading: seasonLoading } = useSeasonData(triplet);
  const { data: historicalData, loading: historicalLoading } = useHistoricalData(triplet);
  const { data: envelopeData, loading: envelopeLoading } = useEnvelopeData(triplet);

  const nearbyStations = useMemo(() => {
    if (!station) return [];
    const all = getAllStations().filter((s) => s.triplet !== triplet);
    return findNearestStations(all, station.latitude, station.longitude, 5);
  }, [station, triplet]);

  if (!station) {
    return (
      <div
        className="w-[400px] h-full flex items-center justify-center border-l"
        style={{ background: theme.white, borderColor: theme.borderGray }}
      >
        <p className="font-mono text-sm" style={{ color: theme.gray }}>
          Station not found
        </p>
      </div>
    );
  }

  if (seasonLoading) {
    return (
      <div
        className="w-[400px] h-full flex items-center justify-center border-l"
        style={{ background: theme.white, borderColor: theme.borderGray }}
      >
        <div className="text-center">
          <div
            className="inline-block w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mb-3"
            style={{ borderColor: snowColors.swe, borderTopColor: "transparent" }}
          />
          <p className="font-mono text-xs" style={{ color: theme.gray }}>
            Loading station data...
          </p>
        </div>
      </div>
    );
  }

  const current = seasonData?.current;

  return (
    <div
      className="w-[400px] h-full flex flex-col border-l"
      style={{ background: theme.white, borderColor: theme.borderGray }}
    >
      <div
        className="shrink-0 flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b"
        style={{ borderColor: theme.borderGray }}
      >
        <div className="min-w-0">
          <h2
            className="text-lg font-semibold tracking-tight font-sans truncate"
            style={{ color: theme.black }}
          >
            {station.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] mt-1" style={{ color: theme.gray }}>
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {station.state}
            </span>
            <span className="flex items-center gap-1">
              <Mountain size={11} /> {formatElevation(station.elevation)}
            </span>
            <span>
              {station.latitude.toFixed(4)}°N, {Math.abs(station.longitude).toFixed(4)}°W
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-md transition-colors duration-150 hover:bg-black/[0.05] cursor-pointer"
          style={{ color: theme.gray }}
          aria-label="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {current && (
          <div className="px-4 pt-4 pb-2">
            <h3 className="font-mono text-[11px] uppercase tracking-wide mb-2" style={{ color: theme.mediumGray }}>
              Current Conditions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="SWE"
                value={formatSwe(current.swe)}
                size="small"
                subtitle={current.sweNormal !== null ? {
                  text: `Normal: ${formatSwe(current.sweNormal)}`,
                  color: theme.gray,
                } : undefined}
              />
              <StatCard
                label="Snow Depth"
                value={formatSnowDepth(current.snowDepth)}
                size="small"
              />
              <StatCard
                label="% of Normal"
                value={formatPctOfNormal(current.pctOfNormal)}
                size="small"
                subtitle={{
                  text: getConditionLabel(current.pctOfNormal),
                  color: getConditionColor(current.pctOfNormal),
                }}
                labelAdornment={<ConditionBadge pctOfNormal={current.pctOfNormal} size="small" />}
              />
              <StatCard
                label="Temperature"
                value={formatTemp(current.temp)}
                size="small"
              />
              <StatCard
                label="Season Precip"
                value={formatPrecip(current.precipAccum)}
                size="small"
              />
            </div>
          </div>
        )}

        {seasonData && seasonData.season.length > 0 && (
          <div className="px-4 pt-4">
            <ChartCard title="Season SWE" height={220} exportable={false}>
              <SeasonChart season={seasonData.season} />
            </ChartCard>
          </div>
        )}

        <div className="px-4 pt-4">
          <ChartCard title="Historical Range" height={280} exportable={false}>
            {envelopeLoading ? (
              <div className="flex items-center justify-center h-full">
                <div
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: snowColors.swe, borderTopColor: "transparent" }}
                />
              </div>
            ) : envelopeData ? (
              <EnvelopeChart data={envelopeData} />
            ) : (
              <div className="flex items-center justify-center h-full font-mono text-xs" style={{ color: theme.mediumGray }}>
                No historical data available
              </div>
            )}
          </ChartCard>
        </div>

        <div className="px-4 pt-4">
          <ChartCard title="Peak SWE by Year" height={220} exportable={false}>
            {historicalLoading ? (
              <div className="flex items-center justify-center h-full">
                <div
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: snowColors.swe, borderTopColor: "transparent" }}
                />
              </div>
            ) : (
              <PeakSweChart data={historicalData} />
            )}
          </ChartCard>
        </div>

        <div className="px-4 pt-4 pb-4">
          <h3 className="font-mono text-[11px] uppercase tracking-wide mb-2" style={{ color: theme.mediumGray }}>
            Nearby Stations
          </h3>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.borderGray }}>
            {nearbyStations.map((s, i) => (
              <button
                key={s.triplet}
                onClick={() => onStationClick(s.triplet)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-black/[0.02] transition-colors text-left cursor-pointer"
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
              </button>
            ))}
            {nearbyStations.length === 0 && (
              <div className="px-3 py-4 text-center font-mono text-xs" style={{ color: theme.mediumGray }}>
                No nearby stations found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
