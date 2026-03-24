"use client";

import { useMemo, useState, useEffect } from "react";
import { X, MapPin, Mountain } from "lucide-react";
import { theme } from "@/lib/theme";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getStation, getAllStations } from "@/lib/stations";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth, formatTemp, formatPrecip } from "@/lib/formatting";
import { getConditionColor, getConditionLabel } from "@/lib/colors";
import { findNearestStations } from "@/lib/geo";
import { useSeasonData } from "@/hooks/useSeasonData";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { useEnvelopeData } from "@/hooks/useEnvelopeData";
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
  const stationId = triplet.split(/[:-]/)[0];
  const imageUrl = `https://www.wcc.nrcs.usda.gov/siteimages/${stationId}.jpg`;
  const [imageError, setImageError] = useState(false);
  useEffect(() => { setImageError(false); }, [triplet]);
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
        className="w-full h-full flex items-center justify-center"
        style={{ background: theme.white, borderColor: theme.borderGray }}
      >
        <p className="font-mono text-sm" style={{ color: theme.gray }}>
          Station not found
        </p>
      </div>
    );
  }

  if (seasonLoading) {
    return <LoadingSpinner message="Loading station data..." />;
  }

  const current = seasonData?.current;

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: theme.white }}
    >
      <div
        className="shrink-0 relative flex flex-col justify-end border-b overflow-hidden"
        style={{
          minHeight: imageError ? undefined : 160,
          borderColor: theme.borderGray,
          background: imageError ? theme.white : theme.black,
        }}
      >
        {!imageError && (
          <img
            src={imageUrl}
            alt={`${station.name} site photo`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ display: "block", opacity: 0.72 }}
            onError={() => setImageError(true)}
          />
        )}
        {!imageError && (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)" }}
          />
        )}
        <div
          className="relative flex items-end justify-between gap-3 px-4 pt-10 pb-3"
        >
          <div className="min-w-0">
            <h2
              className="text-lg font-semibold tracking-tight font-sans truncate"
              style={{ color: imageError ? theme.black : "#FFFFFF" }}
            >
              {station.name}
            </h2>
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] mt-0.5"
              style={{ color: imageError ? theme.gray : "rgba(255,255,255,0.7)" }}
            >
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
            className="shrink-0 p-1 rounded-md transition-colors duration-150 cursor-pointer"
            style={{
              color: imageError ? theme.gray : "rgba(255,255,255,0.8)",
              background: imageError ? "transparent" : "rgba(0,0,0,0.25)",
            }}
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {current && (
          <div className="border-b" style={{ borderColor: theme.borderGray }}>
            {[
              { label: "SWE", value: formatSwe(current.swe), sub: current.sweNormal !== null ? `Normal ${formatSwe(current.sweNormal)}` : null, subColor: theme.mediumGray },
              { label: "% of Normal", value: formatPctOfNormal(current.pctOfNormal), sub: getConditionLabel(current.pctOfNormal), subColor: getConditionColor(current.pctOfNormal) },
              { label: "Snow Depth", value: formatSnowDepth(current.snowDepth), sub: null, subColor: null },
              { label: "Temperature", value: formatTemp(current.temp), sub: null, subColor: null },
              { label: "Season Precip", value: formatPrecip(current.precipAccum), sub: null, subColor: null },
            ].map((row, i) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-4 py-2"
                style={{ borderTop: i > 0 ? `1px solid ${theme.borderGray}` : undefined }}
              >
                <span className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>{row.label}</span>
                <div className="text-right">
                  <span className="font-mono text-[13px] font-semibold" style={{ color: theme.black }}>{row.value}</span>
                  {row.sub && (
                    <span className="font-mono text-[10px] ml-2" style={{ color: row.subColor ?? theme.mediumGray }}>{row.sub}</span>
                  )}
                </div>
              </div>
            ))}
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
          <ChartCard title={`Historical Range — ${station.name}`} height={300} exportable={false}>
            {envelopeLoading ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
              </div>
            ) : envelopeData ? (
              <EnvelopeChart data={envelopeData} stationName={station.name} />
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
                <LoadingSpinner />
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
