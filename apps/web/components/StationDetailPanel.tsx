"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Mountain, ArrowUpRight, Info } from "lucide-react";
import { theme } from "@/lib/theme";
import { getStation, stationDataNote, stationPhotoUrl, stationSource, stationPath } from "@snotel/core/stations";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth, formatChange, formatDepthChange, formatHourlyTime, formatPrecip } from "@snotel/core/formatting";
import { getConditionColor, getConditionLabel, getChangeColor, getDepthChangeColor } from "@snotel/core/colors";
import InfoTooltip from "@/components/InfoTooltip";
import { metricDescriptions } from "@snotel/core/metric-descriptions";
import { seasonDeltas } from "@snotel/core/station-stats";
import { useSeasonData } from "@/hooks/useSeasonData";
import { useHourlyData } from "@/hooks/useHourlyData";
import { useRecentConditions } from "@/hooks/useRecentConditions";
import { stationDepth } from "@snotel/core/recent";
import PanelHeaderActions from "@/components/PanelHeaderActions";
import StationCharts from "@/components/StationCharts";

interface StationDetailPanelProps {
  triplet: string;
  onClose: () => void;
  onStationClick: (triplet: string) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export default function StationDetailPanel({ triplet, onClose, isFavorite, onToggleFavorite, expanded = false, onToggleExpand }: StationDetailPanelProps) {
  const station = getStation(triplet);
  const imageUrl = station ? stationPhotoUrl(station) : null;
  const [imageErrorFor, setImageErrorFor] = useState<string | null>(null);
  const imageError = imageErrorFor === triplet || !imageUrl;
  const { data: seasonData, loading: seasonLoading } = useSeasonData(triplet);
  const { data: hourlyData } = useHourlyData(triplet);
  const recentDepth = stationDepth(useRecentConditions()?.stations[triplet], hourlyData);

  if (!station) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: theme.white }}>
        <p className="font-mono text-sm" style={{ color: theme.gray }}>Station not found</p>
      </div>
    );
  }

  const current = seasonData?.current;
  const source = stationSource(station);
  const dataNote = stationDataNote(station);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: theme.white }}>
      <div
        className={`shrink-0 relative flex flex-col justify-end border-b overflow-hidden ${imageError ? "" : "min-h-[124px] md:min-h-[160px]"}`}
        style={{
          borderColor: theme.borderGray,
          background: imageError ? theme.white : theme.black,
        }}
      >
        {!imageError && (
          <img
            src={imageUrl ?? undefined}
            alt={`${station.name} site photo`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ display: "block", opacity: 0.72 }}
            onError={() => setImageErrorFor(triplet)}
          />
        )}
        {!imageError && (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)" }}
          />
        )}
        <PanelHeaderActions
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onClose={onClose}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          plain={imageError}
        />
        <div className="relative px-4 pt-10 pb-3">
          <h2 className="text-lg font-semibold tracking-tight font-sans truncate" style={{ color: imageError ? theme.black : "#FFFFFF" }}>
            {station.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-xs mt-0.5" style={{ color: imageError ? theme.gray : "rgba(255,255,255,0.7)" }}>
            <span className="flex items-center gap-1"><MapPin size={12} /> {station.state}</span>
            <span className="flex items-center gap-1"><Mountain size={12} /> {formatElevation(station.elevation)}</span>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 underline-offset-2 hover:underline"
              title={`Official ${source.name} data`}
            >
              {source.label} <ArrowUpRight size={12} />
            </a>
            <Link href={stationPath(triplet)} className="underline underline-offset-2 hover:opacity-70 transition-opacity duration-150">
              Full details
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {dataNote && (
          <div className="flex items-start gap-2 px-3 py-2 border-b font-sans text-xs" style={{ borderColor: theme.borderGray, background: "var(--c-hairline)", color: theme.gray }}>
            <Info size={13} className="shrink-0 mt-px" />
            <span>{dataNote}</span>
          </div>
        )}
        <div className="border-b @container" style={{ borderColor: theme.borderGray }}>
          <div className="grid grid-cols-2 @lg:grid-cols-3 @3xl:grid-cols-6 gap-px" style={{ background: theme.borderGray }}>
            {seasonLoading ? (
              ["SWE", "% Median", "Depth", "YTD Precip", "Snow (1/3/7d)", "SWE (1/3/7d)"].map((label) => (
                <div key={label} className="flex flex-col gap-1 px-3 py-2.5" style={{ background: theme.white }}>
                  <span className="font-mono text-xs" style={{ color: theme.mediumGray }}>{label}</span>
                  <div className="h-4 w-10 rounded animate-pulse" style={{ background: theme.borderGray }} />
                </div>
              ))
            ) : current ? (() => {
              const { swe: sweDeltas, depth: depthDeltas } = seasonDeltas(seasonData?.season ?? []);
              const [depthChange1d, depthChange3d] = depthDeltas;
              const stats = [
                { label: "SWE", tip: metricDescriptions.swe, value: formatSwe(current.swe), sub: current.sweNormal !== null ? `nml ${formatSwe(current.sweNormal)}` : null, subColor: theme.mediumGray, custom: null },
                { label: "% Median", tip: metricDescriptions.pctOfNormal, value: formatPctOfNormal(current.pctOfNormal), sub: getConditionLabel(current.pctOfNormal), subColor: getConditionColor(current.pctOfNormal), custom: null },
                {
                  label: "Depth",
                  tip: metricDescriptions.snowDepth,
                  value: formatSnowDepth(recentDepth?.depth ?? current.snowDepth),
                  sub: recentDepth ? formatHourlyTime(recentDepth.depthAt) : (depthChange1d !== null || depthChange3d !== null) ? `${formatDepthChange(depthChange1d)} / ${formatDepthChange(depthChange3d)} (1/3d)` : null,
                  subColor: recentDepth ? theme.mediumGray : getDepthChangeColor(depthChange1d),
                  custom: null,
                },
                { label: "YTD Precip", tip: metricDescriptions.precip, value: formatPrecip(current.precipAccum), sub: null, subColor: null, custom: null },
                { label: "Snow (1/3/7d)", tip: "Snow depth change over 1, 3, and 7 days.", value: null, sub: null, subColor: null, custom: "depthDeltas" },
                { label: "SWE (1/3/7d)", tip: "SWE change over 1, 3, and 7 days.", value: null, sub: null, subColor: null, custom: "sweDeltas" },
              ];
              return (
                <>
                  {stats.map((row) => (
                    <div key={row.label} className="flex flex-col px-3 py-2.5" style={{ background: theme.white }}>
                      <span className="font-mono text-xs whitespace-nowrap flex items-center gap-0.5" style={{ color: theme.mediumGray }}>{row.label}<InfoTooltip text={row.tip} size={12} /></span>
                      {row.custom === "sweDeltas" || row.custom === "depthDeltas" ? (
                        <div className="flex flex-wrap items-baseline mt-0.5">
                          {(row.custom === "depthDeltas" ? depthDeltas : sweDeltas).map((val, j) => (
                            <span key={j} className="flex items-baseline">
                              {j > 0 && <span className="font-mono text-xs mx-1" style={{ color: theme.borderGray }}>/</span>}
                              <span className="font-mono text-sm font-semibold whitespace-nowrap" style={{ color: row.custom === "depthDeltas" ? getDepthChangeColor(val) : getChangeColor(val) }}>
                                {row.custom === "depthDeltas" ? formatDepthChange(val) : formatChange(val)}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <>
                          <span className="font-mono text-sm font-semibold mt-0.5 whitespace-nowrap" style={{ color: theme.black }}>{row.value}</span>
                          {row.sub ? (
                            <span className="font-mono text-xs mt-0.5 whitespace-nowrap" style={{ color: row.subColor ?? theme.mediumGray }}>{row.sub}</span>
                          ) : null}
                        </>
                      )}
                    </div>
                  ))}
                </>
              );
            })() : null}
          </div>
        </div>

        <StationCharts station={station} expanded={expanded} />
      </div>
    </div>
  );
}
