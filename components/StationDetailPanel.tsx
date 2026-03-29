"use client";

import { useState, useEffect, useMemo } from "react";
import { X, MapPin, Mountain, Star } from "lucide-react";
import { theme, glassmorphicButtonStyle } from "@/lib/theme";
import LoadingSpinner from "@/components/LoadingSpinner";
import ChartCard from "@/components/ChartCard";
import { getStation } from "@/lib/stations";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth, formatChange, formatDepthChange } from "@/lib/formatting";
import { getConditionColor, getConditionLabel, getChangeColor, getDepthChangeColor } from "@/lib/colors";
import InfoTooltip from "@/components/InfoTooltip";
import { metricDescriptions } from "@/lib/metric-descriptions";
import { getWaterYearDay } from "@/lib/water-year";
import { buildSeasonMap } from "@/lib/season";
import { useSeasonData } from "@/hooks/useSeasonData";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { useHourlyData } from "@/hooks/useHourlyData";
import { useEnvelopeData } from "@/hooks/useEnvelopeData";
import SweEnvelopeChart from "@/components/SweEnvelopeChart";
import EnvelopeChart from "@/components/EnvelopeChart";
import PeakSweChart from "@/components/PeakSweChart";
import DepthTempChart from "@/components/DepthTempChart";

interface StationDetailPanelProps {
  triplet: string;
  onClose: () => void;
  onStationClick: (triplet: string) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function DepthEnvelope({ season, envelopeData, lastUpdated }: { season: import("@/lib/types").DailyObservation[]; envelopeData: import("@/lib/types").StationEnvelope; lastUpdated: string | null }) {
  const depthSeasonMap = useMemo(() => buildSeasonMap(season, (d) => d.snowDepth), [season]);
  return (
    <EnvelopeChart
      envelope={envelopeData.depthEnvelope}
      medianPeakDay={envelopeData.medianPeakDepthDay}
      seasonMap={depthSeasonMap}
      lastUpdated={lastUpdated}
      formatValue={formatSnowDepth}
    />
  );
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

  const envelopeStats = useMemo(() => {
    const current = seasonData?.current;
    if (!envelopeData || !current?.lastUpdated) return null;
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
    const dateLabel = new Date(lastUpdated + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { currentSwe, medianAtDay, pctOfNormal: current.pctOfNormal, pctOfMedianPeak, daysUntilPeak, dateLabel };
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
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={onToggleFavorite}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-150 cursor-pointer"
            style={{
              color: isFavorite ? "#FBBF24" : imageError ? theme.darkGray : "rgba(255,255,255,0.9)",
              ...(imageError ? { background: "rgba(0,0,0,0.06)", border: `1px solid ${theme.borderGray}` } : glassmorphicButtonStyle),
            }}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star size={18} fill={isFavorite ? "#FBBF24" : "none"} />
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-150 cursor-pointer"
            style={{
              color: imageError ? theme.darkGray : "rgba(255,255,255,0.9)",
              ...(imageError ? { background: "rgba(0,0,0,0.06)", border: `1px solid ${theme.borderGray}` } : glassmorphicButtonStyle),
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
            {current?.lastUpdated && (
              <span>Updated {new Date(current.lastUpdated + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b" style={{ borderColor: theme.borderGray }}>
          <div className="grid grid-cols-2 md:flex md:items-stretch md:overflow-x-auto md:min-w-min" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            {seasonLoading ? (
              ["SWE", "% Median", "Depth", "YTD Precip", "Snow ∆", "SWE ∆"].map((label, i) => (
                <div key={label} className="flex flex-col gap-1 px-3 py-2.5 min-w-[64px] border-b md:border-b-0" style={{ borderLeft: i % 2 !== 0 ? `1px solid ${theme.borderGray}` : undefined, borderTop: i >= 2 ? `1px solid ${theme.borderGray}` : undefined, borderBottom: `1px solid ${theme.borderGray}` }}>
                  <span className="font-mono text-[10px]" style={{ color: theme.mediumGray }}>{label}</span>
                  <div className="h-4 w-10 rounded animate-pulse" style={{ background: theme.borderGray }} />
                </div>
              ))
            ) : current ? (() => {
              const season = seasonData?.season ?? [];
              const n = season.length - 1;
              const change1d = n >= 1 && season[n].swe !== null && season[n - 1].swe !== null ? season[n].swe! - season[n - 1].swe! : null;
              const deltaSwe = n >= 3 && season[n].swe !== null && season[n - 3].swe !== null ? season[n].swe! - season[n - 3].swe! : null;
              const change7d = n >= 7 && season[n].swe !== null && season[n - 7].swe !== null ? season[n].swe! - season[n - 7].swe! : null;
              const deltaDepth = n >= 3 && season[n].snowDepth !== null && season[n - 3].snowDepth !== null ? season[n].snowDepth! - season[n - 3].snowDepth! : null;
              const depthChange1d = n >= 1 && season[n].snowDepth !== null && season[n - 1].snowDepth !== null ? Math.round(season[n].snowDepth! - season[n - 1].snowDepth!) : null;
              const depthChange7d = n >= 7 && season[n].snowDepth !== null && season[n - 7].snowDepth !== null ? Math.round(season[n].snowDepth! - season[n - 7].snowDepth!) : null;
              const sweDeltas = [change1d, deltaSwe, change7d] as (number | null)[];
              const depthDeltas = [depthChange1d, deltaDepth !== null ? Math.round(deltaDepth) : null, depthChange7d] as (number | null)[];
              const stats = [
                { label: "SWE", tip: metricDescriptions.swe, value: formatSwe(current.swe), sub: current.sweNormal !== null ? `nml ${formatSwe(current.sweNormal)}` : null, subColor: theme.mediumGray, custom: null },
                { label: "% Median", tip: metricDescriptions.pctOfNormal, value: formatPctOfNormal(current.pctOfNormal), sub: getConditionLabel(current.pctOfNormal), subColor: getConditionColor(current.pctOfNormal), custom: null },
                { label: "Depth", tip: metricDescriptions.snowDepth, value: formatSnowDepth(current.snowDepth), sub: (depthChange1d !== null || deltaDepth !== null) ? `${formatDepthChange(depthChange1d)} / ${formatDepthChange(deltaDepth !== null ? Math.round(deltaDepth) : null)} (1/3d)` : null, subColor: getDepthChangeColor(depthChange1d), custom: null },
                { label: "YTD Precip", tip: metricDescriptions.precip, value: current.precipAccum !== null ? `${current.precipAccum.toFixed(1)}"` : "—", sub: null, subColor: null, custom: null },
                { label: "Snow ∆ (1/3/7d)", tip: "Snow depth change over 1, 3, and 7 days.", value: null, sub: null, subColor: null, custom: "depthDeltas" },
                { label: "SWE ∆ (1/3/7d)", tip: "SWE change over 1, 3, and 7 days.", value: null, sub: null, subColor: null, custom: "sweDeltas" },
              ];
              return (
                <>
                  {stats.map((row, i) => (
                    <div
                      key={row.label}
                      className="flex-1 min-w-[64px] flex flex-col px-3 py-2.5"
                      style={{
                        borderRight: i % 2 === 0 ? `1px solid ${theme.borderGray}` : undefined,
                        borderTop: i >= 2 ? `1px solid ${theme.borderGray}` : undefined,
                      }}
                    >
                      <span className="font-mono text-[10px] whitespace-nowrap flex items-center gap-0.5" style={{ color: theme.mediumGray }}>{row.label}<InfoTooltip text={row.tip} size={10} /></span>
                      {row.custom === "sweDeltas" || row.custom === "depthDeltas" ? (
                        <div className="flex items-baseline mt-0.5">
                          {(row.custom === "depthDeltas" ? depthDeltas : sweDeltas).map((val, j) => (
                            <span key={j} className="flex items-baseline">
                              {j > 0 && <span className="font-mono text-[11px] mx-1" style={{ color: theme.borderGray }}>/</span>}
                              <span className="font-mono text-[13px] font-semibold whitespace-nowrap" style={{ color: row.custom === "depthDeltas" ? getDepthChangeColor(val) : getChangeColor(val) }}>
                                {row.custom === "depthDeltas" ? formatDepthChange(val) : formatChange(val)}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <>
                          <span className="font-mono text-[13px] font-semibold mt-0.5 whitespace-nowrap" style={{ color: theme.black }}>{row.value}</span>
                          {row.sub ? (
                            <span className="font-mono text-[10px] mt-0.5 whitespace-nowrap" style={{ color: row.subColor ?? theme.mediumGray }}>{row.sub}</span>
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

        <div className="px-4 pt-3">
          <ChartCard
            title={<span>{station.name} <span className="font-normal text-base" style={{ color: theme.gray }}>Snow Water Equivalent</span></span>}
            height={280}
            footer={envelopeStats && (
              <div className="flex items-stretch gap-0 rounded-md border overflow-hidden" style={{ borderColor: theme.borderGray }}>
                <div className="flex-1 px-3 py-2 text-center" style={{ background: theme.offWhite }}>
                  <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.mediumGray }}>Current SWE</div>
                  <div className="font-mono text-base font-semibold mt-0.5" style={{ color: theme.black }}>{formatSwe(envelopeStats.currentSwe)}</div>
                </div>
                <div className="flex-1 px-3 py-2 text-center" style={{ borderLeft: `1px solid ${theme.borderGray}`, background: theme.offWhite }}>
                  <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.mediumGray }}>% of Median</div>
                  <div className="font-mono text-base font-semibold mt-0.5" style={{ color: getConditionColor(envelopeStats.pctOfNormal) }}>{formatPctOfNormal(envelopeStats.pctOfNormal)}</div>
                </div>
                <div className="flex-1 px-3 py-2 text-center" style={{ borderLeft: `1px solid ${theme.borderGray}`, background: theme.offWhite }}>
                  <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.mediumGray }}>Median {envelopeStats.dateLabel}</div>
                  <div className="font-mono text-base font-semibold mt-0.5" style={{ color: theme.gray }}>{formatSwe(envelopeStats.medianAtDay)}</div>
                </div>
                <div className="flex-1 px-3 py-2 text-center" style={{ borderLeft: `1px solid ${theme.borderGray}`, background: theme.offWhite }}>
                  <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: theme.mediumGray }}>{envelopeStats.daysUntilPeak > 0 ? "To Median Peak" : "Past Median Peak"}</div>
                  <div className="font-mono text-base font-semibold mt-0.5" style={{ color: theme.darkGray }}>{Math.abs(envelopeStats.daysUntilPeak)}d</div>
                </div>
              </div>
            )}
          >
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

        {envelopeData && envelopeData.depthEnvelope.length > 0 && (
          <div className="px-4 pt-3">
            <ChartCard title={<span>{station.name} <span className="font-normal text-base" style={{ color: theme.gray }}>Snow Depth</span></span>} height={280}>
              {seasonLoading || envelopeLoading ? (
                <LoadingSpinner />
              ) : seasonData ? (
                <DepthEnvelope
                  season={seasonData.season}
                  envelopeData={envelopeData}
                  lastUpdated={current?.lastUpdated ?? null}
                />
              ) : null}
            </ChartCard>
          </div>
        )}

        <div className="px-4 pt-3">
          <ChartCard title={<span>{station.name} <span className="font-normal text-base" style={{ color: theme.gray }}>Snow Depth & Temp</span></span>} description="Last 7 days" height={180}>
            {hourlyLoading ? (
              <LoadingSpinner />
            ) : hourlyData.length > 0 ? (
              <DepthTempChart data={hourlyData} />
            ) : null}
          </ChartCard>
        </div>

        <div className="px-4 pt-3 pb-4">
          <ChartCard title={<span>{station.name} <span className="font-normal text-base" style={{ color: theme.gray }}>Peak SWE</span></span>} description="By water year" height={200}>
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
