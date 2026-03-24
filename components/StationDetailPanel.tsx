"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Mountain, Star } from "lucide-react";
import { theme } from "@/lib/theme";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getStation } from "@/lib/stations";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth, formatTemp, formatPrecip } from "@/lib/formatting";
import { getConditionColor, getConditionLabel } from "@/lib/colors";
import { useSeasonData } from "@/hooks/useSeasonData";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { useHourlyData } from "@/hooks/useHourlyData";
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
        <div className="border-b" style={{ borderColor: theme.borderGray }}>
          {seasonLoading ? (
            ["SWE", "% of Normal", "Snow Depth", "Temperature", "Season Precip"].map((label, i) => (
              <div key={label} className="flex items-center justify-between px-4 py-2" style={{ borderTop: i > 0 ? `1px solid ${theme.borderGray}` : undefined }}>
                <span className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>{label}</span>
                <div className="h-4 w-16 rounded animate-pulse" style={{ background: theme.borderGray }} />
              </div>
            ))
          ) : current ? (
            <>
              {[
                { label: "SWE", value: formatSwe(current.swe), sub: current.sweNormal !== null ? `Normal ${formatSwe(current.sweNormal)}` : null, subColor: theme.mediumGray },
                { label: "% of Normal", value: formatPctOfNormal(current.pctOfNormal), sub: getConditionLabel(current.pctOfNormal), subColor: getConditionColor(current.pctOfNormal) },
                { label: "Snow Depth", value: formatSnowDepth(current.snowDepth), sub: null, subColor: null },
                { label: "Temperature", value: formatTemp(current.temp), sub: null, subColor: null },
                { label: "Season Precip", value: formatPrecip(current.precipAccum), sub: null, subColor: null },
              ].map((row, i) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-2" style={{ borderTop: i > 0 ? `1px solid ${theme.borderGray}` : undefined }}>
                  <span className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>{row.label}</span>
                  <div className="text-right">
                    <span className="font-mono text-[13px] font-semibold" style={{ color: theme.black }}>{row.value}</span>
                    {row.sub && <span className="font-mono text-[10px] ml-2" style={{ color: row.subColor ?? theme.mediumGray }}>{row.sub}</span>}
                  </div>
                </div>
              ))}
              {seasonData?.current?.lastUpdated && (
                <div className="px-4 py-1.5 border-t" style={{ borderColor: theme.borderGray }}>
                  <span className="font-mono text-[10px]" style={{ color: theme.mediumGray }}>Updated {seasonData.current.lastUpdated}</span>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="px-4 pt-4">
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.borderGray }}>
            <div className="px-4 pt-3 pb-1 border-b" style={{ borderColor: theme.borderGray }}>
              <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: theme.mediumGray }}>
                Snow Depth & Temperature — Last 7 Days
              </span>
            </div>
            {hourlyLoading ? (
              <div className="flex items-center justify-center" style={{ height: 200 }}>
                <LoadingSpinner />
              </div>
            ) : hourlyData.length > 0 ? (
              <div style={{ height: 200 }}>
                <DepthTempChart data={hourlyData} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-4 pt-4 pb-4">
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: theme.borderGray }}>
            <div className="px-4 pt-3 pb-1 border-b" style={{ borderColor: theme.borderGray }}>
              <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: theme.mediumGray }}>
                Peak SWE
              </span>
            </div>
            {historicalLoading ? (
              <div className="flex items-center justify-center" style={{ height: 220 }}>
                <LoadingSpinner />
              </div>
            ) : (
              <div style={{ height: 220 }}>
                <PeakSweChart data={historicalData} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
