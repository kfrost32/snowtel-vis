"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { WaterYearSummary } from "@/lib/types";
import type { StationEnvelopeFile } from "@/lib/envelope-files";
import { urlTriplet } from "@/lib/stations";
import { getCurrentWaterYear } from "@/lib/water-year";
import { useSeasonData } from "./useSeasonData";

export function useHistoricalData(triplet: string) {
  const { data: file, error, isLoading } = useSWR<StationEnvelopeFile>(
    `/envelopes/stations/${urlTriplet(triplet)}.json`
  );
  const { data: season } = useSeasonData(triplet);
  const data = useMemo((): WaterYearSummary[] => {
    if (!file) return [];
    let current: WaterYearSummary | null = null;
    for (const obs of season?.season ?? []) {
      if (obs.swe !== null && obs.swe > (current?.peakSwe ?? 0)) {
        current = { waterYear: getCurrentWaterYear(), peakSwe: obs.swe, peakSweDate: obs.date };
      }
    }
    return current ? [...file.peaks, current] : file.peaks;
  }, [file, season]);
  return {
    data,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
