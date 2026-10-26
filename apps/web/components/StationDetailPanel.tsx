"use client";

import { useState, useMemo } from "react";
import { X, MapPin, Mountain, Star, ChevronDown, ArrowUpRight } from "lucide-react";
import { theme, glassmorphicButtonStyle } from "@snotel/core/theme";
import LoadingSpinner from "@/components/LoadingSpinner";
import ChartCard from "@/components/ChartCard";
import { getStation, nrcsSiteUrl } from "@snotel/core/stations";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth, formatChange, formatDepthChange, formatHourlyTime, formatReadingDateShort } from "@snotel/core/formatting";
import { getConditionColor, getConditionLabel, getChangeColor, getDepthChangeColor } from "@snotel/core/colors";
import InfoTooltip from "@/components/InfoTooltip";
import { metricDescriptions } from "@snotel/core/metric-descriptions";
import { envelopeStats as computeEnvelopeStats, seasonDeltas } from "@snotel/core/station-stats";
import { endpoints } from "@snotel/core/endpoints";
import EnvelopeStatGrid from "@/components/EnvelopeStatGrid";
import { buildSeasonMap } from "@snotel/core/season";
import { useSeasonData } from "@/hooks/useSeasonData";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { useHourlyData } from "@/hooks/useHourlyData";
import { useForecast } from "@/hooks/useForecast";
import ForecastBars from "@/components/ForecastBars";
import { useRecentConditions } from "@/hooks/useRecentConditions";
import { stationDepth } from "@snotel/core/recent";
import { useEnvelopeData } from "@/hooks/useEnvelopeData";
import SweEnvelopeChart from "@/components/SweEnvelopeChart";
import EnvelopeChart from "@/components/EnvelopeChart";
import PeakSweChart from "@/components/PeakSweChart";
import EnvelopeCardTitle from "@/components/EnvelopeCardTitle";
import ChartTitle from "@/components/ChartTitle";
import EnvelopeChartActions from "@/components/EnvelopeChartActions";
import { useEnvelopeOptions } from "@/hooks/useEnvelopeOptions";
import { getCurrentWaterYear } from "@snotel/core/water-year";
import DepthTempChart from "@/components/DepthTempChart";

interface StationDetailPanelProps {
  triplet: string;
  onClose: () => void;
  onStationClick: (triplet: string) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function DepthEnvelope({ season, envelopeData, lastUpdated }: { season: import("@snotel/core/types").DailyObservation[]; envelopeData: import("@snotel/core/types").StationEnvelope; lastUpdated: string | null }) {
  const depthSeasonMap = useMemo(() => buildSeasonMap(season, (d) => d.snowDepth), [season]);
  return (
    <EnvelopeChart
      envelope={envelopeData.depthEnvelope}
      medianPeakDay={envelopeData.medianPeakDepthDay}
      medianPeakValue={envelopeData.medianPeakDepth}
      seasonMap={depthSeasonMap}
      lastUpdated={lastUpdated}
      formatValue={formatSnowDepth}
    />
  );
}

function statCellBorders(index: number, count: number): string {
  const mobile = `${index % 2 === 0 ? "border-r" : ""} ${index >= 2 ? "border-t" : ""}`;
  const desktop = `md:border-t-0 ${index < count - 1 ? "md:border-r" : "md:border-r-0"}`;
  return `${mobile} ${desktop}`;
}

export default function StationDetailPanel({ triplet, onClose, isFavorite, onToggleFavorite }: StationDetailPanelProps) {
  const station = getStation(triplet);
  const stationId = triplet.split(/[:-]/)[0];
  const imageUrl = `https://www.wcc.nrcs.usda.gov/siteimages/${stationId}.jpg`;
  const [imageErrorFor, setImageErrorFor] = useState<string | null>(null);
  const imageError = imageErrorFor === triplet;
  const [showMoreCharts, setShowMoreCharts] = useState(false);
  const { data: seasonData, loading: seasonLoading } = useSeasonData(triplet);
  const { data: historicalData, loading: historicalLoading } = useHistoricalData(triplet);
  const { data: hourlyData, loading: hourlyLoading } = useHourlyData(triplet);
  const { forecast } = useForecast(triplet);
  const recentDepth = stationDepth(useRecentConditions()?.stations[triplet], hourlyData);
  const { data: envelopeData, loading: envelopeLoading } = useEnvelopeData(triplet);
  const envelopeOptions = useEnvelopeOptions(endpoints.stationYears(triplet));
  const yearOptions = useMemo(() => {
    const currentWy = getCurrentWaterYear();
    return historicalData
      .filter((p) => p.waterYear !== currentWy)
      .sort((a, b) => b.waterYear - a.waterYear)
      .map((p) => ({ year: p.waterYear, label: String(p.waterYear) }));
  }, [historicalData]);

  const envelopeStats = useMemo(
    () => computeEnvelopeStats(seasonData, envelopeData, envelopeOptions.yearsFile ?? null),
    [envelopeData, seasonData, envelopeOptions.yearsFile]
  );

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
        className={`shrink-0 relative flex flex-col justify-end border-b overflow-hidden ${imageError ? "" : "min-h-[124px] md:min-h-[160px]"}`}
        style={{
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
            onError={() => setImageErrorFor(triplet)}
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
            <a
              href={nrcsSiteUrl(station.triplet)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 underline-offset-2 hover:underline"
              title="Official NRCS site page"
            >
              NRCS <ArrowUpRight size={11} />
            </a>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="border-b" style={{ borderColor: theme.borderGray }}>
          <div className="grid grid-cols-2 md:flex md:items-stretch md:overflow-x-auto md:min-w-min" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            {seasonLoading ? (
              ["SWE", "% Median", "Depth", "YTD Precip", "Snow ∆", "SWE ∆"].map((label, i) => (
                <div key={label} className={`flex-1 flex flex-col gap-1 px-3 py-2.5 min-w-[64px] ${statCellBorders(i, 6)}`} style={{ borderColor: theme.borderGray }}>
                  <span className="font-mono text-[10px]" style={{ color: theme.mediumGray }}>{label}</span>
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
                { label: "YTD Precip", tip: metricDescriptions.precip, value: current.precipAccum !== null ? `${current.precipAccum.toFixed(1)}"` : "—", sub: null, subColor: null, custom: null },
                { label: "Snow ∆ (1/3/7d)", tip: "Snow depth change over 1, 3, and 7 days.", value: null, sub: null, subColor: null, custom: "depthDeltas" },
                { label: "SWE ∆ (1/3/7d)", tip: "SWE change over 1, 3, and 7 days.", value: null, sub: null, subColor: null, custom: "sweDeltas" },
              ];
              return (
                <>
                  {stats.map((row, i) => (
                    <div
                      key={row.label}
                      className={`flex-1 min-w-[64px] flex flex-col px-3 py-2.5 ${statCellBorders(i, stats.length)}`}
                      style={{ borderColor: theme.borderGray }}
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
            title={
              <EnvelopeCardTitle
                name={station.name}
                meta={["SNOTEL", formatElevation(station.elevation), station.state]}
                asOf={current?.lastUpdated ?? null}
              />
            }
            actions={<EnvelopeChartActions options={envelopeOptions} yearOptions={yearOptions} />}
            height={280}
            footer={envelopeStats && (
              <EnvelopeStatGrid
                stats={[
                  { label: "Current SWE", value: formatSwe(envelopeStats.currentSwe), hideOnMobile: true },
                  { label: "% of Median", value: formatPctOfNormal(envelopeStats.pctOfNormal), color: getConditionColor(envelopeStats.pctOfNormal), hideOnMobile: true },
                  { label: "Percentile", value: envelopeStats.percentile !== null ? String(envelopeStats.percentile) : "—" },
                  { label: "% Median Peak", value: formatPctOfNormal(envelopeStats.pctOfMedianPeak) },
                  { label: `Median ${formatReadingDateShort(envelopeStats.asOf)}`, value: formatSwe(envelopeStats.medianAtDay), color: theme.gray, hideOnMobile: true },
                  { label: envelopeStats.daysUntilPeak >= 0 ? "To Median Peak" : "Past Median Peak", value: `${Math.abs(envelopeStats.daysUntilPeak)}d`, color: theme.darkGray },
                ]}
              />
            )}
          >
            {seasonLoading || envelopeLoading ? (
              <LoadingSpinner />
            ) : seasonData && envelopeData ? (
              <SweEnvelopeChart
                season={seasonData.season}
                envelope={envelopeData}
                lastUpdated={current?.lastUpdated ?? null}
                options={envelopeOptions}
              />
            ) : null}
          </ChartCard>
        </div>

        <div className="md:hidden max-md:order-2 px-4 pt-3 pb-4">
          <button
            onClick={() => setShowMoreCharts((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 h-10 rounded-lg border font-sans text-[13px] font-medium cursor-pointer"
            style={{ borderColor: theme.borderGray, color: theme.darkGray }}
          >
            {showMoreCharts ? "Fewer charts" : "More charts: snow depth & temperature"}
            <ChevronDown size={14} style={{ transform: showMoreCharts ? "rotate(180deg)" : undefined, color: theme.gray }} />
          </button>
        </div>

        <div className={`max-md:order-3 max-md:pb-4 ${showMoreCharts ? "" : "max-md:hidden"}`}>
        {envelopeData && envelopeData.depthEnvelope.length > 0 && (
          <div className="px-4 pt-3">
            <ChartCard title={<ChartTitle name={station.name} label="Snow Depth" />} height={280}>
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

        {forecast && forecast.days.length > 0 && (
          <div className="px-4 pt-3">
            <ChartCard title={<ChartTitle name={station.name} label="Snow Forecast" />} exportable={false}>
              <ForecastBars forecast={forecast} station={station} />
            </ChartCard>
          </div>
        )}

        <div className="px-4 pt-3">
          <ChartCard title={<ChartTitle name={station.name} label="Snow Depth & Temp" />} description="Last 7 days" height={180}>
            {hourlyLoading ? (
              <LoadingSpinner />
            ) : hourlyData.length > 0 ? (
              <DepthTempChart data={hourlyData} />
            ) : null}
          </ChartCard>
        </div>
        </div>

        <div className="max-md:order-1 px-4 pt-3 md:pb-4">
          <ChartCard title={<ChartTitle name={station.name} label="Peak SWE" />} description="By water year" height={200}>
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
