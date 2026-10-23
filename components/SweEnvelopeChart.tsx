"use client";

import { useMemo } from "react";
import EnvelopeChart from "@/components/EnvelopeChart";
import { buildSeasonMap } from "@/lib/season";
import { formatSwe } from "@/lib/formatting";
import type { useEnvelopeOptions } from "@/hooks/useEnvelopeOptions";
import type { DailyObservation, StationEnvelope } from "@/lib/types";

interface SweEnvelopeChartProps {
  season?: DailyObservation[];
  envelope: StationEnvelope;
  lastUpdated: string | null;
  seasonMap?: Map<number, number>;
  options?: ReturnType<typeof useEnvelopeOptions>;
}

export default function SweEnvelopeChart({
  season,
  envelope,
  lastUpdated,
  seasonMap: externalSeasonMap,
  options,
}: SweEnvelopeChartProps) {
  const seasonMap = useMemo(() => externalSeasonMap ?? buildSeasonMap(season ?? []), [season, externalSeasonMap]);

  return (
    <EnvelopeChart
      envelope={envelope.envelope}
      medianPeakDay={envelope.medianPeakDay}
      medianPeakValue={envelope.medianPeakSwe}
      seasonMap={seasonMap}
      lastUpdated={lastUpdated}
      formatValue={formatSwe}
      showPercentiles={options?.showPercentiles}
      compareYears={options?.compareYears}
      onRemoveYear={options?.removeYear}
    />
  );
}
