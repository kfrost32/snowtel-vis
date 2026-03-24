"use client";

import { useState, useEffect, useMemo } from "react";
import { X, MapPin, Mountain, Star } from "lucide-react";
import { theme } from "@/lib/theme";
import LoadingSpinner from "@/components/LoadingSpinner";
import ChartCard from "@/components/ChartCard";
import { getStation } from "@/lib/stations";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth, formatTemp, formatPrecip } from "@/lib/formatting";
import { getConditionColor, getConditionLabel } from "@/lib/colors";
import { getWaterYearDay } from "@/lib/water-year";
import { buildSeasonMap } from "@/lib/season";
import { useSeasonData } from "@/hooks/useSeasonData";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { useHourlyData } from "@/hooks/useHourlyData";
import { useEnvelopeData } from "@/hooks/useEnvelopeData";
import SweEnvelopeChart from "@/components/SweEnvelopeChart";
import PeakSweChart from "@/components/PeakSweChart";
import DepthTempChart from "@/components/DepthTempChart";

interface StationDetailPanelProps {
  triplet: string;
  onClose: () => void;
  onStationClick: (triplet: string) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function StationDetailPanel({ triplet, onClose, onStationClick, isFavorite, onToggleFavorite }: StationDetailPanelProps) {
  const station = getStation(triplet);
  const stationId = triplet.split(/[:-]/)[0];
  const imageUrl = `https://www.wcc.nrcs.usda.gov/siteimages/${stationId}.jpg`;
  const [imageError, setImageError] = useState(false);
  useEffect(() => { setImageError(false); }, [triplet]);
  const { data: seasonData, loading: seasonLoading } = useSeasonData(triplet);
  const { data: historicalData, loading: historicalLoading } = useHistoricalData(triplet);
  const { data: hourlyData, loading: hourlyLoading } = useHourlyData(triplet);
  const { data: envelopeData, loading: envelopeLoading } = useEnvelopeData(triplet);

  const envelopeDescription = useMemo(() => {
    const current = seasonData?.current;
    if (!envelopeData || !current?.lastUpdated) return undefined;
    const lastUpdated = current.lastUpdated;
    const currentWyDay = getWaterYearDay(lastUpdated);
    const seasonMap = buildSeasonMap(seasonData?.season ?? []);
    const currentSwe = seasonMap.get(currentWyDay) ?? null;
    const medianEntry = envelopeData.envelope.find((d) => d.wyDay === currentWyDay);
    const medianAtDay = medianEntry?.median ?? null;
    const pctOfMedianPeak = currentSwe !== null && envelopeData.medianPeakSwe
      ? Math.round((currentSwe / envelopeData.medianPeakSwe) * 100)
      : null;
    const daysUntilPeak = envelopeData.medianPeakDay - currentWyDay;
    const parts: string[] = [];
    if (current.pctOfNormal !== null) parts.push(`${formatPctOfNormal(current.pctOfNormal)} of median`);
    if (pctOfMedianPeak !== null) parts.push(`${pctOfMedianPeak}% of median peak`);
    if (medianAtDay !== null && currentSwe !== null) parts.push(`median ${formatSwe(medianAtDay)}`);
    if (daysUntilPeak > 0) parts.push(`${daysUntilPeak}d to peak`);
    else parts.push(`${Math.abs(daysUntilPeak)}d past peak`);
    return parts.join(" · ");
  }, [envelopeData, seasonData]);

  if (!station) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: theme.white }}>
        <p className="font-mono text-sm" style={{ color: theme.gray }}>Station not found</p>
      </div>
    );
  }

  const current = seasonData?.current;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: theme.white }}>
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
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={onToggleFavorite}
            className="p-2 rounded-md transition-colors duration-150 cursor-pointer"
            style={{
              color: isFavorite ? "#FBBF24" : imageError ? theme.gray : "rgba(255,255,255,0.8)",
              background: imageError ? "transparent" : "rgba(0,0,0,0.25)",
            }}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star size={18} fill={isFavorite ? "#FBBF24" : "none"} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-md transition-colors duration-150 cursor-pointer"
            style={{
              color: imageError ? theme.gray : "rgba(255,255,255,0.8)",
              background: imageError ? "transparent" : "rgba(0,0,0,0.25)",
            }}
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>
        <div className="relative px-4 pt-10 pb-3">
          <h2 className="text-lg font-semibold tracking-tight font-sans truncate" style={{ color: imageError ? theme.black : "#FFFFFF" }}>
            {station.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] mt-0.5" style={{ color: imageError ? theme.gray : "rgba(255,255,255,0.7)" }}>
            <span className="flex items-center gap-1"><MapPin size={11} /> {station.state}</span>
            <span className="flex items-center gap-1"><Mountain size={11} /> {formatElevation(station.elevation)}</span>
            <span>{station.latitude.toFixed(4)}°N, {Math.abs(station.longitude).toFixed(4)}°W</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-stretch border-b" style={{ borderColor: theme.borderGray }}>
          {seasonLoading ? (
            ["SWE", "% of Normal", "Snow Depth", "Temp", "Precip"].map((label, i) => (
              <div key={label} className="flex-1 flex flex-col gap-1 px-3 py-2.5" style={{ borderLeft: i > 0 ? `1px solid ${theme.borderGray}` : undefined }}>
                <span className="font-mono text-[10px]" style={{ color: theme.mediumGray }}>{label}</span>
                <div className="h-4 w-12 rounded animate-pulse" style={{ background: theme.borderGray }} />
              </div>
            ))
          ) : current ? (
            [
              { label: "SWE", value: formatSwe(current.swe), sub: current.sweNormal !== null ? `nml ${formatSwe(current.sweNormal)}` : null, subColor: theme.mediumGray },
              { label: "% Normal", value: formatPctOfNormal(current.pctOfNormal), sub: getConditionLabel(current.pctOfNormal), subColor: getConditionColor(current.pctOfNormal) },
              { label: "Depth", value: formatSnowDepth(current.snowDepth), sub: null, subColor: null },
              { label: "Temp", value: formatTemp(current.temp), sub: null, subColor: null },
              { label: "Precip", value: formatPrecip(current.precipAccum), sub: null, subColor: null },
            ].map((row, i) => (
              <div key={row.label} className="flex-1 flex flex-col px-3 py-2.5" style={{ borderLeft: i > 0 ? `1px solid ${theme.borderGray}` : undefined }}>
                <span className="font-mono text-[10px]" style={{ color: theme.mediumGray }}>{row.label}</span>
                <span className="font-mono text-[13px] font-semibold mt-0.5" style={{ color: theme.black }}>{row.value}</span>
                {row.sub && <span className="font-mono text-[10px] mt-0.5" style={{ color: row.subColor ?? theme.mediumGray }}>{row.sub}</span>}
              </div>
            ))
          ) : null}
        </div>

        <div className="px-4 pt-3">
          <ChartCard title={<span>{station.name} <span className="font-normal text-base" style={{ color: theme.gray }}>Snow Water Equivalent</span></span>} description={envelopeDescription} height={280} exportable={false}>
            {seasonLoading || envelopeLoading ? (
              <LoadingSpinner />
            ) : seasonData && envelopeData ? (
              <SweEnvelopeChart
                season={seasonData.season}
                envelope={envelopeData}
                lastUpdated={current?.lastUpdated ?? null}
              />
            ) : null}
          </ChartCard>
        </div>

        <div className="px-4 pt-3">
          <ChartCard title={<span>{station.name} <span className="font-normal text-base" style={{ color: theme.gray }}>Snow Depth & Temp</span></span>} description="Last 7 days" height={180} exportable={false}>
            {hourlyLoading ? (
              <LoadingSpinner />
            ) : hourlyData.length > 0 ? (
              <DepthTempChart data={hourlyData} />
            ) : null}
          </ChartCard>
        </div>

        <div className="px-4 pt-3 pb-4">
          <ChartCard title={<span>{station.name} <span className="font-normal text-base" style={{ color: theme.gray }}>Peak SWE</span></span>} description="By water year" height={200} exportable={false}>
            {historicalLoading ? (
              <LoadingSpinner />
            ) : (
              <PeakSweChart data={historicalData} />
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
