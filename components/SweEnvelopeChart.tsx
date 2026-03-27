"use client";

import { useMemo } from "react";
import EnvelopeChart from "@/components/EnvelopeChart";
import { buildSeasonMap } from "@/lib/season";
import { formatSwe } from "@/lib/formatting";
import type { DailyObservation, StationEnvelope } from "@/lib/types";

interface SweEnvelopeChartProps {
  season?: DailyObservation[];
  envelope: StationEnvelope;
  lastUpdated: string | null;
  seasonMap?: Map<number, number>;
}

export default function SweEnvelopeChart({
  season,
  envelope,
  lastUpdated,
  seasonMap: externalSeasonMap,
}: SweEnvelopeChartProps) {
  const seasonMap = useMemo(() => externalSeasonMap ?? buildSeasonMap(season ?? []), [season, externalSeasonMap]);

  return (
    <EnvelopeChart
      envelope={envelope.envelope}
      medianPeakDay={envelope.medianPeakDay}
      seasonMap={seasonMap}
      lastUpdated={lastUpdated}
      formatValue={formatSwe}
    />
  );
}
