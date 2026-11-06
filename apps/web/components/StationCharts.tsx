"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { theme } from "@/lib/theme";
import LoadingSpinner from "@/components/LoadingSpinner";
import ChartCard from "@/components/ChartCard";
import { networkLabel } from "@snotel/core/stations";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth, formatReadingDateShort } from "@snotel/core/formatting";
import { getConditionColor } from "@snotel/core/colors";
import { envelopeStats as computeEnvelopeStats } from "@snotel/core/station-stats";
import { endpoints } from "@snotel/core/endpoints";
import EnvelopeStatGrid from "@/components/EnvelopeStatGrid";
import PaceSummary from "@/components/PaceSummary";
import { buildSeasonMap } from "@snotel/core/season";
import { useSeasonData } from "@/hooks/useSeasonData";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { useHourlyData } from "@/hooks/useHourlyData";
import { useForecast } from "@/hooks/useForecast";
import ForecastBars from "@/components/ForecastBars";
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
import type { DailyObservation, Station, StationEnvelope } from "@snotel/core/types";

function DepthEnvelope({ season, envelopeData, lastUpdated }: { season: DailyObservation[]; envelopeData: StationEnvelope; lastUpdated: string | null }) {
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

export default function StationCharts({ station, expanded = false }: { station: Station; expanded?: boolean }) {
  const { triplet } = station;
  const [showMoreCharts, setShowMoreCharts] = useState(false);
  const { data: seasonData, loading: seasonLoading } = useSeasonData(triplet);
  const { data: historicalData, loading: historicalLoading } = useHistoricalData(triplet);
  const { data: hourlyData, loading: hourlyLoading } = useHourlyData(triplet);
  const { forecast } = useForecast(triplet);
  const { data: envelopeData, loading: envelopeLoading } = useEnvelopeData(triplet);
  const envelopeOptions = useEnvelopeOptions(endpoints.stationYears(triplet));
  const chartOptions = expanded ? envelopeOptions : { ...envelopeOptions, compareYears: [] };
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
  const current = seasonData?.current;

  return (
    <>
    <PaceSummary name={station.name} stats={envelopeStats} />
    <div className="px-3 pt-3">
      <ChartCard
        title={
          <EnvelopeCardTitle
            name={station.name}
            meta={[networkLabel(station), formatElevation(station.elevation), station.state]}
            asOf={current?.lastUpdated ?? null}
          />
        }
        actions={expanded && <EnvelopeChartActions options={envelopeOptions} yearOptions={yearOptions} />}
        menuItems={[{ label: "Percentiles", checked: envelopeOptions.showPercentiles, onSelect: envelopeOptions.togglePercentiles }]}
        height={280}
        footer={envelopeStats && (
          <EnvelopeStatGrid
            stats={[
              { label: "Current SWE", value: formatSwe(envelopeStats.currentSwe), exportOnly: true },
              { label: "% of Median", value: formatPctOfNormal(envelopeStats.pctOfNormal), color: getConditionColor(envelopeStats.pctOfNormal), exportOnly: true },
              { label: "Percentile", value: envelopeStats.percentile !== null ? String(envelopeStats.percentile) : "—" },
              { label: "% Median Peak", value: formatPctOfNormal(envelopeStats.pctOfMedianPeak) },
              { label: `Median ${formatReadingDateShort(envelopeStats.asOf)}`, value: formatSwe(envelopeStats.medianAtDay), color: theme.gray, exportOnly: true },
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
            options={chartOptions}
          />
        ) : null}
      </ChartCard>
    </div>

    {forecast && forecast.days.length > 0 && (
      <div className="px-3 pt-3">
        <ChartCard dense title={<ChartTitle name={station.name} label="Snow Forecast" />} exportable={false}>
          <ForecastBars forecast={forecast} station={station} />
        </ChartCard>
      </div>
    )}

    <div className="md:hidden max-md:order-2 px-3 pt-3 pb-4">
      <button
        onClick={() => setShowMoreCharts((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 h-10 rounded-lg border font-sans text-sm font-medium cursor-pointer"
        style={{ borderColor: theme.borderGray, color: theme.darkGray }}
      >
        {showMoreCharts ? "Fewer charts" : "More charts: snow depth & temperature"}
        <ChevronDown size={16} style={{ transform: showMoreCharts ? "rotate(180deg)" : undefined, color: theme.gray }} />
      </button>
    </div>

    <div className={`max-md:order-3 max-md:pb-4 ${showMoreCharts ? "" : "max-md:hidden"}`}>
    {envelopeData && envelopeData.depthEnvelope.some((d) => d.max !== null) && (
      <div className="px-3 pt-3">
        <ChartCard dense title={<ChartTitle name={station.name} label="Snow Depth" />} height={280}>
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

    <div className="px-3 pt-3">
      <ChartCard dense title={<ChartTitle name={station.name} label="Snow Depth & Temp" />} description="Last 7 days" height={180}>
        {hourlyLoading ? (
          <LoadingSpinner />
        ) : hourlyData.length > 0 ? (
          <DepthTempChart data={hourlyData} />
        ) : null}
      </ChartCard>
    </div>
    </div>

    <div className="max-md:order-1 px-3 pt-3 md:pb-4">
      <ChartCard dense title={<ChartTitle name={station.name} label="Peak SWE" />} description="By water year" height={200}>
        {historicalLoading ? (
          <LoadingSpinner />
        ) : (
          <PeakSweChart data={historicalData} />
        )}
      </ChartCard>
    </div>
    </>
  );
}
